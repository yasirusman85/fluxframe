import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_VIEWPORT,
  MAX_ZOOM,
  MIN_ZOOM,
  NODE_HEIGHT_ESTIMATE,
  NODE_LABELS,
  NODE_WIDTH,
  PORT_Y,
  STARTER_PROMPT,
  canConnect,
  clampZoom,
  contentBounds,
  defaultNodeData,
  findDownstream,
  findFreeSpot,
  findIncomingEdge,
  findUpstream,
  nodeBounds,
  starterGraph,
  topologicalOrderOf,
  useCanvasStore,
} from "../src/features/canvas/canvas-store";
import type { CanvasEdge, CanvasNode, NodeType, Rect } from "../src/features/canvas/canvas-store";
import { nodeText, resolveImagePrompt, waitForProject } from "../src/features/canvas/use-canvas-runner";
import { useProjectStore } from "../src/store/project-store";

const NODE_TYPES: NodeType[] = ["prompt", "text", "image", "motion"];

function node(id: string, type: NodeType, x = 0, y = 0): CanvasNode {
  return { id, type, x, y, title: NODE_LABELS[type], data: defaultNodeData(type) };
}

function edge(id: string, from: string, to: string): CanvasEdge {
  return { id, from, to };
}

function resetStore(nodes: CanvasNode[] = [], edges: CanvasEdge[] = []): void {
  useCanvasStore.setState({ nodes, edges, viewport: { ...DEFAULT_VIEWPORT }, selectedNodeId: undefined, selectedEdgeId: undefined });
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

beforeEach(() => {
  resetStore();
});

describe("canConnect", () => {
  it("allows prompt and text into image, and prompt and image into motion", () => {
    expect(canConnect("prompt", "image")).toBe(true);
    expect(canConnect("text", "image")).toBe(true);
    expect(canConnect("image", "motion")).toBe(true);
    expect(canConnect("prompt", "motion")).toBe(true);
  });

  it("rejects same-type chains, motion sources and text into motion", () => {
    expect(canConnect("prompt", "prompt")).toBe(false);
    expect(canConnect("image", "image")).toBe(false);
    expect(canConnect("text", "text")).toBe(false);
    expect(canConnect("text", "motion")).toBe(false);
    for (const target of NODE_TYPES) expect(canConnect("motion", target)).toBe(false);
  });

  it("never allows a node type to feed itself", () => {
    for (const type of NODE_TYPES) expect(canConnect(type, type)).toBe(false);
  });
});

describe("store connect", () => {
  it("refuses self-loops, unknown nodes and disallowed pairs", () => {
    resetStore([node("p", "prompt"), node("i", "image"), node("m", "motion")]);
    const { connect } = useCanvasStore.getState();
    expect(connect("p", "p")).toBe(false);
    expect(connect("p", "ghost")).toBe(false);
    expect(connect("m", "i")).toBe(false);
    expect(useCanvasStore.getState().edges).toHaveLength(0);
  });

  it("replaces the existing incoming edge when a second source is connected", () => {
    resetStore([node("p1", "prompt"), node("p2", "prompt", 0, 300), node("i", "image", 400)]);
    expect(useCanvasStore.getState().connect("p1", "i")).toBe(true);
    expect(useCanvasStore.getState().edges).toHaveLength(1);

    expect(useCanvasStore.getState().connect("p2", "i")).toBe(true);
    const edges = useCanvasStore.getState().edges;
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ from: "p2", to: "i" });
    expect(findIncomingEdge(edges, "i")?.from).toBe("p2");
  });

  it("ignores a duplicate of an edge that already exists", () => {
    resetStore([node("p", "prompt"), node("i", "image", 400)]);
    expect(useCanvasStore.getState().connect("p", "i")).toBe(true);
    expect(useCanvasStore.getState().connect("p", "i")).toBe(false);
    expect(useCanvasStore.getState().edges).toHaveLength(1);
  });

  it("lets one source fan out to several targets", () => {
    resetStore([node("p", "prompt"), node("i", "image", 400), node("m", "motion", 800)]);
    expect(useCanvasStore.getState().connect("p", "i")).toBe(true);
    expect(useCanvasStore.getState().connect("p", "m")).toBe(true);
    expect(useCanvasStore.getState().edges).toHaveLength(2);
    expect(findDownstream(useCanvasStore.getState().nodes, useCanvasStore.getState().edges, "p").map((n) => n.id)).toEqual(["i", "m"]);
  });
});

describe("removeNode", () => {
  it("drops every edge attached to the removed node", () => {
    resetStore(
      [node("p", "prompt"), node("i", "image", 400), node("m", "motion", 800)],
      [edge("e1", "p", "i"), edge("e2", "i", "m")],
    );
    useCanvasStore.getState().select("i");
    useCanvasStore.getState().removeNode("i");

    const state = useCanvasStore.getState();
    expect(state.nodes.map((n) => n.id)).toEqual(["p", "m"]);
    expect(state.edges).toHaveLength(0);
    expect(state.selectedNodeId).toBeUndefined();
  });

  it("keeps unrelated edges and clears a selected edge that disappeared", () => {
    resetStore(
      [node("p", "prompt"), node("i", "image", 400), node("m", "motion", 800), node("t", "text", 0, 400), node("i2", "image", 400, 400)],
      [edge("e1", "p", "i"), edge("e2", "i", "m"), edge("e3", "t", "i2")],
    );
    useCanvasStore.getState().selectEdge("e2");
    useCanvasStore.getState().removeNode("m");

    const state = useCanvasStore.getState();
    expect(state.edges.map((e) => e.id)).toEqual(["e1", "e3"]);
    expect(state.selectedEdgeId).toBeUndefined();
  });
});

describe("topologicalOrderOf", () => {
  it("puts prompt before image before motion", () => {
    const nodes = [node("m", "motion", 800), node("i", "image", 400), node("p", "prompt", 0)];
    const edges = [edge("e1", "p", "i"), edge("e2", "i", "m")];
    const order = topologicalOrderOf(nodes, edges);
    expect(order).toEqual(["p", "i", "m"]);
    expect(order.indexOf("p")).toBeLessThan(order.indexOf("i"));
    expect(order.indexOf("i")).toBeLessThan(order.indexOf("m"));
  });

  it("orders sources left-to-right and keeps disconnected nodes", () => {
    const nodes = [node("i", "image", 600), node("t", "text", 200), node("p", "prompt", 0), node("loose", "image", 900)];
    const order = topologicalOrderOf(nodes, [edge("e1", "t", "i")]);
    expect(order.indexOf("p")).toBeLessThan(order.indexOf("t"));
    expect(order.indexOf("t")).toBeLessThan(order.indexOf("i"));
    expect(order).toHaveLength(4);
    expect(order).toContain("loose");
  });

  it("ignores edges pointing at missing nodes", () => {
    const nodes = [node("p", "prompt"), node("i", "image", 400)];
    expect(topologicalOrderOf(nodes, [edge("e1", "p", "ghost"), edge("e2", "p", "i")])).toEqual(["p", "i"]);
  });
});

describe("findUpstream / findDownstream", () => {
  it("resolves the single incoming node and every outgoing node", () => {
    const nodes = [node("p", "prompt"), node("i", "image", 400), node("m", "motion", 800)];
    const edges = [edge("e1", "p", "i"), edge("e2", "i", "m")];
    expect(findUpstream(nodes, edges, "i")?.id).toBe("p");
    expect(findUpstream(nodes, edges, "p")).toBeUndefined();
    expect(findDownstream(nodes, edges, "i").map((n) => n.id)).toEqual(["m"]);
  });
});

describe("clampZoom", () => {
  it("clamps to 0.25..2 and survives non-finite input", () => {
    expect(MIN_ZOOM).toBe(0.25);
    expect(MAX_ZOOM).toBe(2);
    expect(clampZoom(0.1)).toBe(MIN_ZOOM);
    expect(clampZoom(0)).toBe(MIN_ZOOM);
    expect(clampZoom(-4)).toBe(MIN_ZOOM);
    expect(clampZoom(5)).toBe(MAX_ZOOM);
    expect(clampZoom(1)).toBe(1);
    expect(clampZoom(0.75)).toBe(0.75);
    expect(clampZoom(Number.NaN)).toBe(1);
    expect(clampZoom(Number.POSITIVE_INFINITY)).toBe(1);
  });

  it("zoomBy respects the bounds and keeps the anchor point fixed", () => {
    resetStore([node("p", "prompt")]);
    useCanvasStore.getState().zoomBy(2, 100, 100);
    const zoomed = useCanvasStore.getState().viewport;
    expect(zoomed.zoom).toBe(2);
    // The world point under (100, 100) has not moved.
    expect((100 - zoomed.x) / zoomed.zoom).toBeCloseTo(100);
    expect((100 - zoomed.y) / zoomed.zoom).toBeCloseTo(100);

    useCanvasStore.getState().zoomBy(10, 100, 100);
    expect(useCanvasStore.getState().viewport.zoom).toBe(MAX_ZOOM);
    useCanvasStore.getState().zoomBy(0.001, 100, 100);
    expect(useCanvasStore.getState().viewport.zoom).toBe(MIN_ZOOM);
  });
});

describe("starterGraph", () => {
  it("yields three nodes and two edges wired prompt → image → motion", () => {
    const { nodes, edges } = starterGraph();
    expect(nodes).toHaveLength(3);
    expect(edges).toHaveLength(2);
    expect(nodes.map((n) => n.type)).toEqual(["prompt", "image", "motion"]);
    expect(nodes[0].data.prompt).toBe(STARTER_PROMPT);
    expect(edges[0]).toMatchObject({ from: nodes[0].id, to: nodes[1].id });
    expect(edges[1]).toMatchObject({ from: nodes[1].id, to: nodes[2].id });
    expect(new Set(nodes.map((n) => n.id)).size).toBe(3);
    expect(topologicalOrderOf(nodes, edges)).toEqual(nodes.map((n) => n.id));
  });

  it("loadTemplate replaces the board and resets the viewport", () => {
    resetStore([node("stale", "prompt")]);
    useCanvasStore.setState({ viewport: { x: 400, y: 120, zoom: 1.5 } });
    useCanvasStore.getState().loadTemplate();

    const state = useCanvasStore.getState();
    expect(state.nodes).toHaveLength(3);
    expect(state.edges).toHaveLength(2);
    expect(state.nodes.some((n) => n.id === "stale")).toBe(false);
    expect(state.viewport).toEqual(DEFAULT_VIEWPORT);
  });

  it("clear empties the board", () => {
    useCanvasStore.getState().loadTemplate();
    useCanvasStore.getState().clear();
    expect(useCanvasStore.getState().nodes).toHaveLength(0);
    expect(useCanvasStore.getState().edges).toHaveLength(0);
  });
});

describe("contentBounds", () => {
  it("is undefined for an empty board", () => {
    expect(contentBounds([])).toBeUndefined();
  });

  it("covers every node including its estimated height", () => {
    const nodes = [node("i", "image", 0, 0), node("p", "prompt", 400, 100)];
    expect(contentBounds(nodes)).toEqual({
      x: 0,
      y: 0,
      width: 400 + NODE_WIDTH,
      height: Math.max(NODE_HEIGHT_ESTIMATE.image, 100 + NODE_HEIGHT_ESTIMATE.prompt),
    });
  });

  it("handles negative coordinates", () => {
    const bounds = contentBounds([node("a", "prompt", -200, -50), node("b", "prompt", 100, 100)]);
    expect(bounds?.x).toBe(-200);
    expect(bounds?.y).toBe(-50);
    expect(bounds?.width).toBe(300 + NODE_WIDTH);
  });
});

describe("findFreeSpot", () => {
  it("returns the preferred point on an empty board", () => {
    expect(findFreeSpot([], "image", { x: 120, y: 240 })).toEqual({ x: 120, y: 240 });
  });

  it("never overlaps an existing node", () => {
    const existing = [node("a", "image", 100, 100), node("b", "image", 100 + NODE_WIDTH + 48, 100)];
    const spot = findFreeSpot(existing, "image", { x: 100, y: 100 });
    const placed: Rect = { ...spot, width: NODE_WIDTH, height: NODE_HEIGHT_ESTIMATE.image };
    for (const other of existing) expect(overlaps(placed, nodeBounds(other))).toBe(false);
  });

  it("prefers a spot inside the visible bounds", () => {
    const existing = [node("a", "prompt", 0, 0)];
    const bounds: Rect = { x: -100, y: -100, width: 1400, height: 900 };
    const spot = findFreeSpot(existing, "prompt", { x: 0, y: 0 }, bounds);
    expect(spot.x).toBeGreaterThanOrEqual(bounds.x);
    expect(spot.y).toBeGreaterThanOrEqual(bounds.y);
    expect(spot.x + NODE_WIDTH).toBeLessThanOrEqual(bounds.x + bounds.width);
    expect(spot.y + NODE_HEIGHT_ESTIMATE.prompt).toBeLessThanOrEqual(bounds.y + bounds.height);
  });
});

describe("node helpers", () => {
  it("gives every type sensible defaults", () => {
    expect(defaultNodeData("prompt")).toEqual({ prompt: "" });
    expect(defaultNodeData("text")).toEqual({ text: "" });
    expect(defaultNodeData("image")).toEqual({ model: "flux-realism-v2", aspectRatio: "16:9" });
    expect(defaultNodeData("motion")).toEqual({ cameraPreset: "dolly-in", duration: 3, motionStrength: 6 });
  });

  it("bounds a node at its width and estimated height", () => {
    expect(nodeBounds(node("i", "image", 10, 20))).toEqual({ x: 10, y: 20, width: NODE_WIDTH, height: NODE_HEIGHT_ESTIMATE.image });
    expect(PORT_Y).toBeLessThan(NODE_HEIGHT_ESTIMATE.prompt);
  });

  it("addNode selects the new node and updateNodeData merges", () => {
    const created = useCanvasStore.getState().addNode("image", { x: 40, y: 60 });
    expect(useCanvasStore.getState().selectedNodeId).toBe(created.id);
    expect(created).toMatchObject({ type: "image", x: 40, y: 60, title: NODE_LABELS.image });

    useCanvasStore.getState().updateNodeData(created.id, { projectId: "proj_1" });
    const stored = useCanvasStore.getState().nodes.find((n) => n.id === created.id);
    expect(stored?.data).toMatchObject({ model: "flux-realism-v2", aspectRatio: "16:9", projectId: "proj_1" });
  });

  it("moveNode rounds and ignores non-finite coordinates", () => {
    const created = useCanvasStore.getState().addNode("prompt", { x: 0, y: 0 });
    useCanvasStore.getState().moveNode(created.id, 12.4, -7.6);
    expect(useCanvasStore.getState().nodes[0]).toMatchObject({ x: 12, y: -8 });
    useCanvasStore.getState().moveNode(created.id, Number.NaN, 10);
    expect(useCanvasStore.getState().nodes[0]).toMatchObject({ x: 12, y: -8 });
  });

  it("topologicalOrder reads from the live store", () => {
    resetStore([node("i", "image", 400), node("p", "prompt", 0)], [edge("e1", "p", "i")]);
    expect(useCanvasStore.getState().topologicalOrder()).toEqual(["p", "i"]);
  });
});

describe("fitToContent", () => {
  it("centres the graph and never zooms past 1", () => {
    resetStore([node("a", "prompt", 0, 0), node("b", "image", 4000, 0)]);
    useCanvasStore.getState().fitToContent(1200, 800);
    const { zoom } = useCanvasStore.getState().viewport;
    expect(zoom).toBeGreaterThanOrEqual(MIN_ZOOM);
    expect(zoom).toBeLessThanOrEqual(1);

    resetStore([node("a", "prompt", 0, 0)]);
    useCanvasStore.getState().fitToContent(1200, 800);
    expect(useCanvasStore.getState().viewport.zoom).toBe(1);
  });

  it("falls back to the default viewport without content", () => {
    resetStore([]);
    useCanvasStore.setState({ viewport: { x: 10, y: 10, zoom: 1.5 } });
    useCanvasStore.getState().fitToContent(1200, 800);
    expect(useCanvasStore.getState().viewport).toEqual(DEFAULT_VIEWPORT);
  });
});

describe("canvas runner helpers", () => {
  it("joins the upstream prompt with the image node's own extra prompt", () => {
    const prompt = node("p", "prompt");
    prompt.data.prompt = "Neon alley in the rain";
    const image = node("i", "image", 400);
    image.data.prompt = "shot on 35mm";
    const nodes = [prompt, image];
    const edges = [edge("e1", "p", "i")];
    expect(resolveImagePrompt(nodes, edges, image)).toBe("Neon alley in the rain, shot on 35mm");
  });

  it("reads a text node's text as the upstream contribution", () => {
    const text = node("t", "text");
    text.data.text = "muted palette, soft grain";
    const image = node("i", "image", 400);
    expect(nodeText(text)).toBe("muted palette, soft grain");
    expect(resolveImagePrompt([text, image], [edge("e1", "t", "i")], image)).toBe("muted palette, soft grain");
  });

  it("skips blanks on both sides", () => {
    const prompt = node("p", "prompt");
    prompt.data.prompt = "   ";
    const image = node("i", "image", 400);
    image.data.prompt = "  golden hour  ";
    expect(resolveImagePrompt([prompt, image], [edge("e1", "p", "i")], image)).toBe("golden hour");
    image.data.prompt = "";
    expect(resolveImagePrompt([prompt, image], [edge("e1", "p", "i")], image)).toBe("");
    expect(nodeText(undefined)).toBe("");
  });
});

describe("waitForProject", () => {
  const newProject = () => useProjectStore.getState().createProject({ type: "image", prompt: "a test", model: "flux-realism-v2", aspectRatio: "16:9" });

  it("resolves when the project reaches completed", async () => {
    const project = newProject();
    const pending = waitForProject(project.id);
    useProjectStore.getState().updateProject(project.id, { status: "processing", progress: 40 });
    useProjectStore.getState().updateProject(project.id, { status: "completed", progress: 100 });
    await expect(pending).resolves.toMatchObject({ id: project.id, status: "completed" });
  });

  it("resolves immediately for an already completed project", async () => {
    const project = newProject();
    useProjectStore.getState().updateProject(project.id, { status: "completed" });
    await expect(waitForProject(project.id)).resolves.toMatchObject({ id: project.id });
  });

  it("rejects with the failure message", async () => {
    const project = newProject();
    const pending = waitForProject(project.id);
    useProjectStore.getState().updateProject(project.id, { status: "failed", errorMessage: "Endpoint unavailable" });
    await expect(pending).rejects.toThrow("Endpoint unavailable");
  });

  it("rejects when the project is cancelled", async () => {
    const project = newProject();
    const pending = waitForProject(project.id);
    useProjectStore.getState().updateProject(project.id, { status: "cancelled" });
    await expect(pending).rejects.toThrow(/cancelled/i);
  });
});

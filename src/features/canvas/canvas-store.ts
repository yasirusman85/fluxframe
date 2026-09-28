/**
 * Node canvas state: a small persisted DAG of prompt/text → image → motion
 * nodes plus the viewport. Pure graph helpers are exported separately so
 * the runner and tests can use them without a React tree.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createId } from "../../lib/ids";

export type NodeType = "prompt" | "image" | "motion" | "text";

export interface CanvasNodeData {
  prompt?: string;
  model?: string;
  aspectRatio?: string;
  duration?: number;
  cameraPreset?: string;
  motionStrength?: number;
  text?: string;
  /** Generation project produced by this node (image/motion nodes). */
  projectId?: string;
}

export interface CanvasNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  title: string;
  data: CanvasNodeData;
}

export interface CanvasEdge {
  id: string;
  from: string;
  to: string;
}

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const CANVAS_STORAGE_KEY = "fluxframe-canvas-v1";
export const NODE_WIDTH = 288;
/** Vertical offset of the in/out ports from the node's top edge. */
export const PORT_Y = 40;
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 2;
export const DEFAULT_VIEWPORT: CanvasViewport = { x: 0, y: 0, zoom: 1 };

export const NODE_LABELS: Record<NodeType, string> = { prompt: "Prompt", text: "Text", image: "Image", motion: "Motion" };

/** Approximate rendered heights, used for fit-to-content and free-spot search. */
export const NODE_HEIGHT_ESTIMATE: Record<NodeType, number> = { prompt: 200, text: 200, image: 372, motion: 444 };

/** Which node types may feed which. A target keeps at most one incoming edge. */
const ALLOWED_TARGETS: Record<NodeType, readonly NodeType[]> = {
  prompt: ["image", "motion"],
  text: ["image"],
  image: ["motion"],
  motion: [],
};

const TYPE_RANK: Record<NodeType, number> = { prompt: 0, text: 0, image: 1, motion: 2 };

export function canConnect(from: NodeType, to: NodeType): boolean {
  return ALLOWED_TARGETS[from].includes(to);
}

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function defaultNodeData(type: NodeType): CanvasNodeData {
  switch (type) {
    case "prompt":
      return { prompt: "" };
    case "text":
      return { text: "" };
    case "image":
      return { model: "flux-realism-v2", aspectRatio: "16:9" };
    case "motion":
      return { cameraPreset: "dolly-in", duration: 3, motionStrength: 6 };
  }
}

export function nodeBounds(node: CanvasNode): Rect {
  return { x: node.x, y: node.y, width: NODE_WIDTH, height: NODE_HEIGHT_ESTIMATE[node.type] };
}

export function contentBounds(nodes: CanvasNode[]): Rect | undefined {
  if (nodes.length === 0) return undefined;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    const b = nodeBounds(node);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function intersects(a: Rect, b: Rect, gap = 16): boolean {
  return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
}

function inside(rect: Rect, bounds: Rect): boolean {
  return rect.x >= bounds.x && rect.y >= bounds.y && rect.x + rect.width <= bounds.x + bounds.width && rect.y + rect.height <= bounds.y + bounds.height;
}

/**
 * Picks a position for a new node near `preferred` that does not overlap an
 * existing node, preferring spots inside `bounds` (the visible area).
 */
export function findFreeSpot(nodes: CanvasNode[], type: NodeType, preferred: Point, bounds?: Rect): Point {
  const size = { width: NODE_WIDTH, height: NODE_HEIGHT_ESTIMATE[type] };
  const existing = nodes.map(nodeBounds);
  const stepX = NODE_WIDTH + 48;
  const stepY = 120;
  const candidates: Point[] = [];
  for (let ring = 0; ring <= 4; ring++) {
    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        candidates.push({ x: preferred.x + dx * stepX, y: preferred.y + dy * stepY });
      }
    }
  }
  const free = (p: Point) => !existing.some((rect) => intersects({ ...p, ...size }, rect));
  if (bounds) {
    const visible = candidates.find((p) => inside({ ...p, ...size }, bounds) && free(p));
    if (visible) return visible;
  }
  const anywhere = candidates.find(free);
  if (anywhere) return anywhere;
  const shift = nodes.length * 24;
  return { x: preferred.x + shift, y: preferred.y + shift };
}

export function findIncomingEdge(edges: CanvasEdge[], nodeId: string): CanvasEdge | undefined {
  return edges.find((edge) => edge.to === nodeId);
}

/** The single node feeding `nodeId`, if any. */
export function findUpstream(nodes: CanvasNode[], edges: CanvasEdge[], nodeId: string): CanvasNode | undefined {
  const edge = findIncomingEdge(edges, nodeId);
  return edge ? nodes.find((node) => node.id === edge.from) : undefined;
}

export function findDownstream(nodes: CanvasNode[], edges: CanvasEdge[], nodeId: string): CanvasNode[] {
  const ids = new Set(edges.filter((edge) => edge.from === nodeId).map((edge) => edge.to));
  return nodes.filter((node) => ids.has(node.id));
}

/**
 * Kahn's algorithm with a stable priority: sources first (prompt/text), then
 * image, then motion; ties broken left-to-right so runs feel predictable.
 */
export function topologicalOrderOf(nodes: CanvasNode[], edges: CanvasEdge[]): string[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const indegree = new Map<string, number>(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    if (!byId.has(edge.from) || !byId.has(edge.to)) continue;
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge.to]);
  }
  const compare = (a: string, b: string): number => {
    const na = byId.get(a)!;
    const nb = byId.get(b)!;
    return TYPE_RANK[na.type] - TYPE_RANK[nb.type] || na.x - nb.x || na.y - nb.y || a.localeCompare(b);
  };
  const ready = nodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id);
  ready.sort(compare);
  const order: string[] = [];
  const seen = new Set<string>();
  while (ready.length > 0) {
    const id = ready.shift()!;
    order.push(id);
    seen.add(id);
    for (const next of outgoing.get(id) ?? []) {
      const remaining = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, remaining);
      if (remaining === 0) {
        ready.push(next);
        ready.sort(compare);
      }
    }
  }
  // Cycles cannot be built through `connect`, but never drop a node if one sneaks in.
  const leftovers = nodes.map((node) => node.id).filter((id) => !seen.has(id));
  leftovers.sort(compare);
  return [...order, ...leftovers];
}

export const STARTER_PROMPT = "Neon-lit alley in the rain, cinematic";

/** Prompt → Image → Motion, laid out left-to-right. */
export function starterGraph(): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const prompt: CanvasNode = { id: createId("node"), type: "prompt", x: 80, y: 160, title: "Prompt", data: { prompt: STARTER_PROMPT } };
  const image: CanvasNode = { id: createId("node"), type: "image", x: 460, y: 160, title: "Image", data: { model: "flux-realism-v2", aspectRatio: "16:9" } };
  const motion: CanvasNode = { id: createId("node"), type: "motion", x: 840, y: 160, title: "Motion", data: { cameraPreset: "dolly-in", duration: 3, motionStrength: 6 } };
  return {
    nodes: [prompt, image, motion],
    edges: [
      { id: createId("edge"), from: prompt.id, to: image.id },
      { id: createId("edge"), from: image.id, to: motion.id },
    ],
  };
}

export interface FitOptions {
  minZoom?: number;
  maxZoom?: number;
  padding?: number;
}

export interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: CanvasViewport;
  selectedNodeId?: string;
  selectedEdgeId?: string;

  addNode: (type: NodeType, at?: Point) => CanvasNode;
  updateNode: (id: string, patch: Partial<Omit<CanvasNode, "id" | "data">>) => void;
  updateNodeData: (id: string, patch: Partial<CanvasNodeData>) => void;
  moveNode: (id: string, x: number, y: number) => void;
  removeNode: (id: string) => void;
  /** Returns false for self-loops, duplicates and disallowed pairs. Replaces an existing incoming edge. */
  connect: (from: string, to: string) => boolean;
  disconnect: (edgeId: string) => void;
  select: (nodeId?: string) => void;
  selectEdge: (edgeId?: string) => void;
  setViewport: (patch: Partial<CanvasViewport>) => void;
  /** Multiplies the zoom (clamped 0.25..2), keeping the container point (aroundX, aroundY) fixed. */
  zoomBy: (factor: number, aroundX?: number, aroundY?: number) => void;
  resetViewport: () => void;
  fitToContent: (containerWidth: number, containerHeight: number, options?: FitOptions) => void;
  clear: () => void;
  loadTemplate: () => void;
  topologicalOrder: () => string[];
}

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      ...starterGraph(),
      viewport: { ...DEFAULT_VIEWPORT },
      selectedNodeId: undefined,
      selectedEdgeId: undefined,

      addNode: (type, at) => {
        const count = get().nodes.length;
        const node: CanvasNode = {
          id: createId("node"),
          type,
          x: Math.round(at?.x ?? 120 + (count % 6) * 32),
          y: Math.round(at?.y ?? 120 + (count % 6) * 32),
          title: NODE_LABELS[type],
          data: defaultNodeData(type),
        };
        set((state) => ({ nodes: [...state.nodes, node], selectedNodeId: node.id, selectedEdgeId: undefined }));
        return node;
      },

      updateNode: (id, patch) => {
        set((state) => ({ nodes: state.nodes.map((node) => (node.id === id ? { ...node, ...patch, id: node.id } : node)) }));
      },

      updateNodeData: (id, patch) => {
        set((state) => ({ nodes: state.nodes.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...patch } } : node)) }));
      },

      moveNode: (id, x, y) => {
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        set((state) => ({ nodes: state.nodes.map((node) => (node.id === id ? { ...node, x: Math.round(x), y: Math.round(y) } : node)) }));
      },

      removeNode: (id) => {
        set((state) => {
          const removedEdges = new Set(state.edges.filter((edge) => edge.from === id || edge.to === id).map((edge) => edge.id));
          return {
            nodes: state.nodes.filter((node) => node.id !== id),
            edges: state.edges.filter((edge) => !removedEdges.has(edge.id)),
            selectedNodeId: state.selectedNodeId === id ? undefined : state.selectedNodeId,
            selectedEdgeId: state.selectedEdgeId && removedEdges.has(state.selectedEdgeId) ? undefined : state.selectedEdgeId,
          };
        });
      },

      connect: (from, to) => {
        if (from === to) return false;
        const { nodes, edges } = get();
        const source = nodes.find((node) => node.id === from);
        const target = nodes.find((node) => node.id === to);
        if (!source || !target || !canConnect(source.type, target.type)) return false;
        if (edges.some((edge) => edge.from === from && edge.to === to)) return false;
        const edge: CanvasEdge = { id: createId("edge"), from, to };
        set((state) => {
          const replaced = state.edges.filter((existing) => existing.to === to).map((existing) => existing.id);
          return {
            edges: [...state.edges.filter((existing) => existing.to !== to), edge],
            selectedEdgeId: state.selectedEdgeId && replaced.includes(state.selectedEdgeId) ? undefined : state.selectedEdgeId,
          };
        });
        return true;
      },

      disconnect: (edgeId) => {
        set((state) => ({
          edges: state.edges.filter((edge) => edge.id !== edgeId),
          selectedEdgeId: state.selectedEdgeId === edgeId ? undefined : state.selectedEdgeId,
        }));
      },

      select: (nodeId) => set({ selectedNodeId: nodeId, selectedEdgeId: undefined }),
      selectEdge: (edgeId) => set({ selectedEdgeId: edgeId, selectedNodeId: undefined }),

      setViewport: (patch) => {
        set((state) => {
          const next = { ...state.viewport, ...patch };
          return { viewport: { x: Number.isFinite(next.x) ? next.x : 0, y: Number.isFinite(next.y) ? next.y : 0, zoom: clampZoom(next.zoom) } };
        });
      },

      zoomBy: (factor, aroundX = 0, aroundY = 0) => {
        const { viewport } = get();
        const zoom = clampZoom(viewport.zoom * factor);
        if (zoom === viewport.zoom) return;
        // The world point under (aroundX, aroundY) must stay put.
        const worldX = (aroundX - viewport.x) / viewport.zoom;
        const worldY = (aroundY - viewport.y) / viewport.zoom;
        set({ viewport: { zoom, x: aroundX - worldX * zoom, y: aroundY - worldY * zoom } });
      },

      resetViewport: () => set({ viewport: { ...DEFAULT_VIEWPORT } }),

      fitToContent: (containerWidth, containerHeight, options = {}) => {
        const bounds = contentBounds(get().nodes);
        if (!bounds || containerWidth <= 0 || containerHeight <= 0) {
          set({ viewport: { ...DEFAULT_VIEWPORT } });
          return;
        }
        const padding = options.padding ?? 64;
        const minZoom = options.minZoom ?? MIN_ZOOM;
        const maxZoom = options.maxZoom ?? 1;
        const raw = Math.min(containerWidth / (bounds.width + padding * 2), containerHeight / (bounds.height + padding * 2));
        const zoom = clampZoom(Math.min(maxZoom, Math.max(minZoom, raw)));
        set({
          viewport: {
            zoom,
            x: Math.round((containerWidth - bounds.width * zoom) / 2 - bounds.x * zoom),
            y: Math.round((containerHeight - bounds.height * zoom) / 2 - bounds.y * zoom),
          },
        });
      },

      clear: () => set({ nodes: [], edges: [], selectedNodeId: undefined, selectedEdgeId: undefined, viewport: { ...DEFAULT_VIEWPORT } }),

      loadTemplate: () => set({ ...starterGraph(), selectedNodeId: undefined, selectedEdgeId: undefined, viewport: { ...DEFAULT_VIEWPORT } }),

      topologicalOrder: () => topologicalOrderOf(get().nodes, get().edges),
    }),
    {
      name: CANVAS_STORAGE_KEY,
      version: 1,
      partialize: (state) => ({ nodes: state.nodes, edges: state.edges, viewport: state.viewport }),
    },
  ),
);

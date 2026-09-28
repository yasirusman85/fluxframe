/**
 * Node Canvas — chain prompt/text → image → motion nodes on an infinite,
 * persisted board and run the whole graph through the normal generation
 * system (same credits, same queue, same project library).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Workflow } from "lucide-react";
import { Badge, Button, EmptyState, PageHeader } from "../../components/ui";
import { CanvasViewport } from "../../components/canvas/CanvasViewport";
import { CanvasToolbar } from "../../components/canvas/CanvasToolbar";
import { EdgeLayer } from "../../components/canvas/EdgeLayer";
import type { ConnectionDraft } from "../../components/canvas/EdgeLayer";
import { NodeCard } from "../../components/canvas/NodeCard";
import { NodeInspector } from "../../components/canvas/NodeInspector";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useUIStore } from "../../store/ui-store";
import { NODE_WIDTH, findFreeSpot, useCanvasStore } from "./canvas-store";
import type { NodeType, Point, Rect } from "./canvas-store";
import { useCanvasRunner } from "./use-canvas-runner";

/** Zoom step for the toolbar buttons. */
const ZOOM_STEP = 1.25;
/** Roughly a node header's height — new nodes are centred, not top-aligned. */
const NEW_NODE_Y_OFFSET = 60;
/** Below this workspace width the inspector would cover the graph, so it starts collapsed. */
const INSPECTOR_MIN_WIDTH = 1200;

const EDITABLE_TAGS = ["INPUT", "TEXTAREA", "SELECT"];

function isTypingTarget(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  return element.isContentEditable || EDITABLE_TAGS.includes(element.tagName);
}

export const CanvasPage: React.FC = () => {
  useDocumentTitle("Node Canvas");
  const containerRef = useRef<HTMLDivElement>(null);

  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const viewport = useCanvasStore((s) => s.viewport);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const selectedEdgeId = useCanvasStore((s) => s.selectedEdgeId);
  const addNode = useCanvasStore((s) => s.addNode);
  const disconnect = useCanvasStore((s) => s.disconnect);
  const select = useCanvasStore((s) => s.select);
  const selectEdge = useCanvasStore((s) => s.selectEdge);
  const zoomBy = useCanvasStore((s) => s.zoomBy);
  const resetViewport = useCanvasStore((s) => s.resetViewport);
  const fitToContent = useCanvasStore((s) => s.fitToContent);
  const clear = useCanvasStore((s) => s.clear);
  const loadTemplate = useCanvasStore((s) => s.loadTemplate);

  const addToast = useUIStore((s) => s.addToast);
  const { runNode, runAll, running, runningNodeId } = useCanvasRunner();

  const [draft, setDraft] = useState<ConnectionDraft | undefined>(undefined);
  // Collapsed by default so the panel never covers the graph on narrow screens;
  // wide workspaces have room for it and open it on mount.
  const [inspectorCollapsed, setInspectorCollapsed] = useState(true);

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId), [nodes, selectedNodeId]);
  const canRun = useMemo(() => nodes.some((node) => node.type === "image" || node.type === "motion"), [nodes]);

  /** Container-relative client coordinates → world coordinates. */
  const toWorld = useCallback((clientX: number, clientY: number): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    const { x, y, zoom } = useCanvasStore.getState().viewport;
    return { x: (clientX - (rect?.left ?? 0) - x) / zoom, y: (clientY - (rect?.top ?? 0) - y) / zoom };
  }, []);

  /** Visible region of the board, in world coordinates. */
  const visibleBounds = useCallback((): Rect => {
    const rect = containerRef.current?.getBoundingClientRect();
    const { x, y, zoom } = useCanvasStore.getState().viewport;
    const width = rect?.width ?? 960;
    const height = rect?.height ?? 600;
    return { x: -x / zoom, y: -y / zoom, width: width / zoom, height: height / zoom };
  }, []);

  const handleAdd = useCallback(
    (type: NodeType) => {
      const bounds = visibleBounds();
      const preferred = {
        x: Math.round(bounds.x + bounds.width / 2 - NODE_WIDTH / 2),
        y: Math.round(bounds.y + bounds.height / 2 - NEW_NODE_Y_OFFSET),
      };
      addNode(type, findFreeSpot(useCanvasStore.getState().nodes, type, preferred, bounds));
    },
    [addNode, visibleBounds],
  );

  // ---- connecting -------------------------------------------------------------

  const onPortDown = useCallback(
    (nodeId: string, event: React.PointerEvent<HTMLElement>) => {
      const start = toWorld(event.clientX, event.clientY);
      setDraft({ fromId: nodeId, x: start.x, y: start.y });

      function detach(): void {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", abandon);
      }
      function move(moveEvent: PointerEvent): void {
        const point = toWorld(moveEvent.clientX, moveEvent.clientY);
        setDraft({ fromId: nodeId, x: point.x, y: point.y });
      }
      function abandon(): void {
        detach();
        setDraft(undefined);
      }
      function finish(upEvent: PointerEvent): void {
        detach();
        setDraft(undefined);
        const under = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
        const port = under instanceof Element ? under.closest<HTMLElement>('[data-testid="node-port-in"]') : null;
        const targetId = port?.dataset.nodeId;
        if (!targetId || targetId === nodeId) return;
        if (!useCanvasStore.getState().connect(nodeId, targetId)) {
          addToast("Those nodes cannot be connected. Prompt and text feed image nodes; image feeds motion.", { type: "warning" });
        }
      }

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", abandon);
    },
    [addToast, toWorld],
  );

  useEffect(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect && rect.width >= INSPECTOR_MIN_WIDTH) setInspectorCollapsed(false);
  }, []);

  // ---- keyboard ---------------------------------------------------------------

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      if (isTypingTarget(document.activeElement)) return;
      const state = useCanvasStore.getState();
      if (state.selectedNodeId) {
        event.preventDefault();
        state.removeNode(state.selectedNodeId);
      } else if (state.selectedEdgeId) {
        event.preventDefault();
        state.disconnect(state.selectedEdgeId);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ---- toolbar ----------------------------------------------------------------

  const handleFit = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    fitToContent(rect?.width ?? 0, rect?.height ?? 0);
  }, [fitToContent]);

  const zoomAtCentre = useCallback(
    (factor: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      zoomBy(factor, (rect?.width ?? 0) / 2, (rect?.height ?? 0) / 2);
    },
    [zoomBy],
  );

  const handleTemplate = useCallback(() => {
    loadTemplate();
    addToast("Starter workflow loaded: prompt → image → motion.", { type: "success" });
  }, [addToast, loadTemplate]);

  const handleClear = useCallback(() => {
    if (!window.confirm("Clear the canvas? Every node and connection is removed. Generated projects stay in your library.")) return;
    clear();
    addToast("Canvas cleared.", { type: "info" });
  }, [addToast, clear]);

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        icon={<Workflow aria-hidden />}
        title="Node Canvas"
        badge={
          <Badge variant="brand" size="sm">
            Beta
          </Badge>
        }
        description="Wire prompts into images and images into motion clips. Every node runs through the same engines, credits and library as the studios, and the board is saved in this browser."
        actions={
          <p className="text-xs text-zinc-400">
            {nodes.length} {nodes.length === 1 ? "node" : "nodes"} · {edges.length} {edges.length === 1 ? "connection" : "connections"}
          </p>
        }
      />

      <CanvasViewport
        containerRef={containerRef}
        onBackgroundPointerDown={() => select(undefined)}
        overlay={
          <>
            <CanvasToolbar
              onAdd={handleAdd}
              onRunAll={() => void runAll()}
              running={running}
              canRun={canRun}
              onLoadTemplate={handleTemplate}
              onClear={handleClear}
              zoom={viewport.zoom}
              onZoomIn={() => zoomAtCentre(ZOOM_STEP)}
              onZoomOut={() => zoomAtCentre(1 / ZOOM_STEP)}
              onZoomReset={resetViewport}
              onFit={handleFit}
            />

            <NodeInspector node={selectedNode} collapsed={inspectorCollapsed} onToggleCollapsed={() => setInspectorCollapsed((value) => !value)} />

            <div data-canvas-ui className="pointer-events-none absolute bottom-3 left-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1.5">
              <span className="glass rounded-full border border-zinc-800/80 px-2.5 py-1 text-[11px] font-medium text-zinc-400">Drag from ● to connect</span>
              <span className="glass rounded-full border border-zinc-800/80 px-2.5 py-1 text-[11px] font-medium text-zinc-400">
                Wheel to pan · ⌘ + wheel to zoom
              </span>
            </div>

            {nodes.length === 0 && (
              <div data-testid="canvas-empty" className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4">
                <div className="pointer-events-auto" data-canvas-ui>
                  <EmptyState
                    icon={<Workflow aria-hidden />}
                    title="The board is empty"
                    description="Start from the three-node starter workflow, or add nodes from the toolbar and wire them up yourself."
                    action={
                      <Button size="sm" onClick={handleTemplate}>
                        Load starter workflow
                      </Button>
                    }
                  />
                </div>
              </div>
            )}
          </>
        }
      >
        <EdgeLayer nodes={nodes} edges={edges} selectedEdgeId={selectedEdgeId} draft={draft} onSelect={selectEdge} onDelete={disconnect} />
        {nodes.map((node) => (
          <NodeCard
            key={node.id}
            node={node}
            selected={node.id === selectedNodeId}
            zoom={viewport.zoom}
            running={runningNodeId === node.id}
            onRun={(id) => void runNode(id)}
            onPortDown={onPortDown}
          />
        ))}
      </CanvasViewport>
    </div>
  );
};

export default CanvasPage;

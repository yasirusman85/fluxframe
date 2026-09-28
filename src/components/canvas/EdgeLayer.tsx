/**
 * SVG connections between nodes. Rendered inside the transformed world layer
 * and underneath the node cards, so coordinates are plain node coordinates.
 */
import React from "react";
import { X } from "lucide-react";
import { useProjectStore } from "../../store/project-store";
import { usePrefersReducedMotion } from "../../hooks/useMediaQuery";
import { NODE_WIDTH, PORT_Y } from "../../features/canvas/canvas-store";
import type { CanvasEdge, CanvasNode, Point } from "../../features/canvas/canvas-store";
import { cn } from "../../lib/cn";

export interface ConnectionDraft {
  fromId: string;
  /** Cursor position in world coordinates. */
  x: number;
  y: number;
}

export interface EdgeLayerProps {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedEdgeId?: string;
  /** Temporary edge drawn while dragging out of an output port. */
  draft?: ConnectionDraft;
  onSelect: (edgeId: string) => void;
  onDelete: (edgeId: string) => void;
}

function outputPort(node: CanvasNode): Point {
  return { x: node.x + NODE_WIDTH, y: node.y + PORT_Y };
}

function inputPort(node: CanvasNode): Point {
  return { x: node.x, y: node.y + PORT_Y };
}

/** Horizontal cubic bezier, flattening out as the two ports get closer. */
function bezierPath(from: Point, to: Point): string {
  const curve = Math.max(40, Math.abs(to.x - from.x) * 0.5);
  return `M ${from.x} ${from.y} C ${from.x + curve} ${from.y}, ${to.x - curve} ${to.y}, ${to.x} ${to.y}`;
}

function midpoint(from: Point, to: Point): Point {
  // Value of the cubic at t = 0.5 with the control points above.
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
}

export const EdgeLayer: React.FC<EdgeLayerProps> = ({ nodes, edges, selectedEdgeId, draft, onSelect, onDelete }) => {
  const projects = useProjectStore((s) => s.projects);
  const reducedMotion = usePrefersReducedMotion();
  const byId = new Map(nodes.map((node) => [node.id, node]));

  const isTargetBusy = (edge: CanvasEdge): boolean => {
    const projectId = byId.get(edge.to)?.data.projectId;
    if (!projectId) return false;
    const status = projects.find((project) => project.id === projectId)?.status;
    return status === "queued" || status === "processing";
  };

  const draftNode = draft ? byId.get(draft.fromId) : undefined;
  const selected = edges.find((edge) => edge.id === selectedEdgeId);
  const selectedFrom = selected ? byId.get(selected.from) : undefined;
  const selectedTo = selected ? byId.get(selected.to) : undefined;
  const deleteAt = selectedFrom && selectedTo ? midpoint(outputPort(selectedFrom), inputPort(selectedTo)) : undefined;

  return (
    <>
      <svg className="absolute left-0 top-0 h-px w-px" style={{ overflow: "visible" }} aria-hidden>
        {edges.map((edge) => {
          const from = byId.get(edge.from);
          const to = byId.get(edge.to);
          if (!from || !to) return null;
          const path = bezierPath(outputPort(from), inputPort(to));
          const isSelected = edge.id === selectedEdgeId;
          const busy = isTargetBusy(edge);
          return (
            <g key={edge.id} data-testid="canvas-edge" data-edge-id={edge.id} data-active={busy || undefined}>
              {/* Fat transparent path so the thin edge is easy to hit. */}
              <path
                d={path}
                data-canvas-hit
                fill="none"
                stroke="transparent"
                strokeWidth={16}
                strokeLinecap="round"
                className="pointer-events-auto cursor-pointer"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onSelect(edge.id)}
              />
              <path
                d={path}
                fill="none"
                strokeWidth={2}
                strokeLinecap="round"
                className={cn("pointer-events-none transition-colors", isSelected ? "stroke-brand-300" : busy ? "stroke-brand-400" : "stroke-brand-500/70")}
                strokeDasharray={busy ? "6 6" : undefined}
              >
                {busy && !reducedMotion && <animate attributeName="stroke-dashoffset" from="24" to="0" dur="0.7s" repeatCount="indefinite" />}
              </path>
              {isSelected && <circle cx={inputPort(to).x} cy={inputPort(to).y} r={4} className="pointer-events-none fill-brand-300" />}
            </g>
          );
        })}

        {draft && draftNode && (
          <path
            d={bezierPath(outputPort(draftNode), { x: draft.x, y: draft.y })}
            fill="none"
            strokeWidth={2}
            strokeDasharray="5 5"
            strokeLinecap="round"
            className="pointer-events-none stroke-brand-300"
          />
        )}
      </svg>

      {selected && deleteAt && (
        <button
          type="button"
          data-canvas-hit
          data-testid="edge-delete"
          aria-label="Delete connection"
          title="Delete connection"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onDelete(selected.id)}
          className="absolute z-10 flex h-6 w-6 items-center justify-center rounded-full border border-rose-500/50 bg-surface-1 text-rose-300 shadow-panel transition-colors hover:bg-rose-500/20 hover:text-rose-200"
          style={{ left: deleteAt.x - 12, top: deleteAt.y - 12 }}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </>
  );
};

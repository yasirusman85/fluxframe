/**
 * Pan/zoom workspace for the node canvas.
 *
 * `children` render inside a layer transformed with
 * `translate(x, y) scale(zoom)` (world space); `overlay` renders untransformed
 * on top (toolbar, hints, inspector). Dragging empty background pans, the
 * wheel pans, and ⌘/Ctrl + wheel — which is also how a trackpad pinch arrives —
 * zooms around the cursor.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useCanvasStore } from "../../features/canvas/canvas-store";
import { cn } from "../../lib/cn";

/** World-space size of one dot-grid cell at zoom 1. */
const GRID_SIZE = 24;
/** Elements that must never start a pan when pressed. */
const INTERACTIVE_SELECTOR = "[data-canvas-node], [data-canvas-hit], [data-canvas-ui]";

export interface CanvasViewportProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** World-space content (edges, nodes). */
  children: React.ReactNode;
  /** Screen-space content layered above the graph. */
  overlay?: React.ReactNode;
  /** Called when the background itself is pressed (used to clear the selection). */
  onBackgroundPointerDown?: () => void;
  className?: string;
}

interface PanSession {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

function isBackground(target: EventTarget | null): boolean {
  return target instanceof Element ? !target.closest(INTERACTIVE_SELECTOR) : false;
}

/** Wheel deltas arrive in pixels, lines or pages depending on the device. */
function wheelScale(event: WheelEvent, viewportHeight: number): number {
  if (event.deltaMode === 1) return 16;
  if (event.deltaMode === 2) return viewportHeight;
  return 1;
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({ containerRef, children, overlay, onBackgroundPointerDown, className }) => {
  const viewport = useCanvasStore((s) => s.viewport);
  const setViewport = useCanvasStore((s) => s.setViewport);
  const zoomBy = useCanvasStore((s) => s.zoomBy);
  const [panning, setPanning] = useState(false);
  const session = useRef<PanSession | null>(null);

  // React registers `wheel` passively, so the listener is attached by hand to
  // keep `preventDefault` (otherwise the page scrolls while panning/zooming).
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const scale = wheelScale(event, rect.height);
      if (event.ctrlKey || event.metaKey) {
        zoomBy(Math.exp((-event.deltaY * scale) / 240), event.clientX - rect.left, event.clientY - rect.top);
        return;
      }
      const current = useCanvasStore.getState().viewport;
      setViewport({ x: current.x - event.deltaX * scale, y: current.y - event.deltaY * scale });
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [containerRef, setViewport, zoomBy]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (!isBackground(event.target)) return;
      onBackgroundPointerDown?.();
      const current = useCanvasStore.getState().viewport;
      session.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: current.x, originY: current.y };
      event.currentTarget.setPointerCapture(event.pointerId);
      setPanning(true);
    },
    [onBackgroundPointerDown],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const pan = session.current;
      if (!pan || pan.pointerId !== event.pointerId) return;
      setViewport({ x: pan.originX + (event.clientX - pan.startX), y: pan.originY + (event.clientY - pan.startY) });
    },
    [setViewport],
  );

  const endPan = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (session.current?.pointerId !== event.pointerId) return;
    session.current = null;
    setPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  const gridSize = GRID_SIZE * viewport.zoom;

  return (
    <div
      ref={containerRef}
      data-testid="canvas-root"
      data-zoom={viewport.zoom.toFixed(2)}
      role="application"
      aria-label="Node canvas workspace"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      style={{ touchAction: "none" }}
      className={cn(
        "relative h-[calc(100vh-8rem)] min-h-[28rem] w-full overflow-hidden rounded-2xl border border-zinc-800/80 bg-surface-1 shadow-panel",
        panning ? "cursor-grabbing" : "cursor-grab",
        className,
      )}
    >
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0"
        style={{ backgroundSize: `${gridSize}px ${gridSize}px`, backgroundPosition: `${viewport.x}px ${viewport.y}px` }}
      />
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}
      >
        {children}
      </div>
      {overlay}
    </div>
  );
};

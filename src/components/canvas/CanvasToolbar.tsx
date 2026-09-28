/**
 * Floating canvas controls: node palette + run/template/clear on the left,
 * zoom cluster on the right. Both sit above the workspace in screen space.
 */
import React from "react";
import { Clapperboard, Image as ImageIcon, LayoutTemplate, Maximize2, Play, Sparkles, Trash2, Type, ZoomIn, ZoomOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button, IconButton } from "../ui";
import type { NodeType } from "../../features/canvas/canvas-store";

const ADD_BUTTONS: ReadonlyArray<{ type: NodeType; label: string; icon: LucideIcon; testId: string }> = [
  { type: "prompt", label: "Prompt", icon: Sparkles, testId: "canvas-add-prompt" },
  { type: "text", label: "Text", icon: Type, testId: "canvas-add-text" },
  { type: "image", label: "Image", icon: ImageIcon, testId: "canvas-add-image" },
  { type: "motion", label: "Motion", icon: Clapperboard, testId: "canvas-add-motion" },
];

export interface CanvasToolbarProps {
  onAdd: (type: NodeType) => void;
  onRunAll: () => void;
  running: boolean;
  /** False when the graph has no image or motion node to run. */
  canRun: boolean;
  onLoadTemplate: () => void;
  onClear: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFit: () => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  onAdd,
  onRunAll,
  running,
  canRun,
  onLoadTemplate,
  onClear,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFit,
}) => (
  <>
    <div
      data-canvas-ui
      className="glass absolute left-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1 rounded-2xl border border-zinc-800/80 p-1.5 shadow-panel"
    >
      {ADD_BUTTONS.map(({ type, label, icon: Icon, testId }) => (
        <Button
          key={type}
          size="sm"
          variant="ghost"
          data-testid={testId}
          onClick={() => onAdd(type)}
          leftIcon={<Icon className="h-3.5 w-3.5" aria-hidden />}
          className="text-zinc-300 hover:text-white"
        >
          {label}
        </Button>
      ))}

      <span className="mx-0.5 hidden h-6 w-px bg-zinc-800 sm:block" aria-hidden />

      <Button size="sm" data-testid="canvas-run-all" isLoading={running} disabled={!canRun} onClick={onRunAll} leftIcon={<Play className="h-3.5 w-3.5" aria-hidden />}>
        {running ? "Running…" : "Run all"}
      </Button>
      <IconButton
        size="sm"
        data-testid="canvas-load-template"
        label="Load starter workflow"
        icon={<LayoutTemplate className="h-4 w-4" aria-hidden />}
        onClick={onLoadTemplate}
      />
      <IconButton size="sm" variant="danger" data-testid="canvas-clear" label="Clear the canvas" icon={<Trash2 className="h-4 w-4" aria-hidden />} onClick={onClear} />
    </div>

    <div data-canvas-ui className="glass absolute right-3 top-3 z-20 flex items-center gap-0.5 rounded-2xl border border-zinc-800/80 p-1.5 shadow-panel">
      <IconButton size="sm" data-testid="canvas-zoom-out" label="Zoom out" icon={<ZoomOut className="h-4 w-4" aria-hidden />} onClick={onZoomOut} />
      <span data-testid="canvas-zoom-label" className="min-w-[3.25rem] text-center font-mono text-xs font-semibold tabular-nums text-zinc-300">
        {Math.round(zoom * 100)}%
      </span>
      <IconButton size="sm" data-testid="canvas-zoom-in" label="Zoom in" icon={<ZoomIn className="h-4 w-4" aria-hidden />} onClick={onZoomIn} />
      <span className="mx-0.5 h-6 w-px bg-zinc-800" aria-hidden />
      <Button
        size="sm"
        variant="ghost"
        data-testid="canvas-zoom-reset"
        aria-label="Reset zoom and position"
        title="Reset zoom and position"
        onClick={onZoomReset}
        className="text-zinc-300 hover:text-white"
      >
        Reset
      </Button>
      <IconButton size="sm" data-testid="canvas-fit" label="Fit graph to view" icon={<Maximize2 className="h-4 w-4" aria-hidden />} onClick={onFit} />
    </div>
  </>
);

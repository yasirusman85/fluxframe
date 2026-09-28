/**
 * One node on the canvas: header (icon, editable title, delete), a body whose
 * controls depend on the node type, a live status area for generated output,
 * and the in/out ports used to draw connections.
 *
 * Positioning is world space — the parent layer applies the viewport
 * transform, so drag deltas are divided by `zoom`.
 */
import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Clapperboard, ExternalLink, Image as ImageIcon, Play, RefreshCw, Sparkles, Trash2, Type } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button, IconButton, ProgressBar, Select, Slider, Textarea } from "../ui";
import { useAsset } from "../../hooks/useAsset";
import { useProjectStore } from "../../store/project-store";
import { retryGeneration } from "../../lib/generation-runner";
import { CAMERA_PRESETS, IMAGE_MODELS, VIDEO_DURATIONS } from "../../lib/catalog";
import { cssAspect } from "../../lib/aspect";
import { NODE_LABELS, NODE_WIDTH, PORT_Y, useCanvasStore } from "../../features/canvas/canvas-store";
import type { CanvasNode, NodeType } from "../../features/canvas/canvas-store";
import type { GenerationProject, MediaKind } from "../../types/project";
import { cn } from "../../lib/cn";

const NODE_ICONS: Record<NodeType, LucideIcon> = { prompt: Sparkles, text: Type, image: ImageIcon, motion: Clapperboard };

const MODEL_OPTIONS = IMAGE_MODELS.map((model) => ({ value: model.id, label: `${model.name} · ${model.creditCost} cr` }));
const RATIO_OPTIONS = [
  { value: "16:9", label: "16:9 · Landscape" },
  { value: "9:16", label: "9:16 · Portrait" },
  { value: "1:1", label: "1:1 · Square" },
];
const PRESET_OPTIONS = CAMERA_PRESETS.map((preset) => ({ value: preset.id, label: preset.name }));
const DURATION_OPTIONS = VIDEO_DURATIONS.map((seconds) => ({ value: String(seconds), label: `${seconds} seconds` }));

/** Half of the 14px port circle, so ports sit centred on the node edge at PORT_Y. */
const PORT_OFFSET = 7;

interface DragSession {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

const NodeOutput: React.FC<{ project: GenerationProject; kind: MediaKind }> = ({ project, kind }) => {
  const { url } = useAsset(project.outputAssetId, project.outputUrl);
  if (!url) return <div className="skeleton h-full w-full" />;
  return kind === "image" ? (
    <img data-testid="node-output-image" src={url} alt={project.title} className="h-full w-full object-cover" draggable={false} />
  ) : (
    <video data-testid="node-output-video" src={url} muted loop autoPlay playsInline className="h-full w-full object-cover" />
  );
};

const NodeStatus: React.FC<{ project?: GenerationProject; kind: MediaKind; ratio: string; placeholder: string }> = ({ project, kind, ratio, placeholder }) => (
  <div className="overflow-hidden rounded-xl border border-zinc-800 bg-surface-2/50" style={{ aspectRatio: cssAspect(ratio) }}>
    {!project || project.status === "cancelled" ? (
      <p className="flex h-full items-center justify-center px-3 text-center text-[11px] leading-relaxed text-zinc-400">{placeholder}</p>
    ) : project.status === "completed" ? (
      <NodeOutput project={project} kind={kind} />
    ) : project.status === "failed" ? (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
        <AlertCircle className="h-4 w-4 text-rose-400" aria-hidden />
        <p className="line-clamp-3 text-[11px] leading-relaxed text-rose-200">{project.errorMessage ?? "Generation failed."}</p>
        <Button
          size="sm"
          variant="secondary"
          data-testid="node-retry"
          leftIcon={<RefreshCw className="h-3 w-3" aria-hidden />}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => void retryGeneration(project.id)}
        >
          Retry
        </Button>
      </div>
    ) : (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
        <ProgressBar
          value={project.progress}
          indeterminate={project.status === "queued"}
          size="sm"
          label={`${project.title} progress`}
          className="max-w-[180px]"
        />
        <p className="text-[11px] text-zinc-400" aria-live="polite">
          {project.stageMessage ?? "Rendering…"}
        </p>
      </div>
    )}
  </div>
);

export interface NodeCardProps {
  node: CanvasNode;
  selected: boolean;
  /** Current viewport zoom; drag deltas are divided by it. */
  zoom: number;
  /** This node is the one the runner is currently executing. */
  running: boolean;
  onRun: (nodeId: string) => void;
  /** Pointer went down on the output port — the page draws the draft connection. */
  onPortDown: (nodeId: string, event: React.PointerEvent<HTMLElement>) => void;
}

export const NodeCard: React.FC<NodeCardProps> = ({ node, selected, zoom, running, onRun, onPortDown }) => {
  const project = useProjectStore((s) => (node.data.projectId ? s.projects.find((candidate) => candidate.id === node.data.projectId) : undefined));
  const select = useCanvasStore((s) => s.select);
  const moveNode = useCanvasStore((s) => s.moveNode);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const updateNode = useCanvasStore((s) => s.updateNode);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(node.title);
  const drag = useRef<DragSession | null>(null);

  const Icon = NODE_ICONS[node.type];
  const isGenerator = node.type === "image" || node.type === "motion";
  const ratio = node.type === "motion" ? (project?.aspectRatio ?? "16:9") : (node.data.aspectRatio ?? "16:9");

  const stopPointer = (event: React.PointerEvent) => event.stopPropagation();

  const onHeaderPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest("button, input, textarea, select")) return;
    event.stopPropagation();
    select(node.id);
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: node.x, originY: node.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onHeaderPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const session = drag.current;
    if (!session || session.pointerId !== event.pointerId) return;
    moveNode(node.id, session.originX + (event.clientX - session.startX) / zoom, session.originY + (event.clientY - session.startY) / zoom);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const startEditing = () => {
    setTitleDraft(node.title);
    setEditingTitle(true);
  };

  const commitTitle = () => {
    const clean = titleDraft.trim();
    if (clean && clean !== node.title) updateNode(node.id, { title: clean.slice(0, 40) });
    setEditingTitle(false);
  };

  return (
    <div
      data-testid="canvas-node"
      data-canvas-node
      data-node-type={node.type}
      data-node-id={node.id}
      style={{ left: node.x, top: node.y, width: NODE_WIDTH }}
      onPointerDown={() => {
        if (!selected) select(node.id);
      }}
      className={cn(
        "absolute rounded-2xl border bg-surface-1/95 shadow-panel transition-colors",
        selected ? "border-brand-500/70 ring-2 ring-brand-500/40" : "border-zinc-800 hover:border-zinc-700",
      )}
    >
      {/* Header — drag handle */}
      <div
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="flex cursor-grab touch-none items-center gap-2 rounded-t-2xl border-b border-zinc-800 bg-surface-2/70 px-3 py-2 active:cursor-grabbing"
      >
        <Icon className="h-4 w-4 shrink-0 text-brand-400" aria-hidden />
        {editingTitle ? (
          <input
            aria-label="Node title"
            autoFocus
            value={titleDraft}
            maxLength={40}
            onPointerDown={stopPointer}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitTitle();
              } else if (event.key === "Escape") {
                event.preventDefault();
                setEditingTitle(false);
              }
            }}
            className="min-w-0 flex-1 rounded-md border border-brand-500/60 bg-surface-0 px-1.5 py-0.5 text-xs font-semibold text-zinc-100 focus:outline-none"
          />
        ) : (
          <h3 className="min-w-0 flex-1 truncate text-xs font-semibold text-zinc-100" onDoubleClick={startEditing} title="Double-click to rename">
            {node.title}
          </h3>
        )}
        <span className="shrink-0 rounded-md border border-zinc-700/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          {NODE_LABELS[node.type]}
        </span>
        <IconButton
          size="sm"
          variant="danger"
          data-testid="node-delete"
          label={`Delete ${node.title} node`}
          icon={<Trash2 className="h-3.5 w-3.5" aria-hidden />}
          onPointerDown={stopPointer}
          onClick={() => removeNode(node.id)}
        />
      </div>

      {/* Body */}
      <div className="space-y-2.5 p-3" onPointerDown={stopPointer}>
        {node.type === "prompt" && (
          <Textarea
            label="Prompt"
            testId="node-prompt-input"
            rows={4}
            maxLength={600}
            value={node.data.prompt ?? ""}
            placeholder="Neon-lit alley in the rain, cinematic"
            onChange={(event) => updateNodeData(node.id, { prompt: event.target.value })}
          />
        )}

        {node.type === "text" && (
          <Textarea
            label="Text"
            testId="node-text-input"
            rows={4}
            maxLength={600}
            value={node.data.text ?? ""}
            placeholder="Style notes appended to the prompt downstream"
            onChange={(event) => updateNodeData(node.id, { text: event.target.value })}
          />
        )}

        {node.type === "image" && (
          <>
            <Select
              label="Engine"
              size="sm"
              testId="node-model-select"
              value={node.data.model ?? "flux-realism-v2"}
              options={MODEL_OPTIONS}
              onChange={(model) => updateNodeData(node.id, { model })}
            />
            <Select
              label="Aspect ratio"
              size="sm"
              testId="node-ratio-select"
              value={node.data.aspectRatio ?? "16:9"}
              options={RATIO_OPTIONS}
              onChange={(aspectRatio) => updateNodeData(node.id, { aspectRatio })}
            />
            <NodeStatus project={project} kind="image" ratio={ratio} placeholder="Connect a prompt and run this node to render an image." />
          </>
        )}

        {node.type === "motion" && (
          <>
            <Select
              label="Camera preset"
              size="sm"
              testId="node-preset-select"
              value={node.data.cameraPreset ?? "dolly-in"}
              options={PRESET_OPTIONS}
              onChange={(cameraPreset) => updateNodeData(node.id, { cameraPreset })}
            />
            <Select
              label="Duration"
              size="sm"
              testId="node-duration-select"
              value={String(node.data.duration ?? 3)}
              options={DURATION_OPTIONS}
              onChange={(value) => updateNodeData(node.id, { duration: Number(value) })}
            />
            <Slider
              label="Motion strength"
              testId="node-strength-slider"
              min={1}
              max={10}
              value={node.data.motionStrength ?? 6}
              onChange={(motionStrength) => updateNodeData(node.id, { motionStrength })}
            />
            <NodeStatus project={project} kind="video" ratio={ratio} placeholder="Connect a completed image node, then run to render a clip." />
          </>
        )}

        {isGenerator && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              fullWidth
              data-testid="node-run"
              isLoading={running}
              leftIcon={<Play className="h-3.5 w-3.5" aria-hidden />}
              onClick={() => onRun(node.id)}
            >
              {running ? "Running…" : "Run"}
            </Button>
            {project?.status === "completed" && (
              <Link
                to={`/projects/${project.id}`}
                data-testid="node-open"
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-zinc-700 px-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800/60"
              >
                Open
                <ExternalLink className="h-3 w-3" aria-hidden />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Ports */}
      {(node.type === "image" || node.type === "motion") && (
        <button
          type="button"
          role="button"
          data-testid="node-port-in"
          data-canvas-hit
          data-node-id={node.id}
          aria-label={`Input port of the ${node.title} node`}
          title="Drop a connection here"
          onPointerDown={stopPointer}
          style={{ left: -PORT_OFFSET, top: PORT_Y - PORT_OFFSET }}
          className="absolute h-3.5 w-3.5 rounded-full border-2 border-brand-400 bg-surface-0 transition-colors after:absolute after:-inset-2 after:content-[''] hover:bg-brand-400"
        />
      )}
      {node.type !== "motion" && (
        <button
          type="button"
          role="button"
          data-testid="node-port-out"
          data-canvas-hit
          data-node-id={node.id}
          aria-label={`Output port of the ${node.title} node — drag to an input port to connect`}
          title="Drag to an input port to connect"
          onPointerDown={(event) => {
            event.stopPropagation();
            onPortDown(node.id, event);
          }}
          style={{ right: -PORT_OFFSET, top: PORT_Y - PORT_OFFSET }}
          className="absolute h-3.5 w-3.5 cursor-crosshair rounded-full border-2 border-brand-400 bg-surface-0 transition-colors after:absolute after:-inset-2 after:content-[''] hover:bg-brand-400"
        />
      )}
    </div>
  );
};

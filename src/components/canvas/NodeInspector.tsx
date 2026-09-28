/**
 * Right-hand inspector for the selected node: a keyboard-friendly copy of the
 * node's settings plus provenance for whatever it generated.
 */
import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink, PanelRightClose, PanelRightOpen, Settings2, Trash2 } from "lucide-react";
import { Button, IconButton, Input, Select, Slider, Textarea } from "../ui";
import { ProviderBadge } from "../media/ProviderBadge";
import { useProjectStore } from "../../store/project-store";
import { CAMERA_PRESETS, IMAGE_MODELS, VIDEO_DURATIONS } from "../../lib/catalog";
import { remixUrl } from "../../lib/query-params";
import { NODE_LABELS, useCanvasStore } from "../../features/canvas/canvas-store";
import type { CanvasNode } from "../../features/canvas/canvas-store";

const MODEL_OPTIONS = IMAGE_MODELS.map((model) => ({ value: model.id, label: `${model.name} · ${model.creditCost} cr` }));
const RATIO_OPTIONS = [
  { value: "16:9", label: "16:9 · Landscape" },
  { value: "9:16", label: "9:16 · Portrait" },
  { value: "1:1", label: "1:1 · Square" },
];
const PRESET_OPTIONS = CAMERA_PRESETS.map((preset) => ({ value: preset.id, label: `${preset.name} — ${preset.category}` }));
const DURATION_OPTIONS = VIDEO_DURATIONS.map((seconds) => ({ value: String(seconds), label: `${seconds} seconds` }));

export interface NodeInspectorProps {
  node?: CanvasNode;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({ node, collapsed, onToggleCollapsed }) => {
  const project = useProjectStore((s) => (node?.data.projectId ? s.projects.find((candidate) => candidate.id === node.data.projectId) : undefined));
  const updateNode = useCanvasStore((s) => s.updateNode);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const removeNode = useCanvasStore((s) => s.removeNode);

  if (collapsed) {
    return (
      <div data-canvas-ui className="absolute right-3 top-[4.25rem] z-20">
        <IconButton
          variant="secondary"
          data-testid="node-inspector-toggle"
          label="Show node inspector"
          icon={<PanelRightOpen className="h-4 w-4" aria-hidden />}
          onClick={onToggleCollapsed}
        />
      </div>
    );
  }

  return (
    <aside
      data-canvas-ui
      data-testid="node-inspector"
      aria-label="Node inspector"
      className="glass absolute bottom-3 right-3 top-[4.25rem] z-20 flex w-72 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-2xl border border-zinc-800/80 shadow-panel"
    >
      <div className="flex items-center gap-2 border-b border-zinc-800/80 px-3 py-2">
        <Settings2 className="h-4 w-4 shrink-0 text-brand-400" aria-hidden />
        <h2 className="min-w-0 flex-1 truncate text-xs font-bold uppercase tracking-wider text-zinc-200">
          {node ? `${NODE_LABELS[node.type]} node` : "Inspector"}
        </h2>
        <IconButton
          size="sm"
          data-testid="node-inspector-toggle"
          label="Hide node inspector"
          icon={<PanelRightClose className="h-4 w-4" aria-hidden />}
          onClick={onToggleCollapsed}
        />
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {!node ? (
          <p className="text-xs leading-relaxed text-zinc-400">
            Select a node to edit its settings here. Drag from a node&rsquo;s right dot to another node&rsquo;s left dot to chain them: prompt or text → image → motion.
          </p>
        ) : (
          <>
            <Input label="Title" value={node.title} maxLength={40} onChange={(event) => updateNode(node.id, { title: event.target.value })} />

            {node.type === "prompt" && (
              <Textarea
                label="Prompt"
                rows={5}
                maxLength={600}
                showCount
                value={node.data.prompt ?? ""}
                onChange={(event) => updateNodeData(node.id, { prompt: event.target.value })}
              />
            )}

            {node.type === "text" && (
              <Textarea
                label="Text"
                rows={5}
                maxLength={600}
                showCount
                value={node.data.text ?? ""}
                onChange={(event) => updateNodeData(node.id, { text: event.target.value })}
                hint="Appended to the prompt of the image node it feeds."
              />
            )}

            {node.type === "image" && (
              <>
                <Select label="Engine" value={node.data.model ?? "flux-realism-v2"} options={MODEL_OPTIONS} onChange={(model) => updateNodeData(node.id, { model })} />
                <Select
                  label="Aspect ratio"
                  value={node.data.aspectRatio ?? "16:9"}
                  options={RATIO_OPTIONS}
                  onChange={(aspectRatio) => updateNodeData(node.id, { aspectRatio })}
                />
                <Textarea
                  label="Extra prompt"
                  rows={3}
                  maxLength={400}
                  value={node.data.prompt ?? ""}
                  onChange={(event) => updateNodeData(node.id, { prompt: event.target.value })}
                  hint="Joined onto the prompt coming from upstream."
                />
              </>
            )}

            {node.type === "motion" && (
              <>
                <Select
                  label="Camera preset"
                  value={node.data.cameraPreset ?? "dolly-in"}
                  options={PRESET_OPTIONS}
                  onChange={(cameraPreset) => updateNodeData(node.id, { cameraPreset })}
                />
                <Select
                  label="Duration"
                  value={String(node.data.duration ?? 3)}
                  options={DURATION_OPTIONS}
                  onChange={(value) => updateNodeData(node.id, { duration: Number(value) })}
                />
                <Slider
                  label="Motion strength"
                  min={1}
                  max={10}
                  value={node.data.motionStrength ?? 6}
                  onChange={(motionStrength) => updateNodeData(node.id, { motionStrength })}
                  hint="How far the camera travels across the clip."
                />
              </>
            )}

            {project?.status === "completed" && (
              <div className="space-y-2 rounded-xl border border-zinc-800 bg-surface-2/50 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">Output</span>
                  <ProviderBadge source={project.providerSource} detail={project.providerDetail} size="sm" />
                </div>
                <p className="line-clamp-4 text-[11px] leading-relaxed text-zinc-400">{project.prompt}</p>
                <Link
                  to={remixUrl(project)}
                  data-testid="node-open-studio"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-300 transition-colors hover:text-brand-200"
                >
                  Open in studio
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </Link>
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              fullWidth
              data-testid="inspector-delete-node"
              leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden />}
              onClick={() => removeNode(node.id)}
            >
              Remove node
            </Button>
          </>
        )}
      </div>
    </aside>
  );
};

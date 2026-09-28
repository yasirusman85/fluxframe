import React from "react";
import { Camera, Copy, ImagePlus, Info, Megaphone, Mic, Tag } from "lucide-react";
import type { CameraMotionSettings, GenerationProject } from "../../types/project";
import { TYPE_LABELS } from "../../types/project";
import { Badge, Card, IconButton, SectionTitle } from "../../components/ui";
import { useAssetUrl } from "../../hooks/useAsset";
import { useUIStore } from "../../store/ui-store";
import { AD_FORMATS, AD_TEMPLATES, BRAND_TONES, CAMERA_PRESETS, describeCamera } from "../../lib/catalog";
import { formatDateTime } from "../../lib/format";
import { buildStudioUrl } from "../../lib/query-params";
import { cn } from "../../lib/cn";
import { LinkButton } from "./LinkButton";
import { PROVIDER_LABELS, excerpt, formatRenderTime, modelName } from "./library-utils";

type AxisKey = keyof Pick<CameraMotionSettings, "pan" | "tilt" | "zoom" | "dolly" | "orbit" | "roll">;

const CAMERA_AXES: Array<{ key: AxisKey; label: string; unit: string }> = [
  { key: "pan", label: "Pan", unit: "°" },
  { key: "tilt", label: "Tilt", unit: "°" },
  { key: "zoom", label: "Zoom", unit: "%" },
  { key: "dolly", label: "Dolly", unit: "%" },
  { key: "orbit", label: "Orbit", unit: "°" },
  { key: "roll", label: "Roll", unit: "°" },
];

interface Fact {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  copy?: string;
  testId?: string;
  wide?: boolean;
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const FactList: React.FC<{ facts: Fact[]; onCopy: (text: string, what: string) => void }> = ({ facts, onCopy }) => (
  <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
    {facts.map((fact) => (
      <div key={fact.label} className={cn("min-w-0", fact.wide && "col-span-2")}>
        <dt className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{fact.label}</dt>
        <dd className={cn("mt-0.5 flex min-w-0 items-center gap-1 text-sm text-zinc-200", fact.mono && "font-mono text-xs")} data-testid={fact.testId}>
          <span className="min-w-0 truncate">{fact.value}</span>
          {fact.copy && (
            <IconButton
              size="sm"
              label={`Copy ${fact.label.toLowerCase()}`}
              icon={<Copy className="h-3.5 w-3.5" />}
              className="h-6 w-6 shrink-0"
              onClick={() => onCopy(fact.copy ?? "", fact.label)}
            />
          )}
        </dd>
      </div>
    ))}
  </dl>
);

const KeyValue: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-start justify-between gap-3 text-xs">
    <span className="shrink-0 text-zinc-400">{label}</span>
    <span className="min-w-0 text-right text-zinc-200">{children}</span>
  </div>
);

export interface ProjectDetailsPanelProps {
  project: GenerationProject;
}

/** Sidebar with the prompt, fact grid and type-specific settings (camera / ad / lipsync / source image). */
export const ProjectDetailsPanel: React.FC<ProjectDetailsPanelProps> = ({ project }) => {
  const addToast = useUIStore((s) => s.addToast);
  const sourceId = project.sourceAssetId ?? project.keyframeAssetId;
  const sourceUrl = useAssetUrl(sourceId);

  const copyText = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast(`${what} copied`, { type: "success" });
    } catch {
      addToast(`Could not copy the ${what.toLowerCase()}. Select it manually instead.`, { type: "error" });
    }
  };
  const onCopy = (text: string, what: string) => void copyText(text, what);

  const camera = project.type === "video" || project.type === "cinema" ? project.cameraMotion : undefined;
  const preset = camera?.preset ? CAMERA_PRESETS.find((p) => p.id === camera.preset) : undefined;
  const marketing = project.marketing;
  const template = marketing ? AD_TEMPLATES.find((t) => t.id === marketing.template) : undefined;
  const tone = marketing ? BRAND_TONES.find((t) => t.id === marketing.tone) : undefined;
  const format = marketing ? AD_FORMATS.find((f) => f.ratio === marketing.format) : undefined;
  const lipsync = project.lipsync;
  const engine = project.providerDetail ?? (project.providerSource ? PROVIDER_LABELS[project.providerSource] : "—");
  const tags = (project.tags ?? []).filter(Boolean);

  const facts: Fact[] = [
    { label: "Type", value: TYPE_LABELS[project.type] },
    { label: "Model", value: modelName(project.model) },
    { label: "Engine", value: engine, wide: true },
    { label: "Ratio", value: project.aspectRatio },
    { label: "Resolution", value: project.width && project.height ? `${project.width}×${project.height}` : "—" },
    ...(project.mediaKind === "video" ? [{ label: "Duration", value: `${project.duration ?? "–"}s · ${project.fps ?? 30} fps` }] : []),
    { label: "Quality", value: capitalize(project.quality) },
    { label: "Seed", value: String(project.seed), mono: true, copy: String(project.seed), testId: "project-seed" },
    { label: "Credits", value: project.creditCost > 0 ? `${project.creditCost} credits` : "Free" },
    { label: "Created", value: formatDateTime(project.createdAt) },
    ...(project.completedAt ? [{ label: "Completed", value: formatDateTime(project.completedAt) }] : []),
    ...(typeof project.renderMs === "number" ? [{ label: "Render time", value: formatRenderTime(project.renderMs) }] : []),
    { label: "ID", value: project.id, mono: true, copy: project.id, testId: "project-id", wide: true },
  ];

  return (
    <Card className="space-y-5" data-testid="project-details">
      <SectionTitle icon={<Info />}>Details</SectionTitle>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Prompt</span>
          <IconButton size="sm" label="Copy prompt" icon={<Copy className="h-4 w-4" />} onClick={() => onCopy(project.prompt, "Prompt")} data-testid="project-copy-prompt" />
        </div>
        <p
          data-testid="project-prompt"
          className="whitespace-pre-wrap break-words rounded-xl border border-zinc-800 bg-surface-2 p-3 font-mono text-xs leading-relaxed text-zinc-200"
        >
          {project.prompt || "—"}
        </p>
        {project.negativePrompt && (
          <div className="space-y-1 pt-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Negative prompt</span>
            <p data-testid="project-negative-prompt" className="whitespace-pre-wrap break-words rounded-xl border border-zinc-800 bg-surface-2 p-3 font-mono text-xs leading-relaxed text-zinc-300">
              {project.negativePrompt}
            </p>
          </div>
        )}
      </div>

      <FactList facts={facts} onCopy={onCopy} />

      {camera && (
        <section data-testid="project-camera" className="space-y-3 border-t border-zinc-800/80 pt-4">
          <SectionTitle icon={<Camera />} hint={preset?.name ?? "Custom move"}>
            Camera
          </SectionTitle>
          <p className="text-xs text-zinc-200">{capitalize(describeCamera(camera))}</p>
          <dl className="grid grid-cols-3 gap-2">
            {CAMERA_AXES.map((axis) => (
              <div key={axis.key} className="rounded-lg border border-zinc-800 bg-surface-2 px-2 py-1.5">
                <dt className="text-[10px] uppercase tracking-wider text-zinc-400">{axis.label}</dt>
                <dd className="font-mono text-xs text-zinc-100 tabular-nums">
                  {camera[axis.key] > 0 ? "+" : ""}
                  {camera[axis.key]}
                  {axis.unit}
                </dd>
              </div>
            ))}
          </dl>
          <div className="space-y-1">
            <KeyValue label="Lens">
              {camera.focalLength} · {camera.aperture}
            </KeyValue>
            {typeof project.motionStrength === "number" && <KeyValue label="Motion strength">{project.motionStrength} / 10</KeyValue>}
          </div>
        </section>
      )}

      {marketing && (
        <section data-testid="project-marketing" className="space-y-2 border-t border-zinc-800/80 pt-4">
          <SectionTitle icon={<Megaphone />} hint={format ? `${format.label} · ${format.ratio}` : marketing.format}>
            Ad
          </SectionTitle>
          <KeyValue label="Template">{template?.title ?? marketing.template}</KeyValue>
          <KeyValue label="Tone">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full border border-white/20" style={{ backgroundColor: marketing.accent }} aria-hidden />
              {tone?.label ?? marketing.tone}
            </span>
          </KeyValue>
          <KeyValue label="Product">{marketing.productName || "—"}</KeyValue>
          <KeyValue label="Headline">{marketing.headline || "—"}</KeyValue>
          {marketing.subheadline && <KeyValue label="Subheadline">{marketing.subheadline}</KeyValue>}
          <KeyValue label="Call to action">{marketing.cta || "—"}</KeyValue>
          {marketing.proof && <KeyValue label="Proof">{marketing.proof}</KeyValue>}
          {marketing.features && marketing.features.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {marketing.features.map((feature) => (
                <Badge key={feature} variant="neutral" size="sm">
                  {feature}
                </Badge>
              ))}
            </div>
          )}
        </section>
      )}

      {lipsync && (
        <section data-testid="project-lipsync" className="space-y-2 border-t border-zinc-800/80 pt-4">
          <SectionTitle icon={<Mic />} hint={lipsync.mode === "audio" ? "Audio-driven" : "Script-driven"}>
            LipSync
          </SectionTitle>
          <KeyValue label="Mode">{capitalize(lipsync.mode)}</KeyValue>
          {lipsync.script && (
            <p className="rounded-xl border border-zinc-800 bg-surface-2 p-2.5 text-xs italic leading-relaxed text-zinc-300">“{excerpt(lipsync.script)}”</p>
          )}
          {lipsync.voice && <KeyValue label="Voice">{lipsync.voice}</KeyValue>}
          <KeyValue label="Expression">{lipsync.expression}%</KeyValue>
          <KeyValue label="Mouth amplitude">{lipsync.amplitude}%</KeyValue>
          <KeyValue label="Captions">{lipsync.captions ? "On" : "Off"}</KeyValue>
          {lipsync.audioFileName && <KeyValue label="Audio file">{lipsync.audioFileName}</KeyValue>}
        </section>
      )}

      {sourceId && (
        <section data-testid="project-source" className="space-y-2 border-t border-zinc-800/80 pt-4">
          <SectionTitle icon={<ImagePlus />}>{project.sourceAssetId ? "Uploaded input" : "Generated keyframe"}</SectionTitle>
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-surface-2">
              {sourceUrl ? <img src={sourceUrl} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5 text-zinc-400" aria-hidden />}
            </div>
            <div className="min-w-0 space-y-1.5">
              <p className="text-xs text-zinc-400">{project.sourceAssetId ? "The image you supplied for this generation." : "The keyframe the motion engine animated."}</p>
              <LinkButton to={buildStudioUrl("/create/cinema", { source: sourceId })} variant="outline" size="sm" leftIcon={<Camera />} testId="project-reuse-source">
                Reuse as keyframe
              </LinkButton>
            </div>
          </div>
        </section>
      )}

      {tags.length > 0 && (
        <section data-testid="project-tags" className="space-y-2 border-t border-zinc-800/80 pt-4">
          <SectionTitle icon={<Tag />}>Tags</SectionTitle>
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Badge key={tag} variant="outline" size="sm">
                {tag}
              </Badge>
            ))}
          </div>
        </section>
      )}
    </Card>
  );
};

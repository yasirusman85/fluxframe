/** Small presentational helpers shared by the media/generation components. */
import type { GenerationProject } from "../../types/project";
import { findModel } from "../../lib/catalog";
import { cssAspect, parseRatio } from "../../lib/aspect";

const ENGINE_LABELS: Record<string, string> = {
  "ad-engine": "Ad engine",
  "motion-engine": "Motion engine",
  "lipsync-engine": "LipSync engine",
};

/** Human-readable model name ("Flux Realism v2"), falling back to the raw id. */
export function modelLabel(modelId: string): string {
  return findModel(modelId)?.name ?? ENGINE_LABELS[modelId] ?? modelId;
}

/** "Flux Realism v2 · 16:9 · 5s" */
export function projectMeta(project: GenerationProject): string {
  const parts = [modelLabel(project.model), project.aspectRatio];
  if (project.mediaKind === "video" && project.duration) parts.push(`${project.duration}s`);
  return parts.join(" · ");
}

/** Aspect used by grid cards: tall ratios are capped to 4:5 so rows stay even. */
export function gridAspect(ratio: string): string {
  return parseRatio(ratio) < 0.8 ? "4 / 5" : cssAspect(ratio);
}

export function isInFlight(project: Pick<GenerationProject, "status">): boolean {
  return project.status === "queued" || project.status === "processing";
}

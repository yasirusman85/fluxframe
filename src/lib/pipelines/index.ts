/**
 * Pipeline contract. A pipeline takes a queued project and produces its
 * output. Pipelines are loaded lazily so the video engines are only
 * downloaded when a video studio is used.
 */
import type { GenerationProject, GenerationType, ProviderSource } from "../../types/project";

export interface PipelineContext {
  project: GenerationProject;
  signal: AbortSignal;
  /** progress 0..100 plus a human-readable stage message shown in the queue panel. */
  report: (progress: number, stage: string) => void;
}

export interface PipelineOutput {
  outputAssetId?: string;
  /** Used instead of a stored blob for remote/data URLs (procedural fallback). */
  outputUrl?: string;
  outputMimeType: string;
  thumbnailAssetId?: string;
  thumbnailUrl?: string;
  keyframeAssetId?: string;
  providerSource: ProviderSource;
  providerDetail?: string;
  width: number;
  height: number;
  /** seconds, video only */
  duration?: number;
  fps?: number;
  renderMs?: number;
  /** Optional better title derived during generation. */
  title?: string;
}

export type Pipeline = (ctx: PipelineContext) => Promise<PipelineOutput>;

export async function getPipeline(type: GenerationType): Promise<Pipeline> {
  switch (type) {
    case "image":
      return (await import("./image")).imagePipeline;
    case "video":
    case "cinema":
      return (await import("./motion")).motionPipeline;
    case "lipsync":
      return (await import("./lipsync")).lipsyncPipeline;
    case "marketing":
      return (await import("./ad")).adPipeline;
    default: {
      const exhaustive: never = type;
      throw new Error(`No pipeline for type ${String(exhaustive)}`);
    }
  }
}

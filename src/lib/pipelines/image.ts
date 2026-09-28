/**
 * Text-to-image pipeline. Real images come from the public Pollinations
 * endpoint; when it is unavailable (rate limit, HTTP error, timeout) the
 * pipeline renders a clearly labelled procedural fallback instead of failing.
 * Aborts always propagate.
 */
import type { ProviderSource } from "../../types/project";
import { dimensionsFor } from "../aspect";
import { putAsset } from "../asset-store";
import { isAbortError, throwIfAborted } from "../async";
import { findModel } from "../catalog";
import { createThumbnail, proceduralRasterBlob } from "../image-utils";
import { PollinationsError, generateImage } from "../pollinations";
import type { Pipeline, PipelineContext } from "./index";

export interface KeyframeResult {
  blob: Blob;
  providerSource: ProviderSource;
  providerDetail: string;
  width: number;
  height: number;
}

/** Progress window (0..100) a keyframe generation reports into. */
export type ProgressRange = [from: number, to: number];

/** Appends the model's style suffix unless the prompt already carries it. */
export function composePrompt(prompt: string, styleSuffix?: string): string {
  const base = prompt.trim();
  if (!styleSuffix) return base;
  if (base.toLowerCase().includes(styleSuffix.toLowerCase())) return base;
  return base ? `${base}, ${styleSuffix}` : styleSuffix;
}

/**
 * Generates one image (Pollinations → procedural fallback) without storing it.
 * Reused by the motion, lipsync, ad and Creative App pipelines.
 */
export async function generateKeyframe(
  ctx: PipelineContext,
  prompt: string,
  ratio: string,
  seed: number,
  stagePrefix?: string,
  range: ProgressRange = [5, 70],
): Promise<KeyframeResult> {
  const [from, to] = range;
  const prefix = stagePrefix ? `${stagePrefix} · ` : "";
  const stage = (fraction: number, message: string) => ctx.report(from + (to - from) * fraction, `${prefix}${message}`);
  throwIfAborted(ctx.signal);

  const { width, height } = dimensionsFor(ratio, 1024);
  stage(0, "Composing prompt");
  let statusCount = 0;

  try {
    const result = await generateImage({
      prompt,
      negativePrompt: ctx.project.negativePrompt,
      width,
      height,
      seed,
      signal: ctx.signal,
      onStatus: (message) => stage(Math.min(0.85, 0.15 + 0.12 * statusCount++), message),
    });
    throwIfAborted(ctx.signal);
    stage(1, "Image received");
    return {
      blob: result.blob,
      providerSource: "pollinations",
      providerDetail: `Pollinations · ${result.elapsedMs} ms · seed ${seed}`,
      width,
      height,
    };
  } catch (err) {
    if (isAbortError(err) || ctx.signal.aborted) throw err;
    if (!(err instanceof PollinationsError)) throw err;
    stage(0.85, "Endpoint unavailable — rendering procedural fallback");
    const blob = await proceduralRasterBlob(ctx.project.title, seed, ratio, width, height);
    throwIfAborted(ctx.signal);
    stage(1, "Procedural frame ready");
    return { blob, providerSource: "procedural", providerDetail: err.message, width, height };
  }
}

export const imagePipeline: Pipeline = async (ctx) => {
  const { project } = ctx;
  const model = findModel(project.model);
  const prompt = composePrompt(project.prompt, model?.styleSuffix);

  const keyframe = await generateKeyframe(ctx, prompt, project.aspectRatio, project.seed, undefined, [4, 82]);
  throwIfAborted(ctx.signal);

  ctx.report(86, "Storing output");
  const outputAssetId = await putAsset(keyframe.blob, "image", { width: keyframe.width, height: keyframe.height });

  ctx.report(93, "Creating thumbnail");
  let thumbnailAssetId: string | undefined;
  try {
    thumbnailAssetId = await putAsset(await createThumbnail(keyframe.blob), "image");
  } catch {
    // A missing thumbnail only degrades the grid; the full image is still stored.
  }
  throwIfAborted(ctx.signal);

  return {
    outputAssetId,
    outputMimeType: keyframe.blob.type || "image/jpeg",
    thumbnailAssetId,
    providerSource: keyframe.providerSource,
    providerDetail: keyframe.providerDetail,
    width: keyframe.width,
    height: keyframe.height,
  };
};

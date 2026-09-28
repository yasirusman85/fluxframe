/**
 * Video + Cinema pipeline: uploaded keyframe (or an AI keyframe generated
 * from the prompt and camera description) → in-browser camera-motion clip.
 */
import { videoDimensionsFor } from "../aspect";
import { getAsset, putAsset } from "../asset-store";
import { throwIfAborted } from "../async";
import { DEFAULT_CAMERA, IMAGE_MODELS, VIDEO_FPS, describeCamera, findModel } from "../catalog";
import { createThumbnail } from "../image-utils";
import { isVideoRenderingSupported } from "../render/canvas-recorder";
import { loadImageSource, renderMotionVideo } from "../render/motion";
import { generateKeyframe } from "./image";
import type { Pipeline, PipelineContext } from "./index";

export const VIDEO_UNSUPPORTED_MESSAGE = "This browser cannot record video. Use Chrome, Edge or Firefox.";
export const KEYFRAME_STYLE_MODEL = "studio-cinema-xl";

export interface SourceImage {
  blob: Blob;
  /** Set when the source was generated rather than uploaded. */
  keyframeAssetId?: string;
  /** Human label for provider transparency ("uploaded image", "Pollinations", "procedural fallback"). */
  label: string;
}

/** Resolves the uploaded source image, or generates and stores a keyframe from `prompt`. */
export async function resolveSourceImage(ctx: PipelineContext, prompt: string, ratio: string, stagePrefix: string, range: [number, number]): Promise<SourceImage> {
  const { project } = ctx;
  if (project.sourceAssetId) {
    ctx.report(range[0], "Loading source image");
    const asset = await getAsset(project.sourceAssetId);
    if (!asset) throw new Error("The source image is no longer available. Upload it again.");
    return { blob: asset.blob, label: "uploaded image" };
  }
  const keyframe = await generateKeyframe(ctx, prompt, ratio, project.seed, stagePrefix, range);
  ctx.report(range[1], "Storing keyframe");
  const keyframeAssetId = await putAsset(keyframe.blob, "image", { width: keyframe.width, height: keyframe.height });
  return { blob: keyframe.blob, keyframeAssetId, label: keyframe.providerSource === "pollinations" ? "Pollinations" : "procedural fallback" };
}

/** Maps renderer progress (0..1) onto a report window with frame-count stage copy. */
export function renderProgressReporter(ctx: PipelineContext, from: number, to: number, totalFrames: number): (progress: number) => void {
  let lastFrame = -1;
  return (progress) => {
    const frame = Math.min(totalFrames, Math.round(progress * totalFrames));
    if (progress >= 1) {
      ctx.report(to, "Encoding video…");
      return;
    }
    if (frame === lastFrame) return;
    lastFrame = frame;
    ctx.report(from + (to - from) * progress, `Rendering frame ${frame} / ${totalFrames}`);
  };
}

export const motionPipeline: Pipeline = async (ctx) => {
  const { project } = ctx;
  if (!isVideoRenderingSupported()) throw new Error(VIDEO_UNSUPPORTED_MESSAGE);

  const camera = project.cameraMotion ?? DEFAULT_CAMERA;
  const model = findModel(project.model);
  const { width, height } = videoDimensionsFor(project.aspectRatio);
  const styleSuffix = IMAGE_MODELS.find((m) => m.id === KEYFRAME_STYLE_MODEL)?.styleSuffix;
  const keyframePrompt = [project.prompt.trim(), describeCamera(camera), styleSuffix].filter(Boolean).join(", ");

  const source = await resolveSourceImage(ctx, keyframePrompt, project.aspectRatio, "Keyframe", [4, 34]);
  throwIfAborted(ctx.signal);

  ctx.report(37, "Decoding keyframe");
  const image = await loadImageSource(source.blob);
  throwIfAborted(ctx.signal);

  const durationMs = (project.duration ?? 5) * 1000;
  const fps = project.fps ?? VIDEO_FPS;
  const totalFrames = Math.round((durationMs / 1000) * fps);
  ctx.report(40, `Rendering frame 0 / ${totalFrames}`);

  const result = await renderMotionVideo({
    image,
    width,
    height,
    durationMs,
    camera,
    motionStrength: project.motionStrength ?? 6,
    look: model?.look,
    speedRamp: project.model === "hailuo-2-3-motion",
    fps,
    signal: ctx.signal,
    onProgress: renderProgressReporter(ctx, 40, 95, totalFrames),
  });
  throwIfAborted(ctx.signal);

  ctx.report(96, "Storing output");
  const outputAssetId = await putAsset(result.blob, "video", { width, height, durationMs });
  let thumbnailAssetId: string | undefined;
  try {
    thumbnailAssetId = await putAsset(await createThumbnail(source.blob), "image");
  } catch {
    // Thumbnail is optional.
  }

  return {
    outputAssetId,
    outputMimeType: result.mimeType,
    thumbnailAssetId,
    keyframeAssetId: source.keyframeAssetId,
    width,
    height,
    duration: durationMs / 1000,
    fps,
    providerSource: "motion-engine",
    providerDetail: `Motion engine · ${result.extension.toUpperCase()} ${width}×${height} · keyframe via ${source.label}`,
    renderMs: result.renderMs,
  };
};

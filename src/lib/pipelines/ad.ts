/**
 * Marketing pipeline: packshot (uploaded or generated) → multi-scene ad clip
 * rendered from the selected template, tone colours and copy.
 */
import { videoDimensionsFor } from "../aspect";
import { putAsset } from "../asset-store";
import { throwIfAborted } from "../async";
import { AD_TEMPLATES, VIDEO_FPS } from "../catalog";
import { createThumbnail } from "../image-utils";
import { adDurationMs, renderAdVideo, type AdScene } from "../render/ad";
import { isVideoRenderingSupported } from "../render/canvas-recorder";
import { loadImageSource } from "../render/motion";
import type { Pipeline } from "./index";
import { VIDEO_UNSUPPORTED_MESSAGE, renderProgressReporter, resolveSourceImage } from "./motion";

export function packshotPrompt(productName: string): string {
  return `${productName.trim() || "product"} product, studio product photography, softbox lighting, clean background, commercial quality`;
}

export const adPipeline: Pipeline = async (ctx) => {
  const { project } = ctx;
  if (!isVideoRenderingSupported()) throw new Error(VIDEO_UNSUPPORTED_MESSAGE);
  const marketing = project.marketing;
  if (!marketing) throw new Error("This ad has no marketing settings. Open the Marketing Studio and set up the product first.");

  const template = AD_TEMPLATES.find((t) => t.id === marketing.template) ?? AD_TEMPLATES[0];
  const format = marketing.format || project.aspectRatio;
  const { width, height } = videoDimensionsFor(format);
  const productName = marketing.productName?.trim() || project.title;
  const fps = project.fps ?? VIDEO_FPS;

  const source = await resolveSourceImage(ctx, packshotPrompt(productName), "1:1", "Packshot", [4, 34]);
  throwIfAborted(ctx.signal);

  ctx.report(37, "Decoding packshot");
  const packshot = await loadImageSource(source.blob);
  throwIfAborted(ctx.signal);

  const scenes: AdScene[] = template.scenes.map((scene) => ({ kind: scene.kind, durationMs: scene.durationMs, motion: scene.motion }));
  const durationMs = adDurationMs(scenes);
  const totalFrames = Math.round((durationMs / 1000) * fps);
  ctx.report(40, `Rendering frame 0 / ${totalFrames}`);

  const result = await renderAdVideo({
    packshot,
    width,
    height,
    scenes,
    settings: { ...marketing, productName },
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
    duration: Math.round(durationMs / 100) / 10,
    fps,
    providerSource: "ad-engine",
    providerDetail: `Ad engine · ${template.title} · ${scenes.length} scenes · packshot via ${source.label}`,
    renderMs: result.renderMs,
    title: `${productName} · ${template.title}`,
  };
};

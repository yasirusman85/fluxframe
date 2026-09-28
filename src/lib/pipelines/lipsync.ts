/**
 * LipSync pipeline: portrait (uploaded or generated) + envelope (decoded
 * audio or a synthetic script envelope) → talking-portrait clip. Uploaded
 * audio is muxed into the recording; script mode exports silent video.
 */
import { videoDimensionsFor } from "../aspect";
import { getAsset, putAsset } from "../asset-store";
import { throwIfAborted } from "../async";
import type { Envelope, RecordingAudio } from "../audio-utils";
import { MAX_AUDIO_SECONDS, computeEnvelope, createRecordingAudio, decodeAudio, envelopeFromScript } from "../audio-utils";
import { IMAGE_MODELS, VIDEO_FPS, findModel } from "../catalog";
import { createThumbnail } from "../image-utils";
import { isVideoRenderingSupported } from "../render/canvas-recorder";
import { renderLipsyncVideo } from "../render/lipsync";
import { loadImageSource } from "../render/motion";
import type { Pipeline } from "./index";
import { VIDEO_UNSUPPORTED_MESSAGE, renderProgressReporter, resolveSourceImage } from "./motion";

export const MAX_SCRIPT_SECONDS = 20;

/** Truncates an envelope (values + word timings) to `maxMs`. */
export function truncateEnvelope(envelope: Envelope, maxMs: number): Envelope {
  if (envelope.durationMs <= maxMs) return envelope;
  const frames = Math.max(1, Math.ceil((maxMs / 1000) * envelope.fps));
  return {
    values: envelope.values.slice(0, frames),
    fps: envelope.fps,
    durationMs: maxMs,
    words: envelope.words?.filter((w) => w.startMs < maxMs).map((w) => ({ ...w, endMs: Math.min(w.endMs, maxMs) })),
  };
}

export function portraitPrompt(description: string): string {
  const style = IMAGE_MODELS.find((m) => m.id === "flux-realism-v2")?.styleSuffix;
  const subject = description.trim() || "a person";
  return [`front-facing studio portrait of ${subject}`, "centred, neutral expression, soft light, looking at the camera", style].filter(Boolean).join(", ");
}

export const lipsyncPipeline: Pipeline = async (ctx) => {
  const { project } = ctx;
  if (!isVideoRenderingSupported()) throw new Error(VIDEO_UNSUPPORTED_MESSAGE);

  const settings = project.lipsync;
  const model = findModel(project.model);
  const fps = project.fps ?? VIDEO_FPS;
  const { width, height } = videoDimensionsFor(project.aspectRatio);

  const source = await resolveSourceImage(ctx, portraitPrompt(project.prompt), project.aspectRatio, "Portrait", [4, 28]);
  throwIfAborted(ctx.signal);

  let envelope: Envelope;
  let audio: RecordingAudio | undefined;
  let detail: string;
  if (project.audioAssetId) {
    ctx.report(30, "Loading audio");
    const asset = await getAsset(project.audioAssetId);
    if (!asset) throw new Error("The audio file is no longer available. Upload it again.");
    ctx.report(32, "Decoding audio");
    const buffer = await decodeAudio(asset.blob);
    throwIfAborted(ctx.signal);
    ctx.report(35, "Analysing audio envelope");
    envelope = computeEnvelope(buffer, fps, MAX_AUDIO_SECONDS);
    audio = await createRecordingAudio(buffer);
    detail = "audio-driven (uploaded file)";
  } else {
    const script = settings?.script?.trim() || project.prompt.trim();
    if (!script) throw new Error("Add a script or upload an audio file for the portrait to speak.");
    ctx.report(33, "Timing the script");
    envelope = truncateEnvelope(envelopeFromScript(script, fps), MAX_SCRIPT_SECONDS * 1000);
    detail = "script-driven (synthetic envelope, silent export)";
  }

  const durationSeconds = Math.max(1, Math.ceil(envelope.durationMs / 1000));
  const durationMs = durationSeconds * 1000;
  const totalFrames = durationSeconds * fps;

  ctx.report(37, "Decoding portrait");
  const image = await loadImageSource(source.blob);
  throwIfAborted(ctx.signal);
  ctx.report(40, `Rendering frame 0 / ${totalFrames}`);

  let result;
  try {
    result = await renderLipsyncVideo({
      image,
      width,
      height,
      durationMs,
      envelope,
      expression: settings?.expression ?? 60,
      amplitude: settings?.amplitude ?? 70,
      mouthX: settings?.mouthX,
      mouthY: settings?.mouthY,
      captions: settings?.captions ?? false,
      visualizer: settings?.visualizer ?? false,
      look: model?.look,
      fps,
      signal: ctx.signal,
      audioTracks: audio?.tracks,
      onStart: () => audio?.start(),
      onProgress: renderProgressReporter(ctx, 40, 95, totalFrames),
    });
  } finally {
    await audio?.stop();
  }
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
    duration: durationSeconds,
    fps,
    providerSource: "lipsync-engine",
    providerDetail: `LipSync engine · ${detail} · portrait via ${source.label}`,
    renderMs: result.renderMs,
  };
};

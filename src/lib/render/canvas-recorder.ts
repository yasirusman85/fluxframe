/**
 * Records a canvas animation into a real video file using
 * `canvas.captureStream()` + `MediaRecorder`. This is what turns the
 * "video" studios into producers of actual .webm/.mp4 output instead of
 * static placeholders.
 *
 * Frames are driven by wall-clock time so the recorded duration matches
 * the requested duration regardless of how fast `draw` is.
 */
import fixWebmDuration from "fix-webm-duration";
import { AbortError } from "../async";

export type DrawFrame = (ctx: CanvasRenderingContext2D, progress: number, timeMs: number, frame: number) => void;

export interface RenderOptions {
  width: number;
  height: number;
  durationMs: number;
  draw: DrawFrame;
  fps?: number;
  audioTracks?: MediaStreamTrack[];
  onProgress?: (progress: number, frame: number) => void;
  onStart?: () => void;
  signal?: AbortSignal;
  mimeType?: string;
  videoBitsPerSecond?: number;
}

export interface RenderResult {
  blob: Blob;
  mimeType: string;
  extension: "webm" | "mp4";
  width: number;
  height: number;
  durationMs: number;
  frames: number;
  renderMs: number;
}

const MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp8",
  "video/webm",
  "video/mp4;codecs=avc1,mp4a.40.2",
  "video/mp4",
];

export function pickVideoMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return undefined;
  return MIME_CANDIDATES.find((candidate) => MediaRecorder.isTypeSupported(candidate));
}

export function extensionForMime(mimeType: string): "webm" | "mp4" {
  return mimeType.includes("mp4") ? "mp4" : "webm";
}

export function isVideoRenderingSupported(): boolean {
  return (
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined" &&
    "captureStream" in HTMLCanvasElement.prototype &&
    !!pickVideoMimeType()
  );
}

export async function renderCanvasVideo(options: RenderOptions): Promise<RenderResult> {
  const { width, height, durationMs, draw, signal } = options;
  const fps = options.fps ?? 30;
  const mimeType = options.mimeType ?? pickVideoMimeType();
  if (!mimeType) throw new Error("This browser cannot record video (MediaRecorder unsupported).");
  if (signal?.aborted) throw new AbortError();

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas 2D not supported");

  const stream = canvas.captureStream(fps);
  for (const track of options.audioTracks ?? []) stream.addTrack(track);

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: options.videoBitsPerSecond ?? 6_000_000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };
  const stopped = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = (event) => reject((event as unknown as { error?: Error }).error ?? new Error("MediaRecorder error"));
  });

  // Paint the first frame before starting so the stream has content immediately.
  draw(ctx, 0, 0, 0);
  recorder.start(200);
  options.onStart?.();

  const started = performance.now();
  let frame = 0;
  const frameInterval = 1000 / fps;

  try {
    await new Promise<void>((resolve, reject) => {
      let timer = 0;
      const onAbort = () => {
        clearTimeout(timer);
        reject(new AbortError());
      };
      signal?.addEventListener("abort", onAbort, { once: true });

      const tick = () => {
        const elapsed = performance.now() - started;
        const progress = Math.min(1, elapsed / durationMs);
        frame += 1;
        draw(ctx, progress, elapsed, frame);
        options.onProgress?.(progress, frame);
        if (elapsed >= durationMs) {
          signal?.removeEventListener("abort", onAbort);
          resolve();
          return;
        }
        // setTimeout (not rAF) keeps rendering in background tabs and headless browsers.
        timer = window.setTimeout(tick, frameInterval);
      };
      timer = window.setTimeout(tick, frameInterval);
    });
  } catch (err) {
    try {
      if (recorder.state !== "inactive") recorder.stop();
    } catch {
      /* ignore */
    }
    stream.getTracks().forEach((track) => track.stop());
    throw err;
  }

  if (recorder.state !== "inactive") recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());

  let blob = new Blob(chunks, { type: mimeType });
  if (extensionForMime(mimeType) === "webm") {
    try {
      blob = await fixWebmDuration(blob, durationMs, { logger: false });
    } catch {
      /* the raw blob is still playable */
    }
  }

  return {
    blob,
    mimeType,
    extension: extensionForMime(mimeType),
    width,
    height,
    durationMs,
    frames: frame,
    renderMs: Math.round(performance.now() - started),
  };
}

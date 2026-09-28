/**
 * Camera-motion renderer: turns a single still image into a moving clip by
 * animating a 2D camera (pan/tilt/zoom/dolly/orbit/roll plus focal length
 * and aperture) over the image, adds a film look (grain, vignette, tint,
 * light leak, letterbox) and records the frames with MediaRecorder.
 *
 * `computeCameraTransform` is pure so it can be unit-tested and reused by
 * the live preview component and the ad renderer.
 */
import type { CameraMotionSettings } from "../../types/project";
import type { RenderLook } from "../catalog";
import { blobToImage } from "../image-utils";
import { renderCanvasVideo, type RenderResult } from "./canvas-recorder";
import { clamp, coverFit, createNoiseCanvases, createVignette, drawFade, drawGrain, drawLetterbox, drawLightLeak, drawTint, easeInOutSine } from "./drawing";

export interface ImageSource {
  source: CanvasImageSource;
  width: number;
  height: number;
}

export interface CameraTransform {
  scale: number;
  tx: number;
  ty: number;
  /** radians */
  rotation: number;
  /** Cover-fit overscan (>1) so pans, rolls and pull-backs never reveal the canvas edge. */
  overscan: number;
}

export interface FrameDrawer {
  draw: (ctx: CanvasRenderingContext2D, progress: number, timeMs: number, frame: number) => void;
}

export const DEFAULT_LOOK: RenderLook = { grain: 0.05, vignette: 0.4, letterbox: false, handheld: 0.3 };

/** Wide apertures darken the corners a little more; f/16 lifts them. */
const APERTURE_VIGNETTE: Record<string, number> = { "f/1.4": 0.25, "f/2.8": 0.15, "f/5.6": 0.05, "f/11": 0, "f/16": -0.1 };

/** Speed ramp: fast → slow → fast while staying monotonic (0 → 0, 1 → 1). */
export function speedRamp(t: number): number {
  return clamp(t + 0.12 * Math.sin(2 * Math.PI * t), 0, 1);
}

/** "35mm" → 35. Unknown strings fall back to 35. */
export function parseFocal(focal: string): number {
  const n = parseInt(focal, 10);
  return Number.isFinite(n) ? n : 35;
}

export interface CameraTransformOptions {
  /** 1..10, default 6. Scales the travel of every axis. */
  motionStrength?: number;
  /** 0..1 handheld micro-motion, default 0.3. */
  handheld?: number;
  /** Apply the fast → slow → fast speed ramp. */
  ramp?: boolean;
}

/**
 * Pure: camera settings + time → 2D transform for the image.
 * `progress` is 0..1 over the clip; `timeMs` drives the handheld micro-motion.
 */
export function computeCameraTransform(
  camera: CameraMotionSettings,
  progress: number,
  timeMs: number,
  width: number,
  height: number,
  options: CameraTransformOptions = {},
): CameraTransform {
  const k = clamp((options.motionStrength ?? 6) / 6, 0.1, 2);
  const p = options.ramp ? speedRamp(progress) : progress;
  const e = easeInOutSine(clamp(p, 0, 1));

  // Zoom and dolly both read as a scale change in 2D.
  const zoomAmount = (camera.zoom / 100) * 0.45 * k;
  const dollyAmount = (camera.dolly / 100) * 0.35 * k;
  const total = zoomAmount + dollyAmount;
  let scale = total >= 0 ? 1 + total * e : 1 + Math.abs(total) * (1 - e);

  // Pan right = the camera looks right, so the image travels left (positive → negative tx).
  const panFrac = (camera.pan / 90) * 0.22 * k;
  const tiltFrac = (camera.tilt / 90) * 0.22 * k;
  let tx = -panFrac * width * (e - 0.5);
  let ty = tiltFrac * height * (e - 0.5);

  // Orbit: a lateral arc with a slight rotation and a swell at the midpoint.
  const orbitFrac = (camera.orbit / 180) * k;
  let rotation = orbitFrac * 0.12 * (e - 0.5) * 2;
  tx += orbitFrac * width * 0.12 * Math.sin(e * Math.PI);
  scale *= 1 + Math.abs(orbitFrac) * 0.08 * Math.sin(e * Math.PI);

  // Dutch roll eases in over the clip.
  rotation += (camera.roll / 45) * 0.35 * k * e;

  const handheld = (options.handheld ?? 0.3) * k * 0.6;
  if (handheld > 0) {
    const t = timeMs / 1000;
    tx += (Math.sin(t * 1.7) * 3 + Math.sin(t * 3.1 + 1.3) * 1.5) * handheld;
    ty += (Math.cos(t * 1.3) * 2.5 + Math.sin(t * 2.7 + 0.4) * 1.2) * handheld;
    rotation += Math.sin(t * 0.9) * 0.003 * handheld;
  }

  // Longer lenses frame tighter (more overscan = a tighter crop of the source).
  const focalScale = 1 + clamp((parseFocal(camera.focalLength) - 18) / 117, 0, 1) * 0.28;
  const overscan =
    (1.25 +
      Math.abs(panFrac) +
      Math.abs(tiltFrac) +
      (total < 0 ? Math.abs(total) : 0) +
      Math.abs(orbitFrac) * 0.35 +
      (Math.abs(camera.roll) / 45) * 0.4 * k) *
    focalScale;

  return { scale, tx, ty, rotation, overscan };
}

/** Decodes a blob into a drawable image source. */
export async function loadImageSource(blob: Blob): Promise<ImageSource> {
  const img = await blobToImage(blob);
  return { source: img, width: img.naturalWidth || img.width || 1, height: img.naturalHeight || img.height || 1 };
}

export interface MotionDrawerOptions {
  image: ImageSource;
  width: number;
  height: number;
  durationMs: number;
  camera: CameraMotionSettings;
  /** 1..10, default 6 */
  motionStrength?: number;
  look?: RenderLook;
  speedRamp?: boolean;
  /** Skip grain/vignette/tint for cheap live previews. */
  lightweight?: boolean;
}

export function createMotionDrawer(options: MotionDrawerOptions): FrameDrawer {
  const { image, width, height, durationMs, camera } = options;
  const look = options.look ?? DEFAULT_LOOK;
  const lightweight = options.lightweight ?? false;
  const noise = lightweight || look.grain <= 0 ? [] : createNoiseCanvases(256, 4, 7);
  const vignetteStrength = clamp(look.vignette + (APERTURE_VIGNETTE[camera.aperture] ?? 0), 0, 0.9);
  const vignette = lightweight || vignetteStrength <= 0 ? null : createVignette(width, height, vignetteStrength);
  const filter = [look.saturation ? `saturate(${look.saturation})` : "", look.contrast ? `contrast(${look.contrast})` : ""].filter(Boolean).join(" ");
  const supportsFilter = typeof CanvasRenderingContext2D !== "undefined" && "filter" in CanvasRenderingContext2D.prototype;

  return {
    draw(ctx, progress, timeMs, frame) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);

      const t = computeCameraTransform(camera, progress, timeMs, width, height, {
        motionStrength: options.motionStrength,
        handheld: look.handheld,
        ramp: options.speedRamp,
      });
      const rect = coverFit(image.width, image.height, width, height, t.overscan);

      ctx.save();
      if (filter && supportsFilter) ctx.filter = filter;
      ctx.translate(width / 2 + t.tx, height / 2 + t.ty);
      ctx.rotate(t.rotation);
      ctx.scale(t.scale, t.scale);
      ctx.drawImage(image.source, rect.x - width / 2, rect.y - height / 2, rect.w, rect.h);
      ctx.restore();

      if (!lightweight) {
        if (look.lightLeak) drawLightLeak(ctx, width, height, progress);
        if (look.tint) drawTint(ctx, width, height, look.tint, look.tintAlpha ?? 0.08);
        drawGrain(ctx, noise, frame, look.grain, width, height);
        if (vignette) ctx.drawImage(vignette, 0, 0);
      }
      if (look.letterbox && width / height > 1.4) drawLetterbox(ctx, width, height);
      drawFade(ctx, width, height, timeMs, durationMs);
    },
  };
}

export interface MotionRenderOptions extends MotionDrawerOptions {
  fps?: number;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
  audioTracks?: MediaStreamTrack[];
}

export async function renderMotionVideo(options: MotionRenderOptions): Promise<RenderResult> {
  const drawer = createMotionDrawer(options);
  return renderCanvasVideo({
    width: options.width,
    height: options.height,
    durationMs: options.durationMs,
    fps: options.fps,
    draw: drawer.draw,
    onProgress: options.onProgress,
    signal: options.signal,
    audioTracks: options.audioTracks,
  });
}

/** Camera settings the ad renderer uses for its scene motions. */
export function cameraForMotion(kind: "push" | "pull" | "pan" | "orbit" | "static"): CameraMotionSettings {
  const base: CameraMotionSettings = { pan: 0, tilt: 0, zoom: 0, dolly: 0, orbit: 0, roll: 0, focalLength: "35mm", aperture: "f/5.6" };
  switch (kind) {
    case "push":
      return { ...base, zoom: 30, dolly: 20 };
    case "pull":
      return { ...base, zoom: -25, dolly: -10 };
    case "pan":
      return { ...base, pan: 30 };
    case "orbit":
      return { ...base, orbit: 60, zoom: 10 };
    default:
      return base;
  }
}

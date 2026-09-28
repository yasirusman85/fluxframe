/**
 * Multi-scene ad renderer: a packshot on a dark studio background with
 * drifting accent glows, per-scene camera motion, animated typography
 * (hook / feature / proof / cta) and story-style progress indicators.
 */
import type { MarketingSettings } from "../../types/project";
import type { AdSceneTemplate } from "../catalog";
import { renderCanvasVideo, type RenderResult } from "./canvas-recorder";
import { clamp, containFit, createVignette, drawFade, drawTextBlock, easeOutCubic, roundRect, wrapText, type Rect } from "./drawing";
import { cameraForMotion, computeCameraTransform, type CameraTransform, type FrameDrawer, type ImageSource } from "./motion";

export interface AdScene {
  kind: AdSceneTemplate["kind"];
  durationMs: number;
  motion: AdSceneTemplate["motion"];
}

export interface AdDrawerOptions {
  packshot: ImageSource;
  width: number;
  height: number;
  scenes: AdScene[];
  settings: MarketingSettings;
  /** Skip the vignette for live previews. */
  lightweight?: boolean;
}

export interface AdRenderOptions extends AdDrawerOptions {
  fps?: number;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

export const ENTRANCE_MS = 450;
export const CROSSFADE_MS = 350;
const FONT = "Inter, system-ui, sans-serif";
const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
const DARK_TEXT = "#0b0b0f";
const FALLBACK_ACCENT: Rgb = [16, 185, 129];

type Rgb = [number, number, number];
type Align = "left" | "center";

export function adDurationMs(scenes: AdScene[]): number {
  return scenes.reduce((sum, scene) => sum + Math.max(0, scene.durationMs), 0);
}

export function hexToRgb(hex: string | undefined, fallback: Rgb = FALLBACK_ACCENT): Rgb {
  if (!hex) return fallback;
  const raw = hex.trim().replace(/^#/, "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  if (!/^[0-9a-f]{6}$/i.test(full)) return fallback;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const rgba = (rgb: Rgb, alpha: number) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;

/** Hostname of a product URL for the small CTA caption ("" when unparseable). */
export function hostOf(url: string | undefined): string {
  if (!url?.trim()) return "";
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// ---- layout ------------------------------------------------------------------

interface Layout {
  kind: "portrait" | "landscape" | "square";
  packshot: Rect;
  text: Rect;
  align: Align;
}

export function layoutFor(width: number, height: number): Layout {
  const ratio = width / height;
  if (ratio < 0.8) {
    return {
      kind: "portrait",
      packshot: { x: width * 0.08, y: height * 0.07, w: width * 0.84, h: height * 0.51 },
      text: { x: width * 0.08, y: height * 0.62, w: width * 0.84, h: height * 0.32 },
      align: "center",
    };
  }
  if (ratio > 1.25) {
    return {
      kind: "landscape",
      packshot: { x: width * 0.05, y: height * 0.12, w: width * 0.43, h: height * 0.76 },
      text: { x: width * 0.53, y: height * 0.1, w: width * 0.42, h: height * 0.8 },
      align: "left",
    };
  }
  return {
    kind: "square",
    packshot: { x: width * 0.1, y: height * 0.06, w: width * 0.8, h: height * 0.48 },
    text: { x: width * 0.08, y: height * 0.6, w: width * 0.84, h: height * 0.34 },
    align: "center",
  };
}

// ---- scene timing ------------------------------------------------------------

interface SceneWindow {
  scene: AdScene;
  index: number;
  startMs: number;
  endMs: number;
  /** Text entrance starts before `startMs` so the crossfade overlaps the previous scene. */
  entranceMs: number;
}

export interface ActiveScene {
  scene: AdScene;
  index: number;
  /** Overall text alpha (entrance × exit). */
  alpha: number;
  /** 0..1 entrance progress (eased). */
  entrance: number;
  /** 0..1 progress within the scene, drives the camera. */
  local: number;
}

export function sceneWindows(scenes: AdScene[]): SceneWindow[] {
  let cursor = 0;
  return scenes.map((scene, index) => {
    const startMs = cursor;
    cursor += Math.max(0, scene.durationMs);
    return { scene, index, startMs, endMs: cursor, entranceMs: index === 0 ? 0 : Math.max(0, startMs - CROSSFADE_MS) };
  });
}

/** Scenes visible at `timeMs` (one, or two during a crossfade), in playback order. */
export function activeScenes(windows: SceneWindow[], timeMs: number): ActiveScene[] {
  const out: ActiveScene[] = [];
  for (const w of windows) {
    const isLast = w.index === windows.length - 1;
    if (timeMs < w.entranceMs) continue;
    if (!isLast && timeMs >= w.endMs) continue;
    const fadeIn = clamp((timeMs - w.entranceMs) / ENTRANCE_MS, 0, 1);
    const fadeOut = isLast ? 1 : clamp((w.endMs - timeMs) / CROSSFADE_MS, 0, 1);
    const entrance = easeOutCubic(fadeIn);
    const local = clamp((timeMs - w.startMs) / Math.max(1, w.endMs - w.startMs), 0, 1);
    out.push({ scene: w.scene, index: w.index, alpha: Math.min(entrance, fadeOut), entrance, local });
  }
  return out;
}

// ---- text blocks -------------------------------------------------------------

interface Block {
  h: number;
  draw: (y: number) => void;
}

interface BlockContext {
  ctx: CanvasRenderingContext2D;
  box: Rect;
  /** Scale reference (canvas height). */
  unit: number;
  align: Align;
  alpha: number;
  accent: string;
  accentRgb: Rgb;
}

function anchorX(b: BlockContext): number {
  return b.align === "center" ? b.box.x + b.box.w / 2 : b.box.x;
}

function textBlock(b: BlockContext, text: string, font: string, color: string, maxLines: number, alpha = b.alpha): Block {
  const { ctx } = b;
  ctx.save();
  ctx.font = font;
  const size = parseInt(font.match(/(\d+)px/)?.[1] ?? "24", 10);
  const lineHeight = Math.round(size * 1.18);
  const lines = Math.min(maxLines, wrapText(ctx, text, b.box.w).length);
  ctx.restore();
  return {
    h: lines * lineHeight,
    draw: (y) => drawTextBlock(ctx, { text, x: anchorX(b), y, maxWidth: b.box.w, font, color, align: b.align, lineHeight, maxLines, alpha }),
  };
}

function pillBlock(b: BlockContext, text: string, font: string, bg: string, color: string, padX: number, padY: number): Block {
  const { ctx } = b;
  ctx.save();
  ctx.font = font;
  const size = parseInt(font.match(/(\d+)px/)?.[1] ?? "16", 10);
  const w = Math.min(b.box.w, ctx.measureText(text).width + padX * 2);
  ctx.restore();
  const h = size + padY * 2;
  return {
    h,
    draw: (y) => {
      const x = b.align === "center" ? anchorX(b) - w / 2 : b.box.x;
      ctx.save();
      ctx.globalAlpha = b.alpha;
      ctx.font = font;
      ctx.fillStyle = bg;
      roundRect(ctx, x, y, w, h, h / 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x + w / 2, y + h / 2 + 1, w - padX * 2);
      ctx.restore();
    },
  };
}

function chipBlock(b: BlockContext, text: string): Block {
  const { ctx, unit } = b;
  const size = Math.round(unit * 0.03);
  const font = `600 ${size}px ${FONT}`;
  const icon = size * 1.1;
  const padX = size * 0.75;
  const padY = size * 0.45;
  ctx.save();
  ctx.font = font;
  const textW = Math.min(b.box.w - icon - padX * 3, ctx.measureText(text).width);
  ctx.restore();
  const w = textW + icon + padX * 3;
  const h = size + padY * 2;
  return {
    h,
    draw: (y) => {
      const x = b.align === "center" ? anchorX(b) - w / 2 : b.box.x;
      ctx.save();
      ctx.globalAlpha = b.alpha;
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      roundRect(ctx, x, y, w, h, h / 2);
      ctx.fill();
      // check mark disc
      const cx = x + padX + icon / 2;
      const cy = y + h / 2;
      ctx.fillStyle = b.accent;
      ctx.beginPath();
      ctx.arc(cx, cy, icon / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = DARK_TEXT;
      ctx.lineWidth = Math.max(1.5, icon * 0.14);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(cx - icon * 0.22, cy + icon * 0.02);
      ctx.lineTo(cx - icon * 0.05, cy + icon * 0.2);
      ctx.lineTo(cx + icon * 0.24, cy - icon * 0.18);
      ctx.stroke();
      ctx.font = font;
      ctx.fillStyle = "#f4f4f5";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x + padX * 2 + icon, cy + 1, textW);
      ctx.restore();
    },
  };
}

function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function starsBlock(b: BlockContext): Block {
  const { ctx, unit } = b;
  const size = unit * 0.045;
  const gap = size * 0.35;
  const w = size * 5 + gap * 4;
  return {
    h: size,
    draw: (y) => {
      const x0 = b.align === "center" ? anchorX(b) - w / 2 : b.box.x;
      ctx.save();
      ctx.globalAlpha = b.alpha;
      ctx.fillStyle = b.accent;
      ctx.shadowColor = rgba(b.accentRgb, 0.6);
      ctx.shadowBlur = size * 0.5;
      for (let i = 0; i < 5; i++) {
        starPath(ctx, x0 + size / 2 + i * (size + gap), y + size / 2, size / 2);
        ctx.fill();
      }
      ctx.restore();
    },
  };
}

function spacer(h: number): Block {
  return { h, draw: () => undefined };
}

/** Splits a sentence into up to three short phrases for feature chips. */
export function featurePhrases(settings: MarketingSettings): string[] {
  const explicit = (settings.features ?? []).map((f) => f.trim()).filter(Boolean);
  if (explicit.length) return explicit.slice(0, 3);
  const source = settings.subheadline?.trim() || settings.headline?.trim() || settings.productName?.trim() || "";
  const phrases = source
    .split(/[.,;:!?]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 1)
    .slice(0, 3);
  return phrases.length ? phrases : [source].filter(Boolean);
}

function sceneBlocks(b: BlockContext, kind: AdScene["kind"], settings: MarketingSettings): Block[] {
  const { unit } = b;
  const productName = settings.productName?.trim() || "";
  const gap = unit * 0.02;
  switch (kind) {
    case "hook": {
      const headline = settings.headline?.trim() || productName || "Introducing";
      const blocks: Block[] = [];
      if (productName) {
        blocks.push(pillBlock(b, productName.toUpperCase(), `700 ${Math.round(unit * 0.022)}px ${MONO}`, rgba(b.accentRgb, 0.18), b.accent, unit * 0.02, unit * 0.01));
        blocks.push(spacer(gap));
      }
      blocks.push(textBlock(b, headline, `800 ${Math.round(unit * 0.07)}px ${FONT}`, "#ffffff", 3));
      return blocks;
    }
    case "feature": {
      const sub = settings.subheadline?.trim() || settings.headline?.trim() || productName;
      const blocks: Block[] = [textBlock(b, sub, `700 ${Math.round(unit * 0.045)}px ${FONT}`, "#ffffff", 2), spacer(gap)];
      for (const phrase of featurePhrases(settings)) {
        blocks.push(chipBlock(b, phrase));
        blocks.push(spacer(unit * 0.012));
      }
      blocks.pop();
      return blocks;
    }
    case "proof": {
      const proof = settings.proof?.trim() || "Loved by thousands";
      return [starsBlock(b), spacer(gap), textBlock(b, proof, `600 ${Math.round(unit * 0.045)}px ${FONT}`, "#ffffff", 2)];
    }
    case "cta": {
      const cta = settings.cta?.trim() || "Learn more";
      const host = hostOf(settings.productUrl);
      const blocks: Block[] = [];
      if (productName) {
        blocks.push(textBlock(b, productName, `600 ${Math.round(unit * 0.032)}px ${FONT}`, "#e4e4e7", 1, b.alpha * 0.85));
        blocks.push(spacer(gap));
      }
      blocks.push(pillBlock(b, cta, `700 ${Math.round(unit * 0.038)}px ${FONT}`, b.accent, DARK_TEXT, unit * 0.045, unit * 0.02));
      if (host) {
        blocks.push(spacer(gap));
        blocks.push(textBlock(b, host, `500 ${Math.round(unit * 0.022)}px ${MONO}`, "#a1a1aa", 1, b.alpha * 0.7));
      }
      return blocks;
    }
    default:
      return [];
  }
}

// ---- drawing -----------------------------------------------------------------

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, timeMs: number, accent: Rgb, secondary: Rgb): void {
  const base = ctx.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, "#0b0b0f");
  base.addColorStop(1, "#141418");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  const t = timeMs / 1000;
  const glow = (x: number, y: number, r: number, rgb: Rgb, alpha: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(rgb, alpha));
    g.addColorStop(1, rgba(rgb, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  const r = Math.max(width, height);
  glow(width * (0.25 + 0.08 * Math.sin(t * 0.35)), height * (0.3 + 0.06 * Math.cos(t * 0.27)), r * 0.45, accent, 0.32);
  glow(width * (0.78 + 0.07 * Math.cos(t * 0.31 + 1)), height * (0.72 + 0.06 * Math.sin(t * 0.23 + 2)), r * 0.4, secondary, 0.26);
}

function drawPackshot(ctx: CanvasRenderingContext2D, packshot: ImageSource, box: Rect, t: CameraTransform, alpha: number): void {
  const fit = containFit(packshot.width, packshot.height, box.w, box.h);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const radius = Math.min(fit.w, fit.h) * 0.06;
  const x = cx - fit.w / 2;
  const y = cy - fit.h / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  // Card with a soft drop shadow behind the image.
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = Math.min(box.w, box.h) * 0.12;
  ctx.shadowOffsetY = box.h * 0.03;
  ctx.fillStyle = "#141419";
  roundRect(ctx, x, y, fit.w, fit.h, radius);
  ctx.fill();
  ctx.restore();
  // Camera move inside a rounded clip; scale clamped so the product is never cropped away.
  roundRect(ctx, x, y, fit.w, fit.h, radius);
  ctx.clip();
  const scale = clamp(t.scale, 0.9, 1.18);
  ctx.translate(cx + t.tx, cy + t.ty);
  ctx.rotate(t.rotation);
  ctx.scale(scale, scale);
  ctx.drawImage(packshot.source, -fit.w / 2, -fit.h / 2, fit.w, fit.h);
  ctx.restore();
}

function drawProgress(ctx: CanvasRenderingContext2D, layout: Layout, width: number, height: number, windows: SceneWindow[], timeMs: number, accent: string): void {
  ctx.save();
  if (layout.kind === "landscape") {
    const barH = Math.max(3, height * 0.006);
    const total = windows.length ? windows[windows.length - 1].endMs : 1;
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(0, height - barH, width, barH);
    ctx.fillStyle = accent;
    ctx.fillRect(0, height - barH, width * clamp(timeMs / total, 0, 1), barH);
  } else {
    const margin = width * 0.04;
    const gap = Math.max(4, width * 0.008);
    const segH = Math.max(3, height * 0.005);
    const y = height * 0.025;
    const segW = (width - margin * 2 - gap * (windows.length - 1)) / Math.max(1, windows.length);
    windows.forEach((w, i) => {
      const x = margin + i * (segW + gap);
      const fill = clamp((timeMs - w.startMs) / Math.max(1, w.endMs - w.startMs), 0, 1);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      roundRect(ctx, x, y, segW, segH, segH / 2);
      ctx.fill();
      if (fill > 0) {
        ctx.fillStyle = "#ffffff";
        roundRect(ctx, x, y, Math.max(segH, segW * fill), segH, segH / 2);
        ctx.fill();
      }
    });
  }
  ctx.restore();
}

export function createAdDrawer(options: AdDrawerOptions): FrameDrawer {
  const { packshot, width, height, settings } = options;
  const scenes = options.scenes.length ? options.scenes : [{ kind: "hook" as const, durationMs: 3000, motion: "push" as const }];
  const windows = sceneWindows(scenes);
  const durationMs = adDurationMs(scenes);
  const layout = layoutFor(width, height);
  const accentRgb = hexToRgb(settings.accent);
  const secondaryRgb = hexToRgb(settings.secondary, accentRgb);
  const accent = rgba(accentRgb, 1);
  const vignette = options.lightweight ? null : createVignette(width, height, 0.35);
  const slide = 24 * (Math.min(width, height) / 720);
  const cameras = new Map<AdScene["motion"], ReturnType<typeof cameraForMotion>>();
  const cameraFor = (motion: AdScene["motion"]) => {
    let camera = cameras.get(motion);
    if (!camera) {
      camera = cameraForMotion(motion);
      cameras.set(motion, camera);
    }
    return camera;
  };

  return {
    draw(ctx, _progress, timeMs) {
      drawBackground(ctx, width, height, timeMs, accentRgb, secondaryRgb);
      const active = activeScenes(windows, timeMs);

      // Packshot: outgoing scene at full alpha, incoming fades in over it.
      active.forEach((s, i) => {
        const transform = computeCameraTransform(cameraFor(s.scene.motion), s.local, timeMs, layout.packshot.w, layout.packshot.h, { motionStrength: 5, handheld: 0.15 });
        drawPackshot(ctx, packshot, layout.packshot, transform, i === 0 ? 1 : s.entrance);
      });

      // Typography: slide up + fade in, crossfade out.
      for (const s of active) {
        if (s.alpha <= 0.001) continue;
        const b: BlockContext = { ctx, box: layout.text, unit: height, align: layout.align, alpha: s.alpha, accent, accentRgb };
        const blocks = sceneBlocks(b, s.scene.kind, settings);
        const total = blocks.reduce((sum, block) => sum + block.h, 0);
        let y = layout.text.y + Math.max(0, (layout.text.h - total) / 2) + (1 - s.entrance) * slide;
        for (const block of blocks) {
          block.draw(y);
          y += block.h;
        }
      }

      drawProgress(ctx, layout, width, height, windows, timeMs, accent);
      if (vignette) ctx.drawImage(vignette, 0, 0);
      drawFade(ctx, width, height, timeMs, durationMs);
    },
  };
}

export async function renderAdVideo(options: AdRenderOptions): Promise<RenderResult> {
  const drawer = createAdDrawer(options);
  return renderCanvasVideo({
    width: options.width,
    height: options.height,
    durationMs: adDurationMs(options.scenes),
    fps: options.fps,
    draw: drawer.draw,
    onProgress: options.onProgress,
    signal: options.signal,
  });
}

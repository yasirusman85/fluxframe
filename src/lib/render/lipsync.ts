/**
 * Talking-portrait renderer. There is no face detection: the studio assumes
 * a centred, front-facing portrait and exposes mouth-position calibration
 * (mouthX/mouthY). Jaw, mouth interior, head bob and blinks are driven by
 * the audio (or script) envelope; karaoke captions and a visualiser are
 * optional. The jaw is a feathered, vertically stretched copy of the lower
 * face so the mouth "opens" without a visible seam.
 */
import type { Envelope, WordTiming } from "../audio-utils";
import { envelopeAt, wordAt } from "../audio-utils";
import type { RenderLook } from "../catalog";
import { renderCanvasVideo, type RenderResult } from "./canvas-recorder";
import { clamp, coverFit, createNoiseCanvases, createVignette, drawFade, drawGrain, drawTint, pseudoRandom, roundRect } from "./drawing";
import type { FrameDrawer, ImageSource } from "./motion";

export const DEFAULT_LIPSYNC_LOOK: RenderLook = { grain: 0.03, vignette: 0.35, letterbox: false, handheld: 0.15 };
export const DEFAULT_MOUTH = { x: 0.5, y: 0.63 } as const;
export const DEFAULT_ACCENT = "#34d399";

const BLINK_INTERVAL_MS = 3400;
const BLINK_MS = 120;
const CAPTION_WORDS_PER_LINE = 7;
const VISUALIZER_BARS = 40;
const FONT = "Inter, system-ui, sans-serif";

export interface LipsyncDrawerOptions {
  image: ImageSource;
  width: number;
  height: number;
  durationMs: number;
  envelope: Envelope;
  /** 0..100 facial expression intensity (head motion). */
  expression: number;
  /** 0..100 mouth amplitude. */
  amplitude: number;
  /** Normalised mouth centre, default 0.5. */
  mouthX?: number;
  /** Normalised mouth line, default 0.63. */
  mouthY?: number;
  /** Karaoke captions; needs `envelope.words` (script mode). */
  captions?: boolean;
  visualizer?: boolean;
  look?: RenderLook;
  /** Hex accent for captions and the visualiser. */
  accent?: string;
  /** Skip grain/vignette/tint for live previews. */
  lightweight?: boolean;
}

export interface LipsyncRenderOptions extends LipsyncDrawerOptions {
  fps?: number;
  onProgress?: (progress: number) => void;
  /** Fires the moment the recorder starts — start muxed audio here. */
  onStart?: () => void;
  signal?: AbortSignal;
  audioTracks?: MediaStreamTrack[];
}

interface HeadPose {
  tx: number;
  ty: number;
  scale: number;
  rotation: number;
}

interface JawLayer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  mask: CanvasGradient;
}

export interface CaptionLine {
  words: WordTiming[];
  startMs: number;
  endMs: number;
}

/** Groups word timings into caption lines of at most `perLine` words. */
export function buildCaptionLines(words: WordTiming[], perLine = CAPTION_WORDS_PER_LINE): CaptionLine[] {
  const lines: CaptionLine[] = [];
  for (let i = 0; i < words.length; i += perLine) {
    const chunk = words.slice(i, i + perLine);
    lines.push({ words: chunk, startMs: chunk[0].startMs, endMs: chunk[chunk.length - 1].endMs });
  }
  return lines;
}

/** Deterministic blink schedule: one blink per ~3.4 s window, jittered inside the window. */
export function blinkPhase(timeMs: number): number {
  const cycle = Math.floor(timeMs / BLINK_INTERVAL_MS);
  const start = cycle * BLINK_INTERVAL_MS + 300 + pseudoRandom(cycle + 7) * (BLINK_INTERVAL_MS - 600);
  return (timeMs - start) / BLINK_MS;
}

function createJawLayer(width: number, height: number, mouthX: number, mouthY: number): JawLayer | null {
  const rx = 0.17 * width;
  const ry = 0.15 * height;
  const cx = mouthX;
  const cy = mouthY + 0.07 * height;
  const x = Math.floor(cx - rx) - 1;
  const y = Math.floor(cy - ry) - 1;
  const w = Math.ceil(rx * 2) + 3;
  const h = Math.ceil(ry * 2) + 3;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // Unit-circle gradient; it is painted under a translate/scale so it becomes the feathered ellipse.
  const mask = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  mask.addColorStop(0, "rgba(0,0,0,1)");
  mask.addColorStop(0.6, "rgba(0,0,0,1)");
  mask.addColorStop(1, "rgba(0,0,0,0)");
  return { canvas, ctx, x, y, w, h, cx, cy, rx, ry, mask };
}

export function createLipsyncDrawer(options: LipsyncDrawerOptions): FrameDrawer {
  const { image, width, height, durationMs, envelope } = options;
  const look = options.look ?? DEFAULT_LIPSYNC_LOOK;
  const lightweight = options.lightweight ?? false;
  const expr = clamp(options.expression, 0, 100) / 100;
  const amp = clamp(options.amplitude, 0, 100) / 100;
  const mouthX = clamp(options.mouthX ?? DEFAULT_MOUTH.x, 0.05, 0.95) * width;
  const mouthY = clamp(options.mouthY ?? DEFAULT_MOUTH.y, 0.05, 0.95) * height;
  const accent = options.accent ?? DEFAULT_ACCENT;
  const handheld = look.handheld ?? 0;
  const rect = coverFit(image.width, image.height, width, height, 1.08);
  const noise = lightweight || look.grain <= 0 ? [] : createNoiseCanvases(256, 4, 11);
  const vignette = lightweight || look.vignette <= 0 ? null : createVignette(width, height, clamp(look.vignette, 0, 0.9));
  const jaw = createJawLayer(width, height, mouthX, mouthY);
  const captionLines = options.captions && envelope.words?.length ? buildCaptionLines(envelope.words) : [];
  const captionSize = Math.round(height * 0.045);
  const captionFont = `600 ${captionSize}px ${FONT}`;
  const captionWidths = new Map<CaptionLine, number[]>();

  let skin: string | null = null;
  let skinSampledAt = -1;
  let blinksDisabled = false;

  const drawHead = (target: CanvasRenderingContext2D, pose: HeadPose) => {
    target.save();
    target.translate(width / 2 + pose.tx, height / 2 + pose.ty);
    target.rotate(pose.rotation);
    target.scale(pose.scale, pose.scale);
    target.drawImage(image.source, rect.x - width / 2, rect.y - height / 2, rect.w, rect.h);
    target.restore();
  };

  /** Runs `fn` in canvas coordinates that follow the head pose. */
  const withHead = (ctx: CanvasRenderingContext2D, pose: HeadPose, fn: () => void) => {
    ctx.save();
    ctx.translate(width / 2 + pose.tx, height / 2 + pose.ty);
    ctx.rotate(pose.rotation);
    ctx.scale(pose.scale, pose.scale);
    ctx.translate(-width / 2, -height / 2);
    fn();
    ctx.restore();
  };

  const drawJaw = (ctx: CanvasRenderingContext2D, pose: HeadPose, shift: number) => {
    if (!jaw) return;
    const j = jaw.ctx;
    j.clearRect(0, 0, jaw.w, jaw.h);
    j.save();
    j.translate(-jaw.x, -jaw.y);
    // Vertical stretch anchored at the mouth line: the lower face descends, the upper lip barely moves.
    j.translate(0, mouthY);
    j.scale(1, 1 + shift / (0.25 * height));
    j.translate(0, -mouthY);
    drawHead(j, pose);
    j.restore();
    // Feathered elliptical mask so the displaced region blends into the untouched face.
    j.save();
    j.globalCompositeOperation = "destination-in";
    j.translate(jaw.cx - jaw.x, jaw.cy - jaw.y);
    j.scale(jaw.rx, jaw.ry);
    j.fillStyle = jaw.mask;
    j.fillRect(-1, -1, 2, 2);
    j.restore();
    ctx.drawImage(jaw.canvas, jaw.x, jaw.y);
  };

  const drawMouth = (ctx: CanvasRenderingContext2D, pose: HeadPose, env: number, shift: number) => {
    withHead(ctx, pose, () => {
      const rx = 0.042 * width * (0.55 + env * 0.6);
      const ry = Math.max(0.5, 0.02 * height * (0.15 + env * (0.4 + 0.6 * amp)));
      const cy = mouthY + 0.015 * height + shift * 0.2;
      const color = `rgba(20,8,10,${(0.25 + 0.5 * env * amp).toFixed(3)})`;
      ctx.save();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(mouthX, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Faint lip highlight just above the opening.
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${(0.05 + 0.07 * env).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, height * 0.0015);
      ctx.beginPath();
      ctx.ellipse(mouthX, cy - ry - height * 0.004, rx * 0.9, Math.max(0.5, height * 0.003), 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  };

  const sampleSkin = (ctx: CanvasRenderingContext2D, timeMs: number) => {
    const second = Math.floor(timeMs / 1000);
    if (second === skinSampledAt) return;
    skinSampledAt = second;
    try {
      const sx = Math.round(clamp(mouthX - 0.12 * width, 0, width - 1));
      const sy = Math.round(clamp(mouthY - 0.05 * height, 0, height - 1));
      const px = ctx.getImageData(sx, sy, 1, 1).data;
      skin = `rgb(${px[0]},${px[1]},${px[2]})`;
    } catch {
      // Tainted canvas or unsupported readback: skip blinks rather than fail the render.
      blinksDisabled = true;
      skin = null;
    }
  };

  const drawBlink = (ctx: CanvasRenderingContext2D, pose: HeadPose, timeMs: number) => {
    if (blinksDisabled) return;
    sampleSkin(ctx, timeMs);
    const lid = skin;
    if (!lid) return;
    const phase = blinkPhase(timeMs);
    if (phase < 0 || phase >= 1) return;
    const ry = Math.max(0.5, 0.012 * height * Math.sin(Math.PI * phase));
    withHead(ctx, pose, () => {
      ctx.save();
      ctx.fillStyle = lid;
      ctx.shadowColor = lid;
      ctx.shadowBlur = 6;
      for (const dx of [-0.09, 0.09]) {
        ctx.beginPath();
        ctx.ellipse(mouthX + dx * width, mouthY - 0.22 * height, 0.05 * width, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  };

  const drawVisualizer = (ctx: CanvasRenderingContext2D, timeMs: number) => {
    const bandH = height * 0.16;
    const band = ctx.createLinearGradient(0, height - bandH, 0, height);
    band.addColorStop(0, "rgba(0,0,0,0)");
    band.addColorStop(1, "rgba(0,0,0,0.65)");
    ctx.fillStyle = band;
    ctx.fillRect(0, height - bandH, width, bandH);

    const currentFrame = Math.floor((timeMs / 1000) * envelope.fps);
    const totalW = width * 0.6;
    const slot = totalW / VISUALIZER_BARS;
    const barW = slot * 0.55;
    const x0 = (width - totalW) / 2;
    const baseY = height - height * 0.03;
    const maxH = 0.12 * height;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = accent;
    for (let i = 0; i < VISUALIZER_BARS; i++) {
      const index = currentFrame - (VISUALIZER_BARS - 1 - i);
      const value = index >= 0 ? (envelope.values[Math.min(index, envelope.values.length - 1)] ?? 0) : 0;
      const h = Math.max(barW, value * maxH);
      roundRect(ctx, x0 + i * slot + (slot - barW) / 2, baseY - h, barW, h, barW / 2);
      ctx.fill();
    }
    ctx.restore();
  };

  const drawCaptions = (ctx: CanvasRenderingContext2D, timeMs: number, centerY: number) => {
    const current = wordAt(envelope, timeMs);
    let line = current ? captionLines.find((l) => l.words.includes(current)) : undefined;
    if (!line) {
      // Keep the most recent line on screen through pauses; hide before the first and after the last word.
      for (let i = captionLines.length - 1; i >= 0; i--) {
        const candidate = captionLines[i];
        if (candidate.startMs - 300 <= timeMs && timeMs <= candidate.endMs + 900) {
          line = candidate;
          break;
        }
      }
    }
    if (!line) return;

    ctx.save();
    ctx.font = captionFont;
    let widths = captionWidths.get(line);
    if (!widths) {
      widths = line.words.map((w) => ctx.measureText(w.word).width);
      captionWidths.set(line, widths);
    }
    const spaceW = ctx.measureText(" ").width;
    const padX = captionSize * 0.8;
    const padY = captionSize * 0.45;
    const maxRowW = width * 0.86 - padX * 2;
    const lineH = captionSize * 1.25;

    // Greedy wrap of the word indices.
    const rows: number[][] = [[]];
    const rowWidths: number[] = [0];
    for (let i = 0; i < line.words.length; i++) {
      const rowIndex = rows.length - 1;
      const extra = rows[rowIndex].length ? spaceW + widths[i] : widths[i];
      if (rows[rowIndex].length && rowWidths[rowIndex] + extra > maxRowW) {
        rows.push([i]);
        rowWidths.push(widths[i]);
      } else {
        rows[rowIndex].push(i);
        rowWidths[rowIndex] += extra;
      }
    }

    const pillW = Math.max(...rowWidths) + padX * 2;
    const pillH = rows.length * lineH + padY * 2;
    const px = width / 2 - pillW / 2;
    const py = centerY - pillH / 2;
    ctx.fillStyle = "rgba(8,8,12,0.55)";
    roundRect(ctx, px, py, pillW, pillH, Math.min(pillH / 2, captionSize));
    ctx.fill();

    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 6;
    rows.forEach((row, r) => {
      let x = width / 2 - rowWidths[r] / 2;
      const y = py + padY + lineH * (r + 0.5);
      for (const i of row) {
        const word = line.words[i];
        const isCurrent = word === current;
        ctx.fillStyle = isCurrent ? accent : "#ffffff";
        ctx.globalAlpha = isCurrent ? 1 : 0.9;
        ctx.fillText(word.word, x, y);
        x += widths[i] + spaceW;
      }
    });
    ctx.restore();
  };

  return {
    draw(ctx, _progress, timeMs, frame) {
      const env = clamp(envelopeAt(envelope, timeMs), 0, 1);
      const t = timeMs / 1000;
      const pose: HeadPose = {
        tx: Math.sin(t * 0.7) * 2 * handheld,
        ty: -env * expr * 5 * (height / 720) + Math.cos(t * 0.5) * 1.5 * handheld,
        scale: 1 + env * 0.012 * expr,
        rotation: Math.sin(timeMs / 900) * 0.006 * expr,
      };

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);
      drawHead(ctx, pose);

      const shift = env * amp * 0.045 * height;
      if (shift > 0.25) drawJaw(ctx, pose, shift);
      drawMouth(ctx, pose, env, shift);
      drawBlink(ctx, pose, timeMs);

      if (options.visualizer) drawVisualizer(ctx, timeMs);
      if (captionLines.length) drawCaptions(ctx, timeMs, options.visualizer ? height * 0.8 : height * 0.9);

      if (!lightweight) {
        if (look.tint) drawTint(ctx, width, height, look.tint, look.tintAlpha ?? 0.06);
        drawGrain(ctx, noise, frame, look.grain, width, height);
        if (vignette) ctx.drawImage(vignette, 0, 0);
      }
      drawFade(ctx, width, height, timeMs, durationMs);
    },
  };
}

export async function renderLipsyncVideo(options: LipsyncRenderOptions): Promise<RenderResult> {
  const drawer = createLipsyncDrawer(options);
  return renderCanvasVideo({
    width: options.width,
    height: options.height,
    durationMs: options.durationMs,
    fps: options.fps,
    draw: drawer.draw,
    onProgress: options.onProgress,
    onStart: options.onStart,
    signal: options.signal,
    audioTracks: options.audioTracks,
  });
}

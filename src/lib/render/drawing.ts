/** Small, dependency-free 2D drawing helpers shared by the video renderers. */

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Scales an image to cover a box, optionally with extra overscan (>1) for camera moves. */
export function coverFit(imgW: number, imgH: number, boxW: number, boxH: number, overscan = 1): Rect {
  const scale = Math.max(boxW / imgW, boxH / imgH) * overscan;
  const w = imgW * scale;
  const h = imgH * scale;
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h };
}

export function containFit(imgW: number, imgH: number, boxW: number, boxH: number): Rect {
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h };
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

// ---- film grain --------------------------------------------------------------

export function createNoiseCanvases(size = 256, count = 4, seed = 1): HTMLCanvasElement[] {
  let s = seed >>> 0 || 1;
  const rand = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
  return Array.from({ length: count }, () => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;
    const image = ctx.createImageData(size, size);
    for (let i = 0; i < image.data.length; i += 4) {
      const v = 96 + Math.floor(rand() * 64);
      image.data[i] = v;
      image.data[i + 1] = v;
      image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    return canvas;
  });
}

export function drawGrain(ctx: CanvasRenderingContext2D, noise: HTMLCanvasElement[], frame: number, alpha: number, w: number, h: number): void {
  if (alpha <= 0 || noise.length === 0) return;
  const tile = noise[frame % noise.length];
  const offsetX = (frame * 37) % tile.width;
  const offsetY = (frame * 53) % tile.height;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "overlay";
  for (let y = -offsetY; y < h; y += tile.height) {
    for (let x = -offsetX; x < w; x += tile.width) {
      ctx.drawImage(tile, x, y);
    }
  }
  ctx.restore();
}

// ---- lens / colour -----------------------------------------------------------

export function createVignette(w: number, h: number, strength = 0.55): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const gradient = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  return canvas;
}

export function drawLetterbox(ctx: CanvasRenderingContext2D, w: number, h: number, targetRatio = 2.39): void {
  const contentH = w / targetRatio;
  if (contentH >= h) return;
  const bar = (h - contentH) / 2;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, bar);
  ctx.fillRect(0, h - bar, w, bar);
}

export function drawLightLeak(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, color = "255,200,120", alpha = 0.18): void {
  const x = lerp(-w * 0.3, w * 1.2, easeInOutSine(t));
  const gradient = ctx.createLinearGradient(x - w * 0.35, 0, x + w * 0.35, 0);
  gradient.addColorStop(0, `rgba(${color},0)`);
  gradient.addColorStop(0.5, `rgba(${color},${alpha})`);
  gradient.addColorStop(1, `rgba(${color},0)`);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export function drawTint(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, alpha: number, mode: GlobalCompositeOperation = "soft-light"): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = mode;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Black fade at both ends of the clip. */
export function drawFade(ctx: CanvasRenderingContext2D, w: number, h: number, timeMs: number, durationMs: number, fadeMs = 350): void {
  const fadeIn = clamp(timeMs / fadeMs, 0, 1);
  const fadeOut = clamp((durationMs - timeMs) / fadeMs, 0, 1);
  const alpha = 1 - Math.min(fadeIn, fadeOut);
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ---- text --------------------------------------------------------------------

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export interface TextBlockOptions {
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  font: string;
  color?: string;
  align?: CanvasTextAlign;
  lineHeight?: number;
  shadow?: boolean;
  alpha?: number;
  maxLines?: number;
}

/** Draws wrapped text; returns the block height. */
export function drawTextBlock(ctx: CanvasRenderingContext2D, options: TextBlockOptions): number {
  const { text, x, y, maxWidth, font, color = "#fff", align = "left", alpha = 1, maxLines } = options;
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.globalAlpha = alpha;
  if (options.shadow !== false) {
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 2;
  }
  const size = parseInt(font.match(/(\d+)px/)?.[1] ?? "24", 10);
  const lineHeight = options.lineHeight ?? Math.round(size * 1.18);
  let lines = wrapText(ctx, text, maxWidth);
  if (maxLines && lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "…";
  }
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
  ctx.restore();
  return lines.length * lineHeight;
}

export function drawPill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, font: string, bg: string, color: string, paddingX = 14, paddingY = 8): { w: number; h: number } {
  ctx.save();
  ctx.font = font;
  const size = parseInt(font.match(/(\d+)px/)?.[1] ?? "16", 10);
  const w = ctx.measureText(text).width + paddingX * 2;
  const h = size + paddingY * 2;
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(text, x + paddingX, y + h / 2 + 1);
  ctx.restore();
  return { w, h };
}

/** Simple deterministic hash → 0..1 for per-frame jitter without Math.random. */
export function pseudoRandom(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Deterministic procedural artwork used when the AI endpoint is unavailable
 * and for catalog previews. Always labelled as "procedural" in the UI.
 */
import { hashString } from "./ids";
import { dimensionsFor } from "./aspect";

export interface ProceduralOptions {
  title: string;
  seed?: number | string;
  aspectRatio?: string;
  label?: string;
  longEdge?: number;
}

const PALETTES: Array<[string, string, string, string]> = [
  ["#022c22", "#065f46", "#10b981", "#6ee7b7"],
  ["#0c0a2b", "#312e81", "#6366f1", "#a5b4fc"],
  ["#2a0a18", "#7f1d4b", "#ec4899", "#f9a8d4"],
  ["#03191f", "#0e4a5c", "#0ea5e9", "#7dd3fc"],
  ["#1f1206", "#7c3f0a", "#f59e0b", "#fde68a"],
  ["#140b2a", "#4c1d95", "#8b5cf6", "#c4b5fd"],
  ["#0b1f16", "#134e4a", "#14b8a6", "#99f6e4"],
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function escapeXml(input: string): string {
  return input.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] ?? c);
}

export function proceduralSvg(options: ProceduralOptions): string {
  const seedNumber = typeof options.seed === "number" ? options.seed : hashString(String(options.seed ?? options.title));
  const rand = mulberry32(seedNumber);
  const { width, height } = dimensionsFor(options.aspectRatio ?? "16:9", options.longEdge ?? 960);
  const palette = PALETTES[seedNumber % PALETTES.length];
  const blobs = Array.from({ length: 5 }, (_, i) => {
    const cx = Math.round(rand() * width);
    const cy = Math.round(rand() * height);
    const r = Math.round(Math.min(width, height) * (0.18 + rand() * 0.32));
    const color = palette[(i + 1) % palette.length];
    const opacity = (0.35 + rand() * 0.4).toFixed(2);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${opacity}" filter="url(#blur)"/>`;
  }).join("");
  const rays = Array.from({ length: 7 }, () => {
    const x1 = Math.round(rand() * width);
    const y1 = Math.round(rand() * height);
    const x2 = Math.round(rand() * width);
    const y2 = Math.round(rand() * height);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1.5"/>`;
  }).join("");
  const angle = Math.round(rand() * 360);
  const title = escapeXml(options.title.slice(0, 60));
  const label = escapeXml(options.label ?? "PROCEDURAL PREVIEW");
  const fontSize = Math.round(Math.max(18, Math.min(width, height) * 0.045));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
  <linearGradient id="bg" gradientTransform="rotate(${angle})"><stop offset="0" stop-color="${palette[0]}"/><stop offset="0.55" stop-color="${palette[1]}"/><stop offset="1" stop-color="${palette[2]}"/></linearGradient>
  <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${Math.round(Math.min(width, height) * 0.08)}"/></filter>
  <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.65"/></linearGradient>
</defs>
<rect width="100%" height="100%" fill="url(#bg)"/>
${blobs}
${rays}
<rect width="100%" height="100%" fill="url(#fade)"/>
<text x="${Math.round(width * 0.04)}" y="${height - Math.round(height * 0.11)}" font-family="Inter, system-ui, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff" opacity="0.95">${title}</text>
<text x="${Math.round(width * 0.04)}" y="${height - Math.round(height * 0.05)}" font-family="JetBrains Mono, monospace" font-size="${Math.round(fontSize * 0.55)}" font-weight="600" fill="${palette[3]}" opacity="0.9" letter-spacing="2">${label}</text>
</svg>`;
}

export function proceduralDataUrl(options: ProceduralOptions): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(proceduralSvg(options))}`;
}

export function proceduralBlob(options: ProceduralOptions): Blob {
  return new Blob([proceduralSvg(options)], { type: "image/svg+xml" });
}

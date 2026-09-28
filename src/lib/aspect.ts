export interface AspectRatioOption {
  id: string;
  label: string;
  description: string;
  /** Width / height. */
  value: number;
}

export const ASPECT_RATIOS: AspectRatioOption[] = [
  { id: "16:9", label: "16:9", description: "Landscape", value: 16 / 9 },
  { id: "9:16", label: "9:16", description: "Portrait / Reels", value: 9 / 16 },
  { id: "1:1", label: "1:1", description: "Square", value: 1 },
  { id: "4:3", label: "4:3", description: "Classic", value: 4 / 3 },
  { id: "3:4", label: "3:4", description: "Portrait photo", value: 3 / 4 },
  { id: "21:9", label: "21:9", description: "Ultrawide", value: 21 / 9 },
];

export function parseRatio(ratio: string): number {
  const [w, h] = ratio.split(":").map(Number);
  if (!w || !h) return 16 / 9;
  return w / h;
}

/**
 * Pixel dimensions for a ratio, snapped to multiples of 16 (what diffusion
 * endpoints and video encoders prefer). `longEdge` is the longest side.
 */
export function dimensionsFor(ratio: string, longEdge = 1024): { width: number; height: number } {
  const value = parseRatio(ratio);
  const snap = (n: number) => Math.max(64, Math.round(n / 16) * 16);
  if (value >= 1) {
    return { width: snap(longEdge), height: snap(longEdge / value) };
  }
  return { width: snap(longEdge * value), height: snap(longEdge) };
}

/** Dimensions for the in-browser video renderer: 720p-class, ratio-aware. */
export function videoDimensionsFor(ratio: string): { width: number; height: number } {
  return dimensionsFor(ratio, 1280);
}

export function cssAspect(ratio: string): string {
  const [w, h] = ratio.split(":");
  return w && h ? `${w} / ${h}` : "16 / 9";
}

import { putAsset } from "./asset-store";
import { proceduralSvg } from "./procedural";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAX_UPLOAD_EDGE = 2048;
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml", "image/avif"];

export function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image failed to decode"));
    img.src = url;
  });
}

export async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    return await loadImageElement(url);
  } finally {
    // Keep the URL alive until the image has decoded; revoking synchronously is safe after load.
    URL.revokeObjectURL(url);
  }
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/jpeg", quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))), type, quality);
  });
}

/** Draws an SVG string into a raster JPEG blob (used for procedural fallbacks). */
export async function rasterizeSvg(svg: string, width: number, height: number): Promise<Blob> {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const img = await blobToImage(blob);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not supported");
  ctx.drawImage(img, 0, 0, width, height);
  return canvasToBlob(canvas, "image/jpeg", 0.92);
}

export async function proceduralRasterBlob(title: string, seed: number, aspectRatio: string, width: number, height: number): Promise<Blob> {
  return rasterizeSvg(proceduralSvg({ title, seed, aspectRatio, longEdge: Math.max(width, height) }), width, height);
}

/** Scales an image blob down to `maxEdge` (JPEG). Returns the original when small enough. */
export async function resizeImageBlob(blob: Blob, maxEdge: number, type = "image/jpeg", quality = 0.88): Promise<{ blob: Blob; width: number; height: number }> {
  const img = await blobToImage(blob);
  const { naturalWidth: w, naturalHeight: h } = img;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  if (scale === 1 && blob.type !== "image/svg+xml") return { blob, width: w, height: h };
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not supported");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { blob: await canvasToBlob(canvas, type, quality), width: canvas.width, height: canvas.height };
}

export async function createThumbnail(blob: Blob, maxEdge = 640): Promise<Blob> {
  return (await resizeImageBlob(blob, maxEdge, "image/jpeg", 0.82)).blob;
}

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Please choose an image file (PNG, JPG, WebP).";
  if (file.size > MAX_UPLOAD_BYTES) return "Images must be smaller than 15 MB.";
  return null;
}

/** Validates, normalises (max 2048px) and stores an uploaded image. */
export async function storeUploadedImage(file: File): Promise<{ assetId: string; width: number; height: number; url: string }> {
  const problem = validateImageFile(file);
  if (problem) throw new Error(problem);
  const { blob, width, height } = await resizeImageBlob(file, MAX_UPLOAD_EDGE, file.type === "image/png" ? "image/png" : "image/jpeg");
  const assetId = await putAsset(blob, "image", { name: file.name, width, height });
  return { assetId, width, height, url: URL.createObjectURL(blob) };
}

export async function imageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  const img = await blobToImage(blob);
  return { width: img.naturalWidth, height: img.naturalHeight };
}

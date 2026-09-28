import type { GenerationProject } from "../types/project";
import { getAsset } from "./asset-store";
import { slugify } from "./format";

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function extensionForMime(mime: string | undefined): string {
  if (!mime) return "bin";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("svg")) return "svg";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  return mime.split("/")[1]?.split(";")[0] ?? "bin";
}

export function filenameForProject(project: GenerationProject, mime?: string): string {
  const ext = extensionForMime(mime ?? project.outputMimeType);
  return `fluxframe-${slugify(project.title)}-${project.id.slice(-6)}.${ext}`;
}

/** Downloads a project's output as a real file (blob from IndexedDB, or fetched URL). */
export async function downloadProject(project: GenerationProject): Promise<void> {
  if (project.outputAssetId) {
    const asset = await getAsset(project.outputAssetId);
    if (asset) {
      downloadBlob(asset.blob, filenameForProject(project, asset.blob.type || project.outputMimeType));
      return;
    }
  }
  if (project.outputUrl) {
    if (project.outputUrl.startsWith("data:")) {
      const res = await fetch(project.outputUrl);
      downloadBlob(await res.blob(), filenameForProject(project));
      return;
    }
    try {
      const res = await fetch(project.outputUrl, { mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      downloadBlob(blob, filenameForProject(project, blob.type));
      return;
    } catch {
      window.open(project.outputUrl, "_blank", "noopener");
      return;
    }
  }
  throw new Error("This project has no output to download yet.");
}

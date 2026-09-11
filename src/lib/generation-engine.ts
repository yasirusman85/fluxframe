import type { GenerationStatus, GenerationProject } from "../types/project";
import { generateVisualDataUrl } from "./demo-assets";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ProgressCallback {
  (progress: number, status: GenerationStatus, stageMessage?: string, resultUrl?: string): void;
}

// Active cancelled jobs map
const cancelledJobs = new Set<string>();

export function cancelGenerationTask(projectId: string) {
  cancelledJobs.add(projectId);
}

export async function simulateGeneration(
  project: GenerationProject,
  onProgress: ProgressCallback
) {
  cancelledJobs.delete(project.id);

  if (cancelledJobs.has(project.id)) return;
  onProgress(5, "queued", "Request added to priority cluster queue");

  await wait(600);
  if (cancelledJobs.has(project.id)) return;
  onProgress(18, "processing", "Interpreting prompt & parsing latent vectors...");

  await wait(800);
  if (cancelledJobs.has(project.id)) return;
  onProgress(
    42,
    "processing",
    project.type === "video"
      ? "Calculating motion vector fields & keyframes..."
      : "Synthesizing high-res diffusion step 20/50..."
  );

  await wait(1000);
  if (cancelledJobs.has(project.id)) return;
  onProgress(
    70,
    "processing",
    project.type === "video"
      ? "Rendering optical flow & temporal stability..."
      : "Applying volumetric lighting & optics enhancement..."
  );

  await wait(800);
  if (cancelledJobs.has(project.id)) return;
  onProgress(92, "processing", "Finalizing noise reduction & upscaling...");

  await wait(600);
  if (cancelledJobs.has(project.id)) return;

  // Deterministically select or create result visual
  const resultUrl =
    project.outputUrl ||
    generateVisualDataUrl(
      project.title,
      project.type,
      project.aspectRatio,
      Math.abs(project.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0))
    );

  onProgress(100, "completed", "Generation completed successfully", resultUrl);
}

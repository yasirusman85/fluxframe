import type { GenerationStatus, GenerationProject } from "../types/project";
import { generateVisualDataUrl } from "./demo-assets";
import { fetchPollinationsImage, type PollinationsResult } from "./pollinations";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ProgressCallback {
  (
    progress: number,
    status: GenerationStatus,
    stageMessage?: string,
    resultUrl?: string,
    providerSource?: "pollinations-ai" | "procedural-fallback"
  ): void;
}

// Active AbortControllers map for active jobs
const activeControllers = new Map<string, AbortController>();

export function cancelGenerationTask(projectId: string) {
  const controller = activeControllers.get(projectId);
  if (controller) {
    controller.abort();
    activeControllers.delete(projectId);
  }
}

export async function simulateGeneration(
  project: GenerationProject,
  onProgress: ProgressCallback
) {
  // Setup AbortController for true network cancellation
  const controller = new AbortController();
  activeControllers.set(project.id, controller);

  const isAborted = () => controller.signal.aborted;

  if (isAborted()) return;
  onProgress(5, "queued", "Request added to queue");

  await wait(400);
  if (isAborted()) return;
  onProgress(20, "processing", "Connecting to Pollinations AI public endpoint...");

  let resultData: PollinationsResult | null = null;

  if (project.type === "image") {
    try {
      onProgress(45, "processing", `Synthesizing ${project.model} image...`);
      const seed = Math.abs(
        project.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
      );

      resultData = await fetchPollinationsImage({
        prompt: project.prompt,
        model: project.model,
        aspectRatio: project.aspectRatio,
        seed,
        signal: controller.signal,
      });
    } catch (e) {
      if (!isAborted()) {
        console.warn("Pollinations request error, falling back to procedural engine:", e);
      }
    }
  }

  if (isAborted()) return;

  const providerSource: "pollinations-ai" | "procedural-fallback" = resultData
    ? "pollinations-ai"
    : "procedural-fallback";

  onProgress(
    75,
    "processing",
    project.type === "video"
      ? "Calculating 60fps motion optical flow vectors..."
      : resultData
      ? "AI image generated! Processing optics..."
      : "Endpoint unavailable, generating procedural SVG fallback..."
  );

  await wait(400);
  if (isAborted()) return;
  onProgress(95, "processing", "Finalizing asset export...");

  await wait(300);
  if (isAborted()) return;

  // Preserve remote image URL or generate SVG fallback data URL
  const resultUrl =
    resultData?.url ||
    project.outputUrl ||
    generateVisualDataUrl(
      project.title,
      project.type,
      project.aspectRatio,
      Math.abs(project.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0))
    );

  const completionMsg =
    providerSource === "pollinations-ai"
      ? "Generated via Pollinations Public Endpoint"
      : "Generated via Procedural Fallback Engine";

  activeControllers.delete(project.id);
  onProgress(100, "completed", completionMsg, resultUrl, providerSource);
}

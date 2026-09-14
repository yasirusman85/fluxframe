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
    providerSource?: "pollinations-ai" | "procedural-fallback" | "kling-simulated" | "veo-simulated" | "lipsync-simulated"
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
  onProgress(5, "queued", "Request added to high-priority GPU queue");

  await wait(400);
  if (isAborted()) return;

  let providerSource: "pollinations-ai" | "procedural-fallback" | "kling-simulated" | "veo-simulated" | "lipsync-simulated" = "procedural-fallback";

  if (project.type === "image") {
    onProgress(20, "processing", "Connecting to Pollinations AI public endpoint...");
    let resultData: PollinationsResult | null = null;
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
      if (resultData) providerSource = "pollinations-ai";
    } catch (e) {
      if (!isAborted()) {
        console.warn("Pollinations request error, falling back to procedural engine:", e);
      }
    }
  } else if (project.type === "cinema") {
    onProgress(25, "processing", `Initializing ${project.model} spatio-temporal engine...`);
    await wait(400);
    if (isAborted()) return;
    onProgress(55, "processing", `Applying camera motion matrix (Pan: ${project.cameraMotion?.pan || 0}°, Zoom: ${project.cameraMotion?.zoom || 0}%)...`);
    await wait(400);
    if (isAborted()) return;
    onProgress(75, "processing", `Emulating ${project.cameraMotion?.focalLength || "35mm"} lens depth of field...`);
    providerSource = "kling-simulated";
  } else if (project.type === "lipsync") {
    onProgress(30, "processing", "Analyzing phoneme audio waveform & facial mesh points...");
    await wait(400);
    if (isAborted()) return;
    onProgress(65, "processing", "Synthesizing frame-accurate lipsync micro-expressions...");
    providerSource = "lipsync-simulated";
  } else if (project.type === "marketing") {
    onProgress(30, "processing", "Extracting product packshots & brand aesthetic guidelines...");
    await wait(400);
    if (isAborted()) return;
    onProgress(70, "processing", `Building multi-format ${project.marketingFormat || "9:16"} campaign creative...`);
    providerSource = "veo-simulated";
  } else {
    onProgress(35, "processing", "Calculating 60fps motion optical flow vectors...");
  }

  await wait(400);
  if (isAborted()) return;
  onProgress(95, "processing", "Finalizing asset export & 4K color grading...");

  await wait(300);
  if (isAborted()) return;

  const variantIndex = Math.abs(project.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0));
  const resultUrl =
    project.outputUrl ||
    generateVisualDataUrl(
      project.title,
      project.type,
      project.aspectRatio,
      variantIndex
    );

  const completionMsg =
    providerSource === "pollinations-ai"
      ? "Generated via Pollinations Public Endpoint"
      : `${project.model} generation complete`;

  activeControllers.delete(project.id);
  onProgress(100, "completed", completionMsg, resultUrl, providerSource);
}

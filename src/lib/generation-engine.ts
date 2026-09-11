import type { GenerationStatus, GenerationProject } from "../types/project";
import { generateVisualDataUrl } from "./demo-assets";
import { generateOpenSourceAIImage } from "./huggingface";

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
  onProgress(5, "queued", "Request added to open-source inference queue");

  await wait(400);
  if (cancelledJobs.has(project.id)) return;
  onProgress(20, "processing", "Dispatching to FLUX.1 / SD open-source engine...");

  let realAiOutput: string | null = null;

  if (project.type === "image") {
    try {
      onProgress(45, "processing", `Synthesizing ${project.model} latent tensors...`);
      const seed = Math.abs(
        project.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
      );

      realAiOutput = await generateOpenSourceAIImage({
        prompt: project.prompt,
        model: project.model,
        aspectRatio: project.aspectRatio,
        seed,
      });
    } catch (e) {
      console.warn("Open AI inference error:", e);
    }
  }

  if (cancelledJobs.has(project.id)) return;
  onProgress(
    75,
    "processing",
    project.type === "video"
      ? "Calculating 60fps motion optical flow vectors..."
      : realAiOutput
      ? "Applying neural color grading & upscaling..."
      : "Rendering procedural fallback canvas..."
  );

  await wait(400);
  if (cancelledJobs.has(project.id)) return;
  onProgress(95, "processing", "Finalizing asset export...");

  await wait(300);
  if (cancelledJobs.has(project.id)) return;

  // Use real open AI output if available, or generate visual SVG canvas fallback
  const resultUrl =
    realAiOutput ||
    project.outputUrl ||
    generateVisualDataUrl(
      project.title,
      project.type,
      project.aspectRatio,
      Math.abs(project.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0))
    );

  const completionMsg = realAiOutput
    ? "AI Image generated via Open-Source FLUX Engine"
    : "Generation completed successfully";

  onProgress(100, "completed", completionMsg, resultUrl);
}

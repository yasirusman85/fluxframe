/**
 * Runs generation jobs independently of any page. Pages call `generate()`
 * (via useGeneration) and can navigate away; progress keeps flowing into
 * the project store, cancellation aborts the underlying work, and retry
 * re-runs the same project.
 */
import { useProjectStore } from "../store/project-store";
import { useCreditStore } from "../store/credit-store";
import { toast } from "../store/ui-store";
import { isAbortError } from "./async";
import { PollinationsError } from "./pollinations";
import { getPipeline } from "./pipelines";
import type { Pipeline } from "./pipelines";
import { TYPE_LABELS } from "../types/project";

interface RunningJob {
  controller: AbortController;
  promise: Promise<void>;
}

const running = new Map<string, RunningJob>();
const pipelineOverrides = new Map<string, Pipeline>();

export function isRunning(projectId: string): boolean {
  return running.has(projectId);
}

export function friendlyError(err: unknown): string {
  if (err instanceof PollinationsError) {
    switch (err.kind) {
      case "rate-limited":
        return "The public image endpoint is rate-limited right now. Wait a few seconds and retry.";
      case "timeout":
        return "The image endpoint took too long to respond. Retry in a moment.";
      case "not-image":
        return "The endpoint returned something that was not an image. Retry or adjust the prompt.";
      case "http":
        return `The image endpoint responded with an error (HTTP ${err.status ?? "?"}).`;
      default:
        return "Could not reach the image endpoint. Check your connection and retry.";
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return "Generation failed for an unknown reason.";
}

/**
 * @param pipelineOverride custom pipeline (used by Creative Apps for multi-step runs);
 *   defaults to the pipeline registered for the project type.
 */
export function startGeneration(projectId: string, pipelineOverride?: Pipeline): Promise<void> {
  const existing = running.get(projectId);
  if (existing) return existing.promise;

  const store = useProjectStore.getState();
  const project = store.getProject(projectId);
  if (!project) return Promise.resolve();

  const controller = new AbortController();
  // Registered before the body runs: a pipeline that throws synchronously would
  // otherwise reach the `finally` (and its `running.delete`) before this entry
  // existed, stranding a stale record that blocks cancel and retry forever.
  const job: RunningJob = { controller, promise: Promise.resolve() };
  running.set(projectId, job);
  if (pipelineOverride) pipelineOverrides.set(projectId, pipelineOverride);

  const promise = (async () => {
    store.setJobActive(projectId, true);
    store.updateProject(projectId, { status: "processing", progress: 2, stageMessage: "Starting…", errorMessage: undefined });
    const started = performance.now();
    try {
      const pipeline = pipelineOverride ?? (await getPipeline(project.type));
      const current = useProjectStore.getState().getProject(projectId);
      if (!current) return;
      const output = await pipeline({
        project: current,
        signal: controller.signal,
        report: (progress, stage) => {
          if (controller.signal.aborted) return;
          useProjectStore.getState().updateProject(projectId, { progress: Math.max(0, Math.min(99, Math.round(progress))), stageMessage: stage });
        },
      });
      if (controller.signal.aborted) return;
      useProjectStore.getState().updateProject(projectId, {
        ...output,
        status: "completed",
        progress: 100,
        stageMessage: "Completed",
        errorMessage: undefined,
        completedAt: new Date().toISOString(),
        renderMs: output.renderMs ?? Math.round(performance.now() - started),
      });
      toast(`${TYPE_LABELS[project.type]} ready: ${output.title ?? project.title}`, { type: "success" });
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) {
        useProjectStore.getState().updateProject(projectId, { status: "cancelled", progress: 0, stageMessage: undefined, errorMessage: "Cancelled" });
        return;
      }
      console.error("[generation]", err);
      const message = friendlyError(err);
      useProjectStore.getState().updateProject(projectId, { status: "failed", progress: 0, stageMessage: undefined, errorMessage: message });
      if (project.creditCost > 0) {
        useCreditStore.getState().refund(project.creditCost, `Refund · ${project.title}`, projectId);
      }
      toast(message, { type: "error", title: "Generation failed" });
    } finally {
      running.delete(projectId);
      // The override is deliberately kept: retryGeneration must be able to re-run
      // a custom pipeline (Creative Apps) even after the job finished.
      useProjectStore.getState().setJobActive(projectId, false);
    }
  })();

  job.promise = promise;
  return promise;
}

export function cancelGeneration(projectId: string): void {
  const job = running.get(projectId);
  if (job) {
    job.controller.abort();
    return;
  }
  const project = useProjectStore.getState().getProject(projectId);
  if (project && (project.status === "queued" || project.status === "processing")) {
    useProjectStore.getState().updateProject(projectId, { status: "cancelled", progress: 0, stageMessage: undefined, errorMessage: "Cancelled" });
  }
}

export function retryGeneration(projectId: string): Promise<void> {
  const store = useProjectStore.getState();
  const project = store.getProject(projectId);
  if (!project || running.has(projectId)) return Promise.resolve();
  const credits = useCreditStore.getState();
  if (project.creditCost > 0 && project.status !== "cancelled") {
    // Failed jobs were refunded; charge again on retry.
    if (!credits.spend(project.creditCost, `Retry · ${project.title}`, projectId)) {
      toast("Not enough credits to retry. Top up to continue.", { type: "warning" });
      credits.openTopUp();
      return Promise.resolve();
    }
  }
  store.updateProject(projectId, { status: "queued", progress: 0, errorMessage: undefined, stageMessage: "Queued" });
  return startGeneration(projectId, pipelineOverrides.get(projectId));
}

/** Cancels everything (used by tests and the clear-library action). */
export function cancelAllGenerations(): void {
  for (const id of [...running.keys()]) cancelGeneration(id);
}

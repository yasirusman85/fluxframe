import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelAllGenerations,
  cancelGeneration,
  friendlyError,
  isRunning,
  retryGeneration,
  startGeneration,
} from "../src/lib/generation-runner";
import { getPipeline } from "../src/lib/pipelines";
import type { Pipeline, PipelineContext, PipelineOutput } from "../src/lib/pipelines";
import { PollinationsError } from "../src/lib/pollinations";
import { AbortError } from "../src/lib/async";
import { useProjectStore } from "../src/store/project-store";
import { INITIAL_CREDITS, useCreditStore } from "../src/store/credit-store";
import { useUIStore } from "../src/store/ui-store";
import { useGeneration } from "../src/hooks/useGeneration";
import type { CreateProjectInput, GenerationProject } from "../src/types/project";
import { deferred, flush, makeProject } from "./helpers/fixtures";

vi.mock("../src/lib/pipelines", () => ({ getPipeline: vi.fn() }));
vi.mock("../src/lib/generation-runner", { spy: true });

const projects = () => useProjectStore.getState();
const credits = () => useCreditStore.getState();
const toasts = () => useUIStore.getState().toasts;

const OUTPUT: PipelineOutput = {
  outputAssetId: "asset_out",
  outputMimeType: "image/jpeg",
  thumbnailAssetId: "asset_thumb",
  providerSource: "pollinations",
  providerDetail: "Pollinations public endpoint",
  width: 1024,
  height: 576,
};

const BASE_INPUT: CreateProjectInput = {
  type: "image",
  prompt: "a neon skyline at dusk",
  model: "flux-realism-v2",
  aspectRatio: "16:9",
  creditCost: 5,
};

/** A pipeline that reports progress once and resolves with `output`. */
const makePipeline = (output: PipelineOutput = OUTPUT) =>
  vi.fn(async (ctx: PipelineContext) => {
    ctx.report(50, "Working");
    return output;
  });

/** A pipeline that never resolves until its signal aborts. */
function makeAbortablePipeline() {
  const signals: AbortSignal[] = [];
  const pipeline: Pipeline = (ctx) =>
    new Promise<PipelineOutput>((_, reject) => {
      signals.push(ctx.signal);
      ctx.signal.addEventListener("abort", () => reject(new AbortError()), { once: true });
    });
  return { pipeline, signals };
}

const queueProject = (overrides: Partial<CreateProjectInput> = {}) => projects().createProject({ ...BASE_INPUT, ...overrides });

// The runner logs failures; keep the test output readable.
const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

beforeEach(() => {
  useProjectStore.setState({ projects: [], activeJobIds: [] });
  credits().reset();
  useCreditStore.setState({ topUpOpen: false });
  useUIStore.setState({ toasts: [] });
  vi.mocked(getPipeline).mockReset();
  vi.mocked(startGeneration).mockClear();
  consoleError.mockClear();
});

afterEach(() => {
  cancelAllGenerations();
});

describe("friendlyError", () => {
  it("maps every PollinationsError kind to product copy", () => {
    expect(friendlyError(new PollinationsError("x", "rate-limited"))).toMatch(/rate-limited/i);
    expect(friendlyError(new PollinationsError("x", "timeout"))).toMatch(/too long/i);
    expect(friendlyError(new PollinationsError("x", "not-image"))).toMatch(/not an image/i);
    expect(friendlyError(new PollinationsError("x", "http", 503))).toBe("The image endpoint responded with an error (HTTP 503).");
    expect(friendlyError(new PollinationsError("x", "http"))).toContain("HTTP ?");
    expect(friendlyError(new PollinationsError("x", "network"))).toMatch(/connection/i);
  });

  it("falls back to the error message, then to a generic line", () => {
    expect(friendlyError(new Error("Video rendering is not supported in this browser."))).toBe("Video rendering is not supported in this browser.");
    expect(friendlyError(new Error(""))).toBe("Generation failed for an unknown reason.");
    expect(friendlyError("boom")).toBe("Generation failed for an unknown reason.");
    expect(friendlyError(undefined)).toBe("Generation failed for an unknown reason.");
  });
});

describe("startGeneration", () => {
  it("runs the registered pipeline and completes the project", async () => {
    const project = queueProject();
    const pipeline = makePipeline({ ...OUTPUT, title: "Neon skyline" });
    vi.mocked(getPipeline).mockResolvedValue(pipeline);

    await startGeneration(project.id);

    expect(getPipeline).toHaveBeenCalledWith("image");
    expect(pipeline).toHaveBeenCalledTimes(1);

    const done = projects().getProject(project.id)!;
    expect(done.status).toBe("completed");
    expect(done.progress).toBe(100);
    expect(done.stageMessage).toBe("Completed");
    expect(done.errorMessage).toBeUndefined();
    expect(done.outputAssetId).toBe("asset_out");
    expect(done.thumbnailAssetId).toBe("asset_thumb");
    expect(done.outputMimeType).toBe("image/jpeg");
    expect(done.providerSource).toBe("pollinations");
    expect(done.width).toBe(1024);
    expect(done.height).toBe(576);
    expect(done.title).toBe("Neon skyline");
    expect(done.completedAt).toBeTruthy();
    expect(done.renderMs).toBeGreaterThanOrEqual(0);

    expect(projects().activeJobIds).toEqual([]);
    expect(isRunning(project.id)).toBe(false);
    expect(toasts().some((t) => t.type === "success" && t.message === "Image ready: Neon skyline")).toBe(true);
  });

  it("marks the job active and clamps reported progress while it runs", async () => {
    const project = queueProject();
    const reported = deferred();
    const release = deferred();
    vi.mocked(getPipeline).mockResolvedValue(async (ctx) => {
      ctx.report(150, "Almost there");
      reported.resolve(undefined);
      await release.promise;
      return OUTPUT;
    });

    const run = startGeneration(project.id);
    await reported.promise;

    const mid = projects().getProject(project.id)!;
    expect(mid.status).toBe("processing");
    expect(mid.progress).toBe(99);
    expect(mid.stageMessage).toBe("Almost there");
    expect(projects().activeJobIds).toContain(project.id);
    expect(isRunning(project.id)).toBe(true);

    release.resolve(undefined);
    await run;
    expect(projects().getProject(project.id)!.progress).toBe(100);
  });

  it("fails the project, refunds the credits and raises an error toast", async () => {
    const project = queueProject();
    expect(credits().spend(project.creditCost, "Image · charge", project.id)).toBe(true);
    const chargedBalance = credits().balance;
    vi.mocked(getPipeline).mockResolvedValue(async () => {
      throw new PollinationsError("nope", "http", 500);
    });

    await startGeneration(project.id);

    const failed = projects().getProject(project.id)!;
    expect(failed.status).toBe("failed");
    expect(failed.progress).toBe(0);
    expect(failed.stageMessage).toBeUndefined();
    expect(failed.errorMessage).toBe("The image endpoint responded with an error (HTTP 500).");

    expect(credits().balance).toBe(chargedBalance + project.creditCost);
    expect(credits().history[0]).toMatchObject({ type: "refund", amount: 5, projectId: project.id });
    expect(toasts().some((t) => t.type === "error" && t.title === "Generation failed")).toBe(true);
    expect(projects().activeJobIds).toEqual([]);
    expect(consoleError).toHaveBeenCalled();
  });

  it("does not refund a free generation", async () => {
    const project = queueProject({ creditCost: 0 });
    vi.mocked(getPipeline).mockResolvedValue(async () => {
      throw new Error("engine unavailable");
    });

    await startGeneration(project.id);

    expect(projects().getProject(project.id)!.errorMessage).toBe("engine unavailable");
    expect(credits().history.some((t) => t.type === "refund")).toBe(false);
    expect(credits().balance).toBe(INITIAL_CREDITS);
  });

  it("is idempotent while the job is running", async () => {
    const project = queueProject();
    const release = deferred();
    const pipeline = vi.fn(async (ctx: PipelineContext) => {
      ctx.report(10, "Working");
      await release.promise;
      return OUTPUT;
    });
    vi.mocked(getPipeline).mockResolvedValue(pipeline);

    const first = startGeneration(project.id);
    const second = startGeneration(project.id);
    expect(second).toBe(first);

    release.resolve(undefined);
    await first;

    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(getPipeline).toHaveBeenCalledTimes(1);
  });

  it("does nothing for an unknown project", async () => {
    await expect(startGeneration("proj_missing")).resolves.toBeUndefined();
    expect(getPipeline).not.toHaveBeenCalled();
    expect(projects().activeJobIds).toEqual([]);
  });
});

describe("cancelGeneration", () => {
  it("cancels a running job without refunding", async () => {
    const project = queueProject();
    credits().spend(project.creditCost, "Image · charge", project.id);
    const chargedBalance = credits().balance;
    const { pipeline } = makeAbortablePipeline();
    vi.mocked(getPipeline).mockResolvedValue(pipeline);

    const run = startGeneration(project.id);
    await flush();
    expect(isRunning(project.id)).toBe(true);

    cancelGeneration(project.id);
    await run;

    const cancelled = projects().getProject(project.id)!;
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.progress).toBe(0);
    expect(cancelled.errorMessage).toBe("Cancelled");
    expect(credits().balance).toBe(chargedBalance);
    expect(credits().history.some((t) => t.type === "refund")).toBe(false);
    expect(projects().activeJobIds).toEqual([]);
    expect(toasts().some((t) => t.type === "error")).toBe(false);
  });

  it("cancels a queued project that never started", () => {
    const project = queueProject();
    cancelGeneration(project.id);
    expect(projects().getProject(project.id)!.status).toBe("cancelled");
  });

  it("leaves finished projects alone", () => {
    const project = queueProject();
    projects().updateProject(project.id, { status: "completed" });
    cancelGeneration(project.id);
    expect(projects().getProject(project.id)!.status).toBe("completed");
  });

  it("ignores unknown ids", () => {
    expect(() => cancelGeneration("proj_missing")).not.toThrow();
  });
});

describe("cancelAllGenerations", () => {
  it("aborts every running job", async () => {
    const first = queueProject();
    const second = queueProject();
    const { pipeline, signals } = makeAbortablePipeline();
    vi.mocked(getPipeline).mockResolvedValue(pipeline);

    const runs = [startGeneration(first.id), startGeneration(second.id)];
    await flush();
    expect(signals).toHaveLength(2);

    cancelAllGenerations();
    await Promise.all(runs);

    expect(projects().getProject(first.id)!.status).toBe("cancelled");
    expect(projects().getProject(second.id)!.status).toBe("cancelled");
    expect(projects().activeJobIds).toEqual([]);
    expect(isRunning(first.id)).toBe(false);
  });
});

describe("retryGeneration", () => {
  it("re-charges and re-runs, keeping the pipeline override", async () => {
    const project = queueProject();
    const override = makePipeline();
    const registered = makePipeline();
    vi.mocked(getPipeline).mockResolvedValue(registered);

    await startGeneration(project.id, override);
    expect(override).toHaveBeenCalledTimes(1);
    expect(registered).not.toHaveBeenCalled();
    expect(getPipeline).not.toHaveBeenCalled();

    projects().updateProject(project.id, { status: "failed", errorMessage: "boom" });
    const balanceBefore = credits().balance;

    await retryGeneration(project.id);

    expect(override).toHaveBeenCalledTimes(2);
    expect(registered).not.toHaveBeenCalled();
    expect(credits().balance).toBe(balanceBefore - project.creditCost);
    expect(credits().history[0]).toMatchObject({ type: "spend", description: `Retry · ${project.title}`, projectId: project.id });
    expect(projects().getProject(project.id)!.status).toBe("completed");
    expect(projects().getProject(project.id)!.errorMessage).toBeUndefined();
  });

  it("falls back to the registered pipeline when there was no override", async () => {
    const project = queueProject();
    const registered = makePipeline();
    vi.mocked(getPipeline).mockResolvedValue(registered);
    projects().updateProject(project.id, { status: "failed" });

    await retryGeneration(project.id);

    expect(getPipeline).toHaveBeenCalledWith("image");
    expect(registered).toHaveBeenCalledTimes(1);
    expect(projects().getProject(project.id)!.status).toBe("completed");
  });

  it("blocks the retry and opens the top-up modal when credits run out", async () => {
    const project = queueProject();
    projects().updateProject(project.id, { status: "failed" });
    useCreditStore.setState({ balance: 0 });

    await retryGeneration(project.id);

    expect(projects().getProject(project.id)!.status).toBe("failed");
    expect(credits().topUpOpen).toBe(true);
    expect(getPipeline).not.toHaveBeenCalled();
    expect(toasts().some((t) => t.type === "warning" && /not enough credits/i.test(t.message))).toBe(true);
  });

  it("does not re-charge a cancelled project", async () => {
    const project = queueProject();
    projects().updateProject(project.id, { status: "cancelled" });
    vi.mocked(getPipeline).mockResolvedValue(makePipeline());
    const balanceBefore = credits().balance;

    await retryGeneration(project.id);

    expect(credits().balance).toBe(balanceBefore);
    expect(projects().getProject(project.id)!.status).toBe("completed");
  });

  it("ignores unknown projects and jobs already running", async () => {
    await expect(retryGeneration("proj_missing")).resolves.toBeUndefined();

    const project = queueProject();
    const { pipeline } = makeAbortablePipeline();
    vi.mocked(getPipeline).mockResolvedValue(pipeline);
    const run = startGeneration(project.id);
    await flush();

    const balanceBefore = credits().balance;
    await retryGeneration(project.id);
    expect(credits().balance).toBe(balanceBefore);

    cancelGeneration(project.id);
    await run;
  });
});

describe("useGeneration", () => {
  beforeEach(() => {
    vi.mocked(startGeneration).mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    vi.mocked(startGeneration).mockRestore();
  });

  const generateInput = { ...BASE_INPUT, creditCost: 5 };

  function runGenerate(input: Parameters<ReturnType<typeof useGeneration>["generate"]>[0], type?: GenerationProject["type"]) {
    const { result } = renderHook(() => useGeneration(type));
    const created: { value: GenerationProject | null } = { value: null };
    act(() => {
      created.value = result.current.generate(input);
    });
    return { created, result };
  }

  it("blocks an empty prompt with a warning toast", () => {
    const { created } = runGenerate({ ...generateInput, prompt: "   " });

    expect(created.value).toBeNull();
    expect(projects().projects).toHaveLength(0);
    expect(startGeneration).not.toHaveBeenCalled();
    expect(toasts()[0]).toMatchObject({ type: "warning", message: "Add a prompt or an input file first." });
    expect(credits().balance).toBe(INITIAL_CREDITS);
  });

  it("accepts an empty prompt when an input file is supplied", () => {
    const { created } = runGenerate({ ...generateInput, prompt: "", sourceAssetId: "asset_portrait" });

    expect(created.value).not.toBeNull();
    expect(projects().projects).toHaveLength(1);
    expect(startGeneration).toHaveBeenCalledTimes(1);
  });

  it("deletes the project and opens top-up when credits are short", () => {
    useCreditStore.setState({ balance: 1 });

    const { created } = runGenerate(generateInput);

    expect(created.value).toBeNull();
    expect(projects().projects).toHaveLength(0);
    expect(credits().balance).toBe(1);
    expect(credits().topUpOpen).toBe(true);
    expect(startGeneration).not.toHaveBeenCalled();
    expect(toasts().some((t) => t.type === "warning" && t.title === "Not enough credits")).toBe(true);
  });

  it("creates the project, charges credits and starts the pipeline", () => {
    const { created } = runGenerate(generateInput, "image");
    const project = created.value!;

    expect(project).not.toBeNull();
    expect(project.status).toBe("queued");
    expect(projects().projects.map((p) => p.id)).toEqual([project.id]);
    expect(credits().balance).toBe(INITIAL_CREDITS - 5);
    expect(credits().history[0]).toMatchObject({ type: "spend", amount: 5, description: `Image · ${project.title}`, projectId: project.id });
    expect(startGeneration).toHaveBeenCalledWith(project.id, undefined);
    expect(credits().topUpOpen).toBe(false);
  });

  it("passes a custom pipeline through without storing it on the project", () => {
    const pipeline = makePipeline();
    const { created } = runGenerate({ ...generateInput, pipeline });

    expect(startGeneration).toHaveBeenCalledWith(created.value!.id, pipeline);
    expect("pipeline" in created.value!).toBe(false);
    expect(projects().getProject(created.value!.id)).toBeDefined();
  });

  it("scopes active jobs and the latest completed project by type", () => {
    useProjectStore.setState({
      projects: [
        makeProject({ id: "proj_job", type: "image", status: "processing" }),
        makeProject({ id: "proj_done", type: "image", status: "completed" }),
        makeProject({ id: "proj_video", type: "video", status: "completed" }),
      ],
      activeJobIds: ["proj_job"],
    });

    const image = renderHook(() => useGeneration("image")).result;
    expect(image.current.activeJobs.map((p) => p.id)).toEqual(["proj_job"]);
    expect(image.current.activeJob?.id).toBe("proj_job");
    expect(image.current.isBusy).toBe(true);
    expect(image.current.latestCompleted?.id).toBe("proj_done");

    const video = renderHook(() => useGeneration("video")).result;
    expect(video.current.activeJobs).toEqual([]);
    expect(video.current.activeJob).toBeUndefined();
    expect(video.current.isBusy).toBe(false);
    expect(video.current.latestCompleted?.id).toBe("proj_video");

    const all = renderHook(() => useGeneration()).result;
    expect(all.current.activeJobs.map((p) => p.id)).toEqual(["proj_job"]);
    expect(all.current.latestCompleted?.id).toBe("proj_done");
  });

  it("exposes the runner's cancel and retry entry points", () => {
    const { result } = renderHook(() => useGeneration());
    expect(result.current.cancel).toBe(cancelGeneration);
    expect(typeof result.current.retry).toBe("function");
    expect(() => result.current.retry("proj_missing")).not.toThrow();
  });
});

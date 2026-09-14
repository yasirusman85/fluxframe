import { describe, it, expect } from "vitest";
import { simulateGeneration, cancelGenerationTask } from "../src/lib/generation-engine";
import type { GenerationProject } from "../src/types/project";

describe("Generation Engine & Cancellation", () => {
  const mockProject: GenerationProject = {
    id: "test-proj-101",
    type: "image",
    title: "Test Scene",
    prompt: "A neon lit obsidian castle",
    model: "flux-realism-v2",
    aspectRatio: "16:9",
    quality: "high",
    status: "queued",
    progress: 0,
    favorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("progresses through generation stages and reports completed status", async () => {
    const progressLogs: Array<{ progress: number; status: string }> = [];

    await simulateGeneration(mockProject, (progress, status) => {
      progressLogs.push({ progress, status });
    });

    expect(progressLogs.length).toBeGreaterThan(2);
    expect(progressLogs[0].status).toBe("queued");
    expect(progressLogs[progressLogs.length - 1].status).toBe("completed");
    expect(progressLogs[progressLogs.length - 1].progress).toBe(100);
  }, 15000);

  it("aborts execution gracefully when cancelGenerationTask is triggered", async () => {
    const progressLogs: Array<{ progress: number; status: string }> = [];

    const promise = simulateGeneration(mockProject, (progress, status) => {
      progressLogs.push({ progress, status });
    });

    // Immediately trigger cancellation
    cancelGenerationTask(mockProject.id);
    await promise;

    // After cancel, progress should not reach completed status 100
    const finalLog = progressLogs[progressLogs.length - 1];
    expect(finalLog?.status).not.toBe("completed");
  }, 15000);
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GenerationProject } from "../src/types/project";
import type { PipelineContext } from "../src/lib/pipelines";

// happy-dom has no canvas: stub the raster helpers the pipeline relies on.
vi.mock("../src/lib/image-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof ImageUtils>();
  return {
    ...actual,
    createThumbnail: vi.fn(async (blob: Blob) => blob),
    proceduralRasterBlob: vi.fn(async () => new Blob([new Uint8Array(256)], { type: "image/jpeg" })),
  };
});

// Retry back-off must not slow the suite down.
vi.mock("../src/lib/async", async (importOriginal) => {
  const actual = await importOriginal<typeof AsyncModule>();
  return { ...actual, sleep: vi.fn(async () => undefined) };
});

import { imagePipeline, composePrompt } from "../src/lib/pipelines/image";
import { clearAllAssets, getAsset } from "../src/lib/asset-store";
import { _resetPollinationsState } from "../src/lib/pollinations";
import { IMAGE_MODELS } from "../src/lib/catalog";
import { proceduralRasterBlob } from "../src/lib/image-utils";
import type * as ImageUtils from "../src/lib/image-utils";
import type * as AsyncModule from "../src/lib/async";

function makeProject(overrides: Partial<GenerationProject> = {}): GenerationProject {
  const now = new Date().toISOString();
  return {
    id: "proj_test",
    type: "image",
    mediaKind: "image",
    title: "Test image",
    prompt: "a red bicycle leaning on a wall",
    model: "flux-realism-v2",
    aspectRatio: "1:1",
    quality: "high",
    status: "processing",
    progress: 0,
    favorite: false,
    createdAt: now,
    updatedAt: now,
    seed: 42,
    creditCost: 5,
    ...overrides,
  };
}

function makeContext(project: GenerationProject, signal = new AbortController().signal): PipelineContext & { stages: string[] } {
  const stages: string[] = [];
  return { project, signal, stages, report: (_progress, stage) => void stages.push(stage) };
}

const imageResponse = () => new Response(new Blob([new Uint8Array(512)], { type: "image/jpeg" }), { status: 200, headers: { "content-type": "image/jpeg" } });

describe("imagePipeline", () => {
  beforeEach(() => {
    _resetPollinationsState();
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    await clearAllAssets();
  });

  it("stores a Pollinations image and reports the provider", async () => {
    const fetchMock = vi.fn(async () => imageResponse());
    vi.stubGlobal("fetch", fetchMock);

    const ctx = makeContext(makeProject());
    const output = await imagePipeline(ctx);

    expect(output.providerSource).toBe("pollinations");
    expect(output.providerDetail).toMatch(/Pollinations .* seed 42/);
    expect(output.outputMimeType).toBe("image/jpeg");
    expect(output.width).toBe(1024);
    expect(output.height).toBe(1024);
    expect(output.outputAssetId).toBeDefined();
    expect(await getAsset(output.outputAssetId as string)).toBeDefined();
    expect(output.thumbnailAssetId).toBeDefined();
    expect(await getAsset(output.thumbnailAssetId as string)).toBeDefined();

    // Prompt carries the engine's style suffix and the seed.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = decodeURIComponent(String((fetchMock.mock.calls[0] as unknown[])[0]));
    const suffix = IMAGE_MODELS.find((m) => m.id === "flux-realism-v2")?.styleSuffix ?? "";
    expect(url).toContain("a red bicycle leaning on a wall");
    expect(url).toContain(suffix);
    expect(url).toContain("seed=42");
    expect(ctx.stages).toContain("Storing output");
  });

  it("falls back to a procedural render when the endpoint fails", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const ctx = makeContext(makeProject({ title: "Fallback test" }));
    const output = await imagePipeline(ctx);

    expect(output.providerSource).toBe("procedural");
    expect(output.providerDetail).toMatch(/HTTP 500/);
    expect(output.outputAssetId).toBeDefined();
    expect(await getAsset(output.outputAssetId as string)).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(proceduralRasterBlob).toHaveBeenCalledWith("Fallback test", 42, "1:1", 1024, 1024);
    expect(ctx.stages).toContain("Endpoint unavailable — rendering procedural fallback");
  });

  it("propagates aborts instead of falling back", async () => {
    const fetchMock = vi.fn(async () => imageResponse());
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    controller.abort();

    await expect(imagePipeline(makeContext(makeProject(), controller.signal))).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(proceduralRasterBlob).not.toHaveBeenCalled();
  });
});

describe("composePrompt", () => {
  it("appends the style suffix once", () => {
    expect(composePrompt("a cat", "photoreal")).toBe("a cat, photoreal");
    expect(composePrompt("a cat, photoreal", "photoreal")).toBe("a cat, photoreal");
    expect(composePrompt("a cat", undefined)).toBe("a cat");
  });
});

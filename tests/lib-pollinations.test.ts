import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_TIMEOUT_MS,
  MAX_PROMPT_LENGTH,
  POLLINATIONS_IMAGE_BASE,
  POLLINATIONS_MODEL,
  PollinationsError,
  RATE_LIMIT_WINDOW_MS,
  _resetPollinationsState,
  buildImageUrl,
  describeProvider,
  generateImage,
  getRateLimitRemainingMs,
  sanitizePrompt,
} from "../src/lib/pollinations";
import { deferred, flush, imageResponse } from "./helpers/fixtures";
import type * as AsyncModule from "../src/lib/async";

// Keep the real module except for `sleep`, so back-off and rate-limit waits
// are instant instead of burning the 15 s window.
vi.mock("../src/lib/async", async (orig) => ({
  ...(await orig<typeof AsyncModule>()),
  sleep: vi.fn().mockResolvedValue(undefined),
}));

const baseRequest = {
  prompt: "a neon skyline",
  width: 1024,
  height: 576,
  seed: 4242,
};

function textResponse(body = "not an image", contentType = "text/plain"): Response {
  return new Response(body, { status: 200, headers: { "content-type": contentType } });
}

beforeEach(() => {
  _resetPollinationsState();
});

afterEach(() => {
  vi.unstubAllGlobals();
  _resetPollinationsState();
});

describe("sanitizePrompt", () => {
  it("collapses whitespace and trims", () => {
    expect(sanitizePrompt("  a   neon \n skyline \t at dusk ")).toBe("a neon skyline at dusk");
  });

  it("caps the length", () => {
    const long = sanitizePrompt("x".repeat(MAX_PROMPT_LENGTH + 500));
    expect(long.length).toBe(MAX_PROMPT_LENGTH);
  });

  it("leaves a clean prompt untouched", () => {
    expect(sanitizePrompt("a neon skyline")).toBe("a neon skyline");
    expect(sanitizePrompt("")).toBe("");
  });
});

describe("buildImageUrl", () => {
  it("encodes the prompt into the path", () => {
    const url = buildImageUrl({ ...baseRequest, prompt: "a dog & cat, 100% good" });
    expect(url.startsWith(`${POLLINATIONS_IMAGE_BASE}/prompt/`)).toBe(true);
    expect(url).toContain(encodeURIComponent("a dog & cat, 100% good"));
    expect(url).not.toContain(" ");
  });

  it("sends width, height, seed, model and the privacy flags", () => {
    const url = new URL(buildImageUrl({ ...baseRequest, model: "flux-realism-v2" }));
    expect(url.searchParams.get("width")).toBe("1024");
    expect(url.searchParams.get("height")).toBe("576");
    expect(url.searchParams.get("seed")).toBe("4242");
    expect(url.searchParams.get("model")).toBe("flux-realism-v2");
    expect(url.searchParams.get("nologo")).toBe("true");
    expect(url.searchParams.get("private")).toBe("true");
  });

  it("defaults the model", () => {
    const url = new URL(buildImageUrl(baseRequest));
    expect(url.searchParams.get("model")).toBe(POLLINATIONS_MODEL);
  });

  it("only adds negative_prompt when one is supplied", () => {
    expect(new URL(buildImageUrl(baseRequest)).searchParams.has("negative_prompt")).toBe(false);
    expect(new URL(buildImageUrl({ ...baseRequest, negativePrompt: "   " })).searchParams.has("negative_prompt")).toBe(false);
    const withNegative = new URL(buildImageUrl({ ...baseRequest, negativePrompt: "  blurry   text " }));
    expect(withNegative.searchParams.get("negative_prompt")).toBe("blurry text");
  });

  it("sanitises the prompt before encoding it", () => {
    const url = buildImageUrl({ ...baseRequest, prompt: "  a   neon  skyline  " });
    expect(url).toContain(encodeURIComponent("a neon skyline"));
  });
});

describe("generateImage", () => {
  it("resolves with the blob, content type and attempt count on the first try", async () => {
    const fetchMock = vi.fn().mockResolvedValue(imageResponse());
    vi.stubGlobal("fetch", fetchMock);
    const onStatus = vi.fn();

    const result = await generateImage({ ...baseRequest, onStatus });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.attempts).toBe(1);
    expect(result.blob.size).toBeGreaterThan(64);
    expect(result.contentType).toBe("image/jpeg");
    expect(result.width).toBe(1024);
    expect(result.height).toBe(576);
    expect(result.url).toBe(buildImageUrl(baseRequest));
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(onStatus).toHaveBeenCalledWith(expect.stringContaining("Pollinations"));
  });

  it("passes an abort signal and CORS mode to fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(imageResponse());
    vi.stubGlobal("fetch", fetchMock);
    await generateImage(baseRequest);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.mode).toBe("cors");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("retries after a 403 and records the rate-limit window", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(imageResponse(403))
      .mockResolvedValueOnce(imageResponse());
    vi.stubGlobal("fetch", fetchMock);
    const onStatus = vi.fn();

    expect(getRateLimitRemainingMs()).toBe(0);
    const result = await generateImage({ ...baseRequest, onStatus });

    expect(result.attempts).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getRateLimitRemainingMs()).toBeGreaterThan(0);
    expect(getRateLimitRemainingMs()).toBeLessThanOrEqual(RATE_LIMIT_WINDOW_MS);
    expect(onStatus.mock.calls.flat().join(" ")).toMatch(/rate-limited/i);
  });

  it("treats 429 the same as 403", async () => {
    const fetchMock = vi.fn().mockResolvedValue(imageResponse(429));
    vi.stubGlobal("fetch", fetchMock);
    await expect(generateImage({ ...baseRequest, maxAttempts: 2 })).rejects.toMatchObject({
      name: "PollinationsError",
      kind: "rate-limited",
      status: 429,
    });
    expect(getRateLimitRemainingMs()).toBeGreaterThan(0);
  });

  it("rejects with kind 'not-image' when the body is not an image", async () => {
    const fetchMock = vi.fn().mockResolvedValue(textResponse());
    vi.stubGlobal("fetch", fetchMock);
    const error = await generateImage({ ...baseRequest, maxAttempts: 1 }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PollinationsError);
    expect((error as PollinationsError).kind).toBe("not-image");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects tiny image bodies as 'not-image' too", async () => {
    const fetchMock = vi.fn().mockResolvedValue(imageResponse(200, "image/jpeg", 8));
    vi.stubGlobal("fetch", fetchMock);
    await expect(generateImage({ ...baseRequest, maxAttempts: 1 })).rejects.toMatchObject({ kind: "not-image" });
  });

  it("rejects with kind 'http' on a 500 and retries up to maxAttempts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(imageResponse(500));
    vi.stubGlobal("fetch", fetchMock);
    const error = await generateImage({ ...baseRequest, maxAttempts: 3 }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PollinationsError);
    expect((error as PollinationsError).kind).toBe("http");
    expect((error as PollinationsError).status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("maps a transport failure to kind 'network'", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(generateImage({ ...baseRequest, maxAttempts: 1 })).rejects.toMatchObject({
      name: "PollinationsError",
      kind: "network",
    });
  });

  it("rejects with AbortError without fetching when the signal is already aborted", async () => {
    const fetchMock = vi.fn().mockResolvedValue(imageResponse());
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    controller.abort();

    await expect(generateImage({ ...baseRequest, signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("serialises calls so the anonymous quota is shared", async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    const queue = [first, second];
    const fetchMock = vi.fn(() => queue.shift()!.promise);
    vi.stubGlobal("fetch", fetchMock);

    const p1 = generateImage(baseRequest);
    const p2 = generateImage({ ...baseRequest, seed: 99 });
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);

    first.resolve(imageResponse());
    await p1;
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    second.resolve(imageResponse());
    await expect(p2).resolves.toMatchObject({ attempts: 1 });
  });

  it("keeps the chain alive after a failure", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError("boom")).mockResolvedValue(imageResponse());
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateImage({ ...baseRequest, maxAttempts: 1 })).rejects.toBeInstanceOf(PollinationsError);
    await expect(generateImage({ ...baseRequest, maxAttempts: 1 })).resolves.toMatchObject({ attempts: 1 });
  });
});

describe("module constants", () => {
  it("exposes the documented defaults", () => {
    expect(POLLINATIONS_IMAGE_BASE).toBe("https://image.pollinations.ai");
    expect(RATE_LIMIT_WINDOW_MS).toBe(15_000);
    expect(DEFAULT_TIMEOUT_MS).toBeGreaterThan(0);
    expect(MAX_PROMPT_LENGTH).toBeGreaterThan(100);
    expect(describeProvider()).toContain("Pollinations");
  });

  it("resets the shared rate-limit state", () => {
    expect(getRateLimitRemainingMs(Date.now() + RATE_LIMIT_WINDOW_MS * 2)).toBe(0);
  });
});

/**
 * Client for the public Pollinations image endpoint.
 *
 * Facts that shape this module (verified Sept 2026):
 *  - `GET https://image.pollinations.ai/prompt/{prompt}` returns a JPEG.
 *  - Anonymous use is rate-limited (roughly one request per 15 s); the
 *    endpoint answers 403/429 when the window is exceeded.
 *  - `/models` currently lists a single served model ("sana"); the
 *    `model` query parameter is accepted but the server picks the actual
 *    model. Our "engines" therefore steer the *prompt* (style suffixes)
 *    rather than the server model.
 *
 * All requests are serialised through one promise chain so several
 * concurrent jobs share the single anonymous quota instead of tripping
 * over each other, and a rate-limit response backs everything off.
 */
import { AbortError, anySignal, isAbortError, sleep, throwIfAborted } from "./async";

export const POLLINATIONS_IMAGE_BASE = "https://image.pollinations.ai";
export const POLLINATIONS_MODEL = "flux";
export const RATE_LIMIT_WINDOW_MS = 15_000;
export const DEFAULT_TIMEOUT_MS = 60_000;
export const MAX_PROMPT_LENGTH = 1_500;

export interface ImageRequest {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  seed: number;
  model?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  maxAttempts?: number;
  onStatus?: (message: string) => void;
}

export interface ImageResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  elapsedMs: number;
  attempts: number;
  contentType: string;
}

export class PollinationsError extends Error {
  status?: number;
  kind: "rate-limited" | "http" | "not-image" | "network" | "timeout";
  constructor(message: string, kind: PollinationsError["kind"], status?: number) {
    super(message);
    this.name = "PollinationsError";
    this.kind = kind;
    this.status = status;
  }
}

/** Collapses whitespace and caps length so URLs stay well-formed. */
export function sanitizePrompt(prompt: string): string {
  return prompt.replace(/\s+/g, " ").trim().slice(0, MAX_PROMPT_LENGTH);
}

export function buildImageUrl(req: Pick<ImageRequest, "prompt" | "negativePrompt" | "width" | "height" | "seed" | "model">): string {
  const params = new URLSearchParams({
    width: String(req.width),
    height: String(req.height),
    seed: String(req.seed),
    model: req.model ?? POLLINATIONS_MODEL,
    nologo: "true",
    private: "true",
  });
  if (req.negativePrompt?.trim()) params.set("negative_prompt", sanitizePrompt(req.negativePrompt));
  return `${POLLINATIONS_IMAGE_BASE}/prompt/${encodeURIComponent(sanitizePrompt(req.prompt))}?${params.toString()}`;
}

// ---- shared rate-limit state -------------------------------------------------

let rateLimitedUntil = 0;
let chain: Promise<unknown> = Promise.resolve();

export function getRateLimitRemainingMs(now = Date.now()): number {
  return Math.max(0, rateLimitedUntil - now);
}

/** Test hook. */
export function _resetPollinationsState(): void {
  rateLimitedUntil = 0;
  chain = Promise.resolve();
}

async function fetchWithTimeout(url: string, timeoutMs: number, signal?: AbortSignal): Promise<Response> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: anySignal([signal, timeout.signal]), mode: "cors" });
  } catch (err) {
    if (timeout.signal.aborted && !signal?.aborted) {
      throw new PollinationsError(`Timed out after ${Math.round(timeoutMs / 1000)}s`, "timeout");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function attemptOnce(req: ImageRequest, url: string): Promise<{ blob: Blob; contentType: string }> {
  const res = await fetchWithTimeout(url, req.timeoutMs ?? DEFAULT_TIMEOUT_MS, req.signal);
  if (res.status === 429 || res.status === 403) {
    throw new PollinationsError("Public endpoint rate limit reached", "rate-limited", res.status);
  }
  if (!res.ok) {
    throw new PollinationsError(`Endpoint responded with HTTP ${res.status}`, "http", res.status);
  }
  const contentType = res.headers.get("content-type") ?? "";
  const blob = await res.blob();
  const looksLikeImage = contentType.startsWith("image/") || blob.type.startsWith("image/");
  if (!looksLikeImage || blob.size < 64) {
    throw new PollinationsError(`Endpoint returned ${contentType || "an empty body"} instead of an image`, "not-image", res.status);
  }
  return { blob, contentType: contentType || blob.type };
}

/**
 * Generates an image. Resolves with the blob (so callers can persist it)
 * and rejects with PollinationsError/AbortError.
 */
export function generateImage(req: ImageRequest): Promise<ImageResult> {
  const url = buildImageUrl(req);
  const maxAttempts = req.maxAttempts ?? 3;

  const run = async (): Promise<ImageResult> => {
    const started = performance.now();
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      throwIfAborted(req.signal);

      const waitMs = getRateLimitRemainingMs();
      if (waitMs > 0) {
        const seconds = Math.ceil(waitMs / 1000);
        req.onStatus?.(`Public endpoint is rate-limited — waiting ${seconds}s for the next slot`);
        await sleep(waitMs, req.signal);
      }

      req.onStatus?.(attempt === 1 ? "Requesting image from Pollinations…" : `Retrying Pollinations (attempt ${attempt} of ${maxAttempts})…`);

      try {
        const { blob, contentType } = await attemptOnce(req, url);
        return {
          blob,
          url,
          width: req.width,
          height: req.height,
          elapsedMs: Math.round(performance.now() - started),
          attempts: attempt,
          contentType,
        };
      } catch (err) {
        if (isAbortError(err) || req.signal?.aborted) throw new AbortError();
        lastError = err;
        if (err instanceof PollinationsError && err.kind === "rate-limited") {
          rateLimitedUntil = Date.now() + RATE_LIMIT_WINDOW_MS;
          continue;
        }
        if (attempt < maxAttempts) {
          await sleep(1500 * attempt, req.signal);
        }
      }
    }

    if (lastError instanceof PollinationsError) throw lastError;
    if (lastError instanceof Error) throw new PollinationsError(lastError.message || "Network error", "network");
    throw new PollinationsError("Unknown Pollinations failure", "network");
  };

  // Serialise through the shared chain so the anonymous quota is respected.
  const result = chain.then(run, run);
  chain = result.catch(() => undefined);
  return result;
}

export function describeProvider(): string {
  return "Pollinations public endpoint (image.pollinations.ai)";
}

export class AbortError extends Error {
  constructor(message = "Operation aborted") {
    super(message);
    this.name = "AbortError";
  }
}

export function isAbortError(err: unknown): boolean {
  return (
    err instanceof AbortError ||
    (typeof err === "object" && err !== null && "name" in err && (err as { name?: string }).name === "AbortError")
  );
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new AbortError();
}

/** Sleep that rejects immediately with AbortError when the signal aborts. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AbortError());
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new AbortError());
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** Combines several abort signals (polyfills AbortSignal.any). */
export function anySignal(signals: Array<AbortSignal | undefined>): AbortSignal {
  const list = signals.filter((s): s is AbortSignal => !!s);
  if ("any" in AbortSignal && typeof AbortSignal.any === "function") {
    return AbortSignal.any(list);
  }
  const controller = new AbortController();
  for (const s of list) {
    if (s.aborted) {
      controller.abort();
      break;
    }
    s.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}

/** Runs `fn` with a timeout signal merged into the caller's signal. */
export async function withTimeout<T>(
  ms: number,
  fn: (signal: AbortSignal) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), ms);
  try {
    return await fn(anySignal([signal, timeout.signal]));
  } finally {
    clearTimeout(timer);
  }
}

export function nextFrame(): Promise<number> {
  return new Promise((resolve) =>
    typeof requestAnimationFrame === "function" ? requestAnimationFrame(resolve) : setTimeout(() => resolve(0), 16),
  );
}

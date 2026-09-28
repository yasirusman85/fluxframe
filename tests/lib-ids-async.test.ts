import { afterEach, describe, expect, it, vi } from "vitest";
import { createId, hashString, randomSeed } from "../src/lib/ids";
import { AbortError, anySignal, isAbortError, nextFrame, sleep, throwIfAborted, withTimeout } from "../src/lib/async";

afterEach(() => {
  vi.useRealTimers();
});

describe("createId", () => {
  it("prefixes with the given namespace", () => {
    expect(createId("proj")).toMatch(/^proj_[a-z0-9]+$/);
    expect(createId("asset")).toMatch(/^asset_/);
  });

  it("defaults the prefix to 'id'", () => {
    expect(createId()).toMatch(/^id_/);
  });

  it("stays unique across 1000 ids", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) ids.add(createId("proj"));
    expect(ids.size).toBe(1000);
  });

  it("produces ids long enough to be collision resistant", () => {
    expect(createId("x").length).toBeGreaterThan(14);
  });
});

describe("hashString", () => {
  it("is deterministic", () => {
    expect(hashString("fluxframe")).toBe(hashString("fluxframe"));
    expect(hashString("")).toBe(hashString(""));
  });

  it("is sensitive to the input", () => {
    expect(hashString("a")).not.toBe(hashString("b"));
    expect(hashString("ab")).not.toBe(hashString("ba"));
    expect(hashString("prompt")).not.toBe(hashString("prompt "));
  });

  it("returns an unsigned 32-bit integer", () => {
    for (const input of ["", "a", "a neon skyline at dusk", "🚀 rocket"]) {
      const h = hashString(input);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it("spreads similar inputs apart", () => {
    const hashes = new Set(Array.from({ length: 200 }, (_, i) => hashString(`seed-${i}`)));
    expect(hashes.size).toBe(200);
  });
});

describe("randomSeed", () => {
  it("returns integers inside the signed 32-bit range", () => {
    for (let i = 0; i < 200; i++) {
      const seed = randomSeed();
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(2_147_483_647);
    }
  });

  it("does not return the same value every time", () => {
    const seeds = new Set(Array.from({ length: 50 }, () => randomSeed()));
    expect(seeds.size).toBeGreaterThan(1);
  });
});

describe("sleep", () => {
  it("resolves once the timer fires", async () => {
    vi.useFakeTimers();
    const done = vi.fn();
    const promise = sleep(1000).then(done);
    await vi.advanceTimersByTimeAsync(999);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await promise;
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("rejects with AbortError when the signal aborts mid-sleep", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const promise = sleep(5000, controller.signal);
    const assertion = expect(promise).rejects.toBeInstanceOf(AbortError);
    controller.abort();
    await assertion;
  });

  it("rejects immediately when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(sleep(1000, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("anySignal", () => {
  it("aborts when any input aborts", () => {
    const a = new AbortController();
    const b = new AbortController();
    const merged = anySignal([a.signal, undefined, b.signal]);
    expect(merged.aborted).toBe(false);
    b.abort();
    expect(merged.aborted).toBe(true);
  });

  it("is already aborted when an input was aborted up front", () => {
    const a = new AbortController();
    a.abort();
    expect(anySignal([a.signal]).aborted).toBe(true);
  });

  it("returns a live signal for an empty list", () => {
    const merged = anySignal([undefined, undefined]);
    expect(merged.aborted).toBe(false);
  });

  describe("without a native AbortSignal.any", () => {
    let patched = false;

    const removeNativeAny = () => {
      Object.defineProperty(AbortSignal, "any", { value: undefined, configurable: true, writable: true });
      patched = true;
    };

    afterEach(() => {
      if (patched) {
        delete (AbortSignal as unknown as { any?: unknown }).any;
        patched = false;
      }
    });

    it("falls back to the manual polyfill", () => {
      removeNativeAny();
      expect(typeof (AbortSignal as unknown as { any?: unknown }).any).toBe("undefined");
      const a = new AbortController();
      const b = new AbortController();
      const merged = anySignal([a.signal, b.signal]);
      expect(merged.aborted).toBe(false);
      a.abort();
      expect(merged.aborted).toBe(true);
    });

    it("short-circuits on an already-aborted input in the polyfill", () => {
      removeNativeAny();
      const already = new AbortController();
      already.abort();
      const later = new AbortController();
      const merged = anySignal([already.signal, later.signal]);
      expect(merged.aborted).toBe(true);
    });

    it("restores the native implementation afterwards", () => {
      expect(typeof AbortSignal.any).toBe("function");
    });
  });
});

describe("withTimeout", () => {
  it("resolves with the callback result and passes a live signal", async () => {
    vi.useFakeTimers();
    const result = await withTimeout(1000, async (signal) => {
      expect(signal.aborted).toBe(false);
      return "ok";
    });
    expect(result).toBe("ok");
  });

  it("aborts the callback signal once the timeout elapses", async () => {
    vi.useFakeTimers();
    const promise = withTimeout(50, (signal) => sleep(10_000, signal));
    const assertion = expect(promise).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(60);
    await assertion;
  });

  it("propagates the caller's abort", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const promise = withTimeout(10_000, (signal) => sleep(10_000, signal), controller.signal);
    const assertion = expect(promise).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await assertion;
  });
});

describe("throwIfAborted", () => {
  it("does nothing without a signal or before abort", () => {
    expect(() => throwIfAborted()).not.toThrow();
    expect(() => throwIfAborted(new AbortController().signal)).not.toThrow();
  });

  it("throws AbortError once aborted", () => {
    const controller = new AbortController();
    controller.abort();
    expect(() => throwIfAborted(controller.signal)).toThrow(AbortError);
  });
});

describe("isAbortError", () => {
  it("recognises our own AbortError", () => {
    expect(isAbortError(new AbortError())).toBe(true);
    expect(new AbortError().message).toBe("Operation aborted");
    expect(new AbortError("custom").message).toBe("custom");
  });

  it("recognises DOMException-like values by name", () => {
    expect(isAbortError({ name: "AbortError" })).toBe(true);
    const domLike = new Error("aborted");
    domLike.name = "AbortError";
    expect(isAbortError(domLike)).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isAbortError(new Error("boom"))).toBe(false);
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
    expect(isAbortError("AbortError")).toBe(false);
    expect(isAbortError({ name: "TypeError" })).toBe(false);
  });
});

describe("nextFrame", () => {
  it("resolves with a timestamp", async () => {
    await expect(nextFrame()).resolves.toEqual(expect.any(Number));
  });
});

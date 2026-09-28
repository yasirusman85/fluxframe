import { describe, expect, it } from "vitest";
import { ASPECT_RATIOS, cssAspect, dimensionsFor, parseRatio, videoDimensionsFor } from "../src/lib/aspect";

const isMultipleOf16 = (n: number) => n % 16 === 0;

describe("parseRatio", () => {
  it("parses well-formed ratios", () => {
    expect(parseRatio("16:9")).toBeCloseTo(16 / 9, 6);
    expect(parseRatio("1:1")).toBe(1);
    expect(parseRatio("9:16")).toBeCloseTo(0.5625, 6);
    expect(parseRatio("21:9")).toBeCloseTo(21 / 9, 6);
  });

  it("falls back to 16:9 for anything unusable", () => {
    expect(parseRatio("")).toBeCloseTo(16 / 9, 6);
    expect(parseRatio("nonsense")).toBeCloseTo(16 / 9, 6);
    expect(parseRatio("0:5")).toBeCloseTo(16 / 9, 6);
    expect(parseRatio("5:0")).toBeCloseTo(16 / 9, 6);
    expect(parseRatio("16/9")).toBeCloseTo(16 / 9, 6);
  });
});

describe("dimensionsFor", () => {
  it("honours the long edge in landscape", () => {
    expect(dimensionsFor("16:9", 1024)).toEqual({ width: 1024, height: 576 });
    expect(dimensionsFor("4:3", 512)).toEqual({ width: 512, height: 384 });
  });

  it("honours the long edge in portrait", () => {
    const portrait = dimensionsFor("9:16", 1024);
    expect(portrait.height).toBe(1024);
    expect(portrait.width).toBe(576);
    expect(Math.max(portrait.width, portrait.height)).toBe(1024);
  });

  it("keeps squares square", () => {
    expect(dimensionsFor("1:1", 1024)).toEqual({ width: 1024, height: 1024 });
  });

  it("snaps every side to a multiple of 16", () => {
    for (const ratio of ASPECT_RATIOS) {
      for (const longEdge of [512, 720, 1024, 1280]) {
        const { width, height } = dimensionsFor(ratio.id, longEdge);
        expect(isMultipleOf16(width), `${ratio.id}@${longEdge} width`).toBe(true);
        expect(isMultipleOf16(height), `${ratio.id}@${longEdge} height`).toBe(true);
      }
    }
  });

  it("stays close to the requested ratio after snapping", () => {
    for (const ratio of ASPECT_RATIOS) {
      const { width, height } = dimensionsFor(ratio.id, 1024);
      expect(width / height).toBeCloseTo(ratio.value, 1);
    }
  });

  it("never returns a side below 64", () => {
    const tiny = dimensionsFor("21:9", 64);
    expect(tiny.width).toBeGreaterThanOrEqual(64);
    expect(tiny.height).toBeGreaterThanOrEqual(64);
  });

  it("defaults the long edge to 1024", () => {
    expect(dimensionsFor("16:9")).toEqual({ width: 1024, height: 576 });
  });

  it("uses 16:9 for an invalid ratio", () => {
    expect(dimensionsFor("nope", 1024)).toEqual(dimensionsFor("16:9", 1024));
    expect(dimensionsFor("", 1024)).toEqual({ width: 1024, height: 576 });
  });
});

describe("videoDimensionsFor", () => {
  it("uses a 1280 long edge", () => {
    expect(videoDimensionsFor("16:9")).toEqual({ width: 1280, height: 720 });
    expect(videoDimensionsFor("9:16")).toEqual({ width: 720, height: 1280 });
    expect(videoDimensionsFor("1:1")).toEqual({ width: 1280, height: 1280 });
  });

  it("matches dimensionsFor at 1280", () => {
    for (const ratio of ASPECT_RATIOS) {
      expect(videoDimensionsFor(ratio.id)).toEqual(dimensionsFor(ratio.id, 1280));
      const { width, height } = videoDimensionsFor(ratio.id);
      expect(Math.max(width, height)).toBe(1280);
    }
  });
});

describe("cssAspect", () => {
  it("renders a CSS aspect-ratio pair", () => {
    expect(cssAspect("16:9")).toBe("16 / 9");
    expect(cssAspect("1:1")).toBe("1 / 1");
    expect(cssAspect("21:9")).toBe("21 / 9");
  });

  it("falls back to 16 / 9 for malformed input", () => {
    expect(cssAspect("")).toBe("16 / 9");
    expect(cssAspect("nope")).toBe("16 / 9");
    expect(cssAspect(":9")).toBe("16 / 9");
  });
});

describe("ASPECT_RATIOS", () => {
  it("has unique ids", () => {
    const ids = ASPECT_RATIOS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("describes every ratio with a label, description and positive value", () => {
    expect(ASPECT_RATIOS.length).toBeGreaterThan(3);
    for (const ratio of ASPECT_RATIOS) {
      expect(ratio.label.length).toBeGreaterThan(0);
      expect(ratio.description.length).toBeGreaterThan(0);
      expect(ratio.value).toBeGreaterThan(0);
      expect(ratio.id).toMatch(/^\d+:\d+$/);
      expect(parseRatio(ratio.id)).toBeCloseTo(ratio.value, 6);
    }
  });
});

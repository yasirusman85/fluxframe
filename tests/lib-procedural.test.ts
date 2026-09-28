import { describe, expect, it } from "vitest";
import { proceduralBlob, proceduralDataUrl, proceduralSvg } from "../src/lib/procedural";
import { dimensionsFor } from "../src/lib/aspect";

describe("proceduralSvg", () => {
  it("is deterministic for a given seed", () => {
    const a = proceduralSvg({ title: "Neon skyline", seed: 42 });
    const b = proceduralSvg({ title: "Neon skyline", seed: 42 });
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(400);
  });

  it("differs across seeds", () => {
    const a = proceduralSvg({ title: "Neon skyline", seed: 42 });
    const b = proceduralSvg({ title: "Neon skyline", seed: 43 });
    expect(a).not.toBe(b);
  });

  it("derives a stable seed from a string seed", () => {
    const a = proceduralSvg({ title: "x", seed: "stable-seed" });
    const b = proceduralSvg({ title: "x", seed: "stable-seed" });
    const c = proceduralSvg({ title: "x", seed: "other-seed" });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("falls back to hashing the title when no seed is given", () => {
    expect(proceduralSvg({ title: "Same title" })).toBe(proceduralSvg({ title: "Same title" }));
    expect(proceduralSvg({ title: "Same title" })).not.toBe(proceduralSvg({ title: "Other title" }));
  });

  it("produces a well-formed svg document", () => {
    const svg = proceduralSvg({ title: "Neon skyline", seed: 7 });
    expect(svg).toContain("<svg");
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
    expect(svg).toContain("<circle");
    expect(svg).toContain("<line");
    expect(svg).toContain("<text");
  });

  it("escapes XML-significant characters in the title and label", () => {
    const svg = proceduralSvg({ title: `<b>Tom & "Jerry"'s</b>`, label: "<LABEL>", seed: 1 });
    expect(svg).not.toContain("<b>");
    expect(svg).not.toContain("</b>");
    expect(svg).toContain("&lt;b&gt;");
    expect(svg).toContain("&amp;");
    expect(svg).toContain("&quot;");
    expect(svg).toContain("&apos;");
    expect(svg).toContain("&lt;LABEL&gt;");
  });

  it("truncates very long titles", () => {
    const svg = proceduralSvg({ title: "T".repeat(200), seed: 3 });
    expect(svg).toContain("T".repeat(60));
    expect(svg).not.toContain("T".repeat(61));
  });

  it("uses the default label when none is supplied", () => {
    expect(proceduralSvg({ title: "x", seed: 2 })).toContain("PROCEDURAL PREVIEW");
  });

  it("honours the aspect ratio and long edge", () => {
    for (const [ratio, longEdge] of [
      ["16:9", 960],
      ["9:16", 640],
      ["1:1", 512],
    ] as const) {
      const { width, height } = dimensionsFor(ratio, longEdge);
      const svg = proceduralSvg({ title: "x", seed: 5, aspectRatio: ratio, longEdge });
      expect(svg).toContain(`width="${width}"`);
      expect(svg).toContain(`height="${height}"`);
      expect(svg).toContain(`viewBox="0 0 ${width} ${height}"`);
    }
  });

  it("defaults to a 16:9 frame at 960px", () => {
    const { width, height } = dimensionsFor("16:9", 960);
    const svg = proceduralSvg({ title: "x", seed: 5 });
    expect(svg).toContain(`width="${width}"`);
    expect(svg).toContain(`height="${height}"`);
  });
});

describe("proceduralDataUrl", () => {
  it("emits an svg data URL that decodes back to the markup", () => {
    const options = { title: "Neon skyline", seed: 11 };
    const url = proceduralDataUrl(options);
    expect(url.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    const decoded = decodeURIComponent(url.slice("data:image/svg+xml;charset=utf-8,".length));
    expect(decoded).toBe(proceduralSvg(options));
  });

  it("percent-encodes characters that would break a URL", () => {
    const url = proceduralDataUrl({ title: "a b", seed: 12 });
    expect(url).not.toContain(" ");
    expect(url).not.toContain("#");
  });
});

describe("proceduralBlob", () => {
  it("returns an svg blob", async () => {
    const options = { title: "Neon skyline", seed: 13 };
    const blob = proceduralBlob(options);
    expect(blob.type).toBe("image/svg+xml");
    expect(blob.size).toBeGreaterThan(400);
    expect(await blob.text()).toBe(proceduralSvg(options));
  });
});

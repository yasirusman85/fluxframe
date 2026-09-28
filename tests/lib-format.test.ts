import { describe, expect, it } from "vitest";
import {
  formatBytes,
  formatDateTime,
  formatDuration,
  pluralize,
  slugify,
  timeAgo,
  titleFromPrompt,
} from "../src/lib/format";

describe("formatDuration", () => {
  it("formats zero as 0:00", () => {
    expect(formatDuration(0)).toBe("0:00");
  });

  it("pads seconds under ten", () => {
    expect(formatDuration(9)).toBe("0:09");
    expect(formatDuration(59)).toBe("0:59");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(3599)).toBe("59:59");
    expect(formatDuration(3600)).toBe("60:00");
  });

  it("floors fractional seconds", () => {
    expect(formatDuration(65.9)).toBe("1:05");
  });

  it("falls back to 0:00 for NaN, Infinity and negatives", () => {
    expect(formatDuration(Number.NaN)).toBe("0:00");
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe("0:00");
    expect(formatDuration(-1)).toBe("0:00");
    expect(formatDuration(-120)).toBe("0:00");
  });
});

describe("formatBytes", () => {
  it("returns 0 B for zero and invalid input", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(-5)).toBe("0 B");
    expect(formatBytes(Number.NaN)).toBe("0 B");
  });

  it("keeps whole bytes under a kilobyte", () => {
    expect(formatBytes(1)).toBe("1 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("uses one decimal below ten of a unit", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("rounds to whole units from ten upwards", () => {
    expect(formatBytes(10 * 1024)).toBe("10 KB");
  });

  it("scales to megabytes and gigabytes", () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatBytes(1024 ** 3)).toBe("1.0 GB");
    expect(formatBytes(24 * 1024 ** 3)).toBe("24 GB");
  });

  it("caps the unit list at GB", () => {
    expect(formatBytes(3 * 1024 ** 4)).toBe("3072 GB");
  });
});

describe("timeAgo", () => {
  const now = Date.UTC(2026, 2, 15, 12, 0, 0);
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it("says 'just now' under 45 seconds", () => {
    expect(timeAgo(ago(0), now)).toBe("just now");
    expect(timeAgo(ago(44_000), now)).toBe("just now");
  });

  it("clamps future timestamps to 'just now'", () => {
    expect(timeAgo(new Date(now + 60_000).toISOString(), now)).toBe("just now");
  });

  it("reports minutes", () => {
    expect(timeAgo(ago(5 * 60_000), now)).toBe("5m ago");
    expect(timeAgo(ago(59 * 60_000), now)).toBe("59m ago");
  });

  it("reports hours", () => {
    expect(timeAgo(ago(90 * 60_000), now)).toBe("1h ago");
    expect(timeAgo(ago(23 * 3_600_000), now)).toBe("23h ago");
  });

  it("reports days up to a week", () => {
    expect(timeAgo(ago(24 * 3_600_000), now)).toBe("1d ago");
    expect(timeAgo(ago(6 * 86_400_000), now)).toBe("6d ago");
  });

  it("falls back to a localised date beyond a week", () => {
    const older = timeAgo(ago(10 * 86_400_000), now);
    expect(older).not.toMatch(/ago/);
    expect(older).toMatch(/\d/);
    expect(older).toBe(new Date(ago(10 * 86_400_000)).toLocaleDateString(undefined, { month: "short", day: "numeric" }));
  });

  it("defaults `now` to the current time", () => {
    expect(timeAgo(new Date().toISOString())).toBe("just now");
  });
});

describe("formatDateTime", () => {
  it("includes the year and a time separator", () => {
    const out = formatDateTime("2026-03-15T12:30:00.000Z");
    expect(out).toContain("2026");
    expect(out).toContain("·");
    expect(out).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe("slugify", () => {
  it("lowercases, strips punctuation and joins with dashes", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
  });

  it("folds unicode accents away", () => {
    expect(slugify("Héllo Wörld!")).toBe("hello-world");
  });

  it("drops emoji and other symbols", () => {
    expect(slugify("Emoji 🚀 rocket")).toBe("emoji-rocket");
  });

  it("collapses runs of spaces and underscores", () => {
    expect(slugify("foo   bar__baz")).toBe("foo-bar-baz");
  });

  it("honours the length cap and trims trailing dashes", () => {
    const capped = slugify("a b ".repeat(30), 20);
    expect(capped.length).toBeLessThanOrEqual(20);
    expect(capped).toBe("a-b-a-b-a-b-a-b-a-b");
    expect(capped.endsWith("-")).toBe(false);
  });

  it("falls back to 'untitled' when nothing survives", () => {
    expect(slugify("")).toBe("untitled");
    expect(slugify("   ")).toBe("untitled");
    expect(slugify("!!!")).toBe("untitled");
    expect(slugify("🚀")).toBe("untitled");
  });
});

describe("titleFromPrompt", () => {
  it("uses the first clause and capitalises it", () => {
    expect(titleFromPrompt("a cinematic shot of a dog, running fast through snow")).toBe("A cinematic shot of a dog");
  });

  it("splits on any clause punctuation", () => {
    expect(titleFromPrompt("neon city. rain everywhere")).toBe("Neon city");
    expect(titleFromPrompt("portrait: soft light")).toBe("Portrait");
    expect(titleFromPrompt("line one\nline two")).toBe("Line one");
  });

  it("collapses whitespace before splitting", () => {
    expect(titleFromPrompt("  spaced   out   prompt  ")).toBe("Spaced out prompt");
  });

  it("stops at the length cap on a word boundary", () => {
    const title = titleFromPrompt("one two three four five six seven eight", undefined, 12);
    expect(title.length).toBeLessThanOrEqual(12);
    expect(title).toBe("One two");
  });

  it("hard-slices a single word longer than the cap", () => {
    expect(titleFromPrompt("supercalifragilistic", undefined, 10)).toBe("Supercalif");
  });

  it("returns the fallback for empty prompts", () => {
    expect(titleFromPrompt("")).toBe("Untitled generation");
    expect(titleFromPrompt("   \n  ")).toBe("Untitled generation");
    expect(titleFromPrompt("", "Untitled clip")).toBe("Untitled clip");
  });

  it("leaves an already capitalised title alone", () => {
    expect(titleFromPrompt("Neon skyline")).toBe("Neon skyline");
  });
});

describe("pluralize", () => {
  it("uses the singular for exactly one", () => {
    expect(pluralize(1, "project")).toBe("1 project");
  });

  it("uses the plural otherwise", () => {
    expect(pluralize(0, "project")).toBe("0 projects");
    expect(pluralize(2, "asset")).toBe("2 assets");
  });

  it("accepts an irregular plural", () => {
    expect(pluralize(1, "person", "people")).toBe("1 person");
    expect(pluralize(3, "person", "people")).toBe("3 people");
  });
});

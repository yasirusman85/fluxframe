import { describe, it, expect } from "vitest";
import { getDimensionsFromRatio, fetchPollinationsImage } from "../src/lib/pollinations";

describe("Pollinations Endpoint Client", () => {
  it("calculates exact width and height for all aspect ratios", () => {
    expect(getDimensionsFromRatio("16:9")).toEqual({ width: 1024, height: 576 });
    expect(getDimensionsFromRatio("1:1")).toEqual({ width: 1024, height: 1024 });
    expect(getDimensionsFromRatio("9:16")).toEqual({ width: 576, height: 1024 });
    expect(getDimensionsFromRatio("4:3")).toEqual({ width: 1024, height: 768 });
    expect(getDimensionsFromRatio("21:9")).toEqual({ width: 1280, height: 544 });
  });

  it("handles network failure or invalid model gracefully without crashing", async () => {
    const controller = new AbortController();
    controller.abort(); // Pre-aborted signal

    const result = await fetchPollinationsImage({
      prompt: "Test prompt",
      model: "flux-realism-v2",
      aspectRatio: "16:9",
      signal: controller.signal,
    });

    expect(result).toBeNull();
  });
});

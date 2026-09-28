/**
 * Regression: blocking a generation on insufficient credits must not destroy the
 * files the user already uploaded.
 *
 * `generate()` used to create the project first and delete it when the charge
 * failed. `deleteProject` garbage-collects assets no remaining project
 * references, so the just-uploaded keyframe/audio was wiped while the studio page
 * still held its id — the next attempt then rendered from a dangling reference.
 */
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useGeneration } from "../src/hooks/useGeneration";
import { useProjectStore } from "../src/store/project-store";
import { useCreditStore } from "../src/store/credit-store";
import { useUIStore } from "../src/store/ui-store";
import { getAsset, putAsset } from "../src/lib/asset-store";

describe("generate() credit guard", () => {
  beforeEach(() => {
    useProjectStore.setState({ projects: [], activeJobIds: [] });
    useCreditStore.getState().reset();
    useUIStore.setState({ toasts: [] });
  });

  it("keeps an uploaded source asset when the balance is too low", async () => {
    const sourceAssetId = await putAsset(new Blob(["keyframe"], { type: "image/jpeg" }), "image", { name: "keyframe.jpg" });
    useCreditStore.setState({ balance: 3 });

    const { result } = renderHook(() => useGeneration("cinema"));
    const project = result.current.generate({
      type: "cinema",
      prompt: "A lighthouse in a storm",
      model: "kling-3-cinema",
      aspectRatio: "16:9",
      sourceAssetId,
      creditCost: 30,
    });

    expect(project).toBeNull();
    expect(await getAsset(sourceAssetId)).toBeDefined();
    expect(useProjectStore.getState().projects).toHaveLength(0);
    expect(useCreditStore.getState().balance).toBe(3);
    expect(useCreditStore.getState().topUpOpen).toBe(true);
  });

  it("charges exactly once and keeps the asset when the balance is sufficient", async () => {
    const sourceAssetId = await putAsset(new Blob(["keyframe"], { type: "image/jpeg" }), "image", { name: "keyframe.jpg" });
    useCreditStore.setState({ balance: 500 });

    const { result } = renderHook(() => useGeneration("cinema"));
    const project = result.current.generate({
      type: "cinema",
      prompt: "A lighthouse in a storm",
      model: "kling-3-cinema",
      aspectRatio: "16:9",
      sourceAssetId,
      creditCost: 30,
    });

    expect(project).not.toBeNull();
    expect(await getAsset(sourceAssetId)).toBeDefined();
    expect(useCreditStore.getState().balance).toBe(470);
    expect(useCreditStore.getState().history.filter((t) => t.type === "spend")).toHaveLength(1);
  });
});

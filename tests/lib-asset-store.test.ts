/**
 * Asset store: binary outputs live in IndexedDB (or an in-memory fallback) and
 * are referenced by id from project metadata, so localStorage stays small.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAllAssets,
  deleteAsset,
  garbageCollectAssets,
  getAsset,
  listAssetIds,
  peekAssetUrl,
  putAsset,
  resolveAssetUrl,
  storageEstimate,
} from "../src/lib/asset-store";

const blob = (text: string, type = "image/jpeg") => new Blob([text], { type });

let created: string[] = [];
let revoked: string[] = [];

beforeEach(async () => {
  await clearAllAssets();
  created = [];
  revoked = [];
  let n = 0;
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => {
      const url = `blob:mock/${++n}`;
      created.push(url);
      return url;
    }),
    revokeObjectURL: vi.fn((url: string) => revoked.push(url)),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("putAsset / getAsset", () => {
  it("round-trips the blob with its kind and metadata", async () => {
    const id = await putAsset(blob("frame"), "image", { name: "keyframe.jpg", width: 1024, height: 576 });
    const stored = await getAsset(id);

    expect(id).toMatch(/^asset_/);
    expect(stored?.kind).toBe("image");
    expect(stored?.name).toBe("keyframe.jpg");
    expect(stored?.width).toBe(1024);
    expect(stored?.height).toBe(576);
    expect(await stored?.blob.text()).toBe("frame");
    expect(stored?.createdAt).toBeTypeOf("number");
  });

  it("gives every asset its own id", async () => {
    const ids = await Promise.all([putAsset(blob("a"), "image"), putAsset(blob("b"), "video"), putAsset(blob("c"), "audio")]);
    expect(new Set(ids).size).toBe(3);
    expect((await listAssetIds()).sort()).toEqual([...ids].sort());
  });

  it("returns undefined for an unknown id", async () => {
    expect(await getAsset("asset_missing")).toBeUndefined();
  });
});

describe("resolveAssetUrl", () => {
  it("creates one object URL per asset and caches it", async () => {
    const id = await putAsset(blob("frame"), "image");

    expect(peekAssetUrl(id)).toBeUndefined();
    const first = await resolveAssetUrl(id);
    const second = await resolveAssetUrl(id);

    expect(first).toBe(second);
    expect(peekAssetUrl(id)).toBe(first);
    expect(created).toHaveLength(1);
  });

  it("resolves to undefined for a missing asset or a missing id", async () => {
    expect(await resolveAssetUrl("asset_missing")).toBeUndefined();
    expect(await resolveAssetUrl(undefined)).toBeUndefined();
  });
});

describe("deleteAsset", () => {
  it("removes the record and revokes any cached object URL", async () => {
    const id = await putAsset(blob("frame"), "image");
    const url = await resolveAssetUrl(id);

    await deleteAsset(id);

    expect(await getAsset(id)).toBeUndefined();
    expect(revoked).toEqual([url]);
    expect(peekAssetUrl(id)).toBeUndefined();
    expect(await listAssetIds()).not.toContain(id);
  });

  it("ignores an undefined id", async () => {
    await expect(deleteAsset(undefined)).resolves.toBeUndefined();
  });
});

describe("garbageCollectAssets", () => {
  it("keeps referenced assets and drops the rest", async () => {
    const keep = await putAsset(blob("keep"), "image");
    const alsoKeep = await putAsset(blob("keep too"), "video");
    const orphan = await putAsset(blob("orphan"), "image");

    const removed = await garbageCollectAssets(new Set([keep, alsoKeep]));

    expect(removed).toBe(1);
    expect(await getAsset(keep)).toBeDefined();
    expect(await getAsset(alsoKeep)).toBeDefined();
    expect(await getAsset(orphan)).toBeUndefined();
  });

  it("removes everything when nothing is referenced", async () => {
    await putAsset(blob("a"), "image");
    await putAsset(blob("b"), "image");

    expect(await garbageCollectAssets(new Set())).toBe(2);
    expect(await listAssetIds()).toEqual([]);
  });
});

describe("storageEstimate", () => {
  it("returns null when the browser exposes no estimate", async () => {
    vi.stubGlobal("navigator", { ...navigator, storage: undefined });
    expect(await storageEstimate()).toBeNull();
  });

  it("reports usage and quota when available", async () => {
    vi.stubGlobal("navigator", { ...navigator, storage: { estimate: async () => ({ usage: 2048, quota: 4096 }) } });
    expect(await storageEstimate()).toEqual({ usage: 2048, quota: 4096 });
  });
});

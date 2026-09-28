/**
 * Binary asset storage.
 *
 * Generated images/videos and uploaded files are stored as Blobs in
 * IndexedDB (via idb-keyval) and referenced by id from project metadata.
 * This keeps localStorage tiny, survives reloads, and lets downloads be
 * real files rather than cross-origin links. When IndexedDB is not
 * available (private mode, tests) we fall back to an in-memory map so
 * the app keeps working for the session.
 */
import { createStore, del, get, keys, set } from "idb-keyval";
import { createId } from "./ids";

export type AssetKind = "image" | "video" | "audio";

export interface StoredAsset {
  blob: Blob;
  kind: AssetKind;
  name?: string;
  createdAt: number;
  width?: number;
  height?: number;
  durationMs?: number;
}

type IdbStore = ReturnType<typeof createStore>;

const memory = new Map<string, StoredAsset>();
const urlCache = new Map<string, string>();
let idbStore: IdbStore | null = null;
let idbBroken = false;

function getIdb(): IdbStore | null {
  if (idbBroken) return null;
  if (typeof indexedDB === "undefined") return null;
  try {
    if (!idbStore) idbStore = createStore("fluxframe", "assets");
    return idbStore;
  } catch {
    idbBroken = true;
    return null;
  }
}

export async function putAsset(
  blob: Blob,
  kind: AssetKind,
  meta: Partial<Omit<StoredAsset, "blob" | "kind" | "createdAt">> = {},
): Promise<string> {
  const id = createId("asset");
  const record: StoredAsset = { blob, kind, createdAt: Date.now(), ...meta };
  const store = getIdb();
  if (store) {
    try {
      await set(id, record, store);
      return id;
    } catch (err) {
      console.warn("[asset-store] IndexedDB write failed, using memory", err);
      idbBroken = true;
    }
  }
  memory.set(id, record);
  return id;
}

export async function getAsset(id: string): Promise<StoredAsset | undefined> {
  const inMemory = memory.get(id);
  if (inMemory) return inMemory;
  const store = getIdb();
  if (!store) return undefined;
  try {
    return await get<StoredAsset>(id, store);
  } catch (err) {
    console.warn("[asset-store] IndexedDB read failed", err);
    return undefined;
  }
}

export async function deleteAsset(id: string | undefined): Promise<void> {
  if (!id) return;
  const url = urlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
  memory.delete(id);
  const store = getIdb();
  if (store) {
    try {
      await del(id, store);
    } catch {
      /* ignore */
    }
  }
}

export async function listAssetIds(): Promise<string[]> {
  const ids = new Set<string>(memory.keys());
  const store = getIdb();
  if (store) {
    try {
      for (const key of await keys(store)) ids.add(String(key));
    } catch {
      /* ignore */
    }
  }
  return [...ids];
}

/** Synchronous cache lookup; returns an object URL if the asset was resolved before. */
export function peekAssetUrl(id: string | undefined): string | undefined {
  return id ? urlCache.get(id) : undefined;
}

/** Resolves an asset to a cached object URL. */
export async function resolveAssetUrl(id: string | undefined): Promise<string | undefined> {
  if (!id) return undefined;
  const cached = urlCache.get(id);
  if (cached) return cached;
  const asset = await getAsset(id);
  if (!asset) return undefined;
  const url = URL.createObjectURL(asset.blob);
  urlCache.set(id, url);
  return url;
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return null;
  }
}

/** Removes assets that no project references any more. Returns removed count. */
export async function garbageCollectAssets(referenced: Set<string>): Promise<number> {
  let removed = 0;
  for (const id of await listAssetIds()) {
    if (!referenced.has(id)) {
      await deleteAsset(id);
      removed++;
    }
  }
  return removed;
}

/** Test hook: wipe everything (memory + IndexedDB). */
export async function clearAllAssets(): Promise<void> {
  for (const id of await listAssetIds()) await deleteAsset(id);
}

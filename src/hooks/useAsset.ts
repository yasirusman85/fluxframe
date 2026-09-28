import { useEffect, useState } from "react";
import { peekAssetUrl, resolveAssetUrl } from "../lib/asset-store";

export type AssetStatus = "idle" | "loading" | "ready" | "missing";

export interface AssetState {
  url?: string;
  status: AssetStatus;
}

/**
 * Resolves a stored asset id to an object URL. Falls back to `fallbackUrl`
 * (remote or data URL) when no asset id is given or the blob is missing.
 */
export function useAsset(assetId?: string, fallbackUrl?: string): AssetState {
  const [state, setState] = useState<AssetState>(() => {
    const cached = peekAssetUrl(assetId);
    if (cached) return { url: cached, status: "ready" };
    if (!assetId) return fallbackUrl ? { url: fallbackUrl, status: "ready" } : { status: "idle" };
    return { status: "loading" };
  });

  useEffect(() => {
    let alive = true;
    if (!assetId) {
      setState(fallbackUrl ? { url: fallbackUrl, status: "ready" } : { status: "idle" });
      return;
    }
    const cached = peekAssetUrl(assetId);
    if (cached) {
      setState({ url: cached, status: "ready" });
      return;
    }
    setState({ status: "loading" });
    resolveAssetUrl(assetId).then((url) => {
      if (!alive) return;
      if (url) setState({ url, status: "ready" });
      else setState(fallbackUrl ? { url: fallbackUrl, status: "ready" } : { status: "missing" });
    });
    return () => {
      alive = false;
    };
  }, [assetId, fallbackUrl]);

  return state;
}

export function useAssetUrl(assetId?: string, fallbackUrl?: string): string | undefined {
  return useAsset(assetId, fallbackUrl).url;
}

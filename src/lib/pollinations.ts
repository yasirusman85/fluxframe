// Pollinations Public AI Image Endpoint Integration

export interface PollinationsOptions {
  prompt: string;
  model: string;
  aspectRatio?: string;
  seed?: number;
  signal?: AbortSignal;
}

export interface PollinationsResult {
  url: string;
  providerSource: "pollinations-ai";
}

export function getDimensionsFromRatio(ratio: string = "16:9"): { width: number; height: number } {
  switch (ratio) {
    case "1:1":
      return { width: 1024, height: 1024 };
    case "9:16":
      return { width: 576, height: 1024 };
    case "4:3":
      return { width: 1024, height: 768 };
    case "21:9":
      return { width: 1280, height: 544 };
    case "16:9":
    default:
      return { width: 1024, height: 576 };
  }
}

/**
 * Fetches public AI generated image from Pollinations endpoint with AbortController signal support.
 * Returns lightweight remote image URL (avoids giant base64 localStorage overhead).
 */
export async function fetchPollinationsImage(
  options: PollinationsOptions
): Promise<PollinationsResult | null> {
  const { prompt, model, aspectRatio = "16:9", seed = Math.floor(Math.random() * 100000), signal } = options;
  const { width, height } = getDimensionsFromRatio(aspectRatio);

  let pollModel = "flux";
  if (model === "studio-cinema-xl") pollModel = "flux-realism";
  if (model === "cyber-concept-pro") pollModel = "flux-anime";
  if (model === "hyperdetail-ultra") pollModel = "flux-3d";

  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt
  )}?width=${width}&height=${height}&seed=${seed}&model=${pollModel}&nologo=true`;

  // Create 12s timeout controller merged with caller abort signal
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), 12000);

  const combinedSignal = signal
    ? AbortSignal.any
      ? AbortSignal.any([signal, timeoutController.signal])
      : signal
    : timeoutController.signal;

  try {
    const response = await fetch(imageUrl, { signal: combinedSignal, method: "GET" });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Pollinations returned HTTP ${response.status}`);
      return null;
    }

    // Verify content type is image
    const contentType = response.headers.get("content-type");
    if (contentType && !contentType.includes("image") && !contentType.includes("octet-stream")) {
      console.warn("Pollinations response is not an image format:", contentType);
      return null;
    }

    // Preserve original remote URL for lightweight storage
    return {
      url: imageUrl,
      providerSource: "pollinations-ai",
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      console.info("Pollinations image request aborted or timed out.");
    } else {
      console.warn("Pollinations fetch error:", err);
    }
    return null;
  }
}

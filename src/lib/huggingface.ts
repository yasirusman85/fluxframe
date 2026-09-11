// Open-Source & Free AI Generation Models Client (Zero Token / Zero Login)

export interface GenerationOptions {
  prompt: string;
  model: string;
  aspectRatio?: string;
  seed?: number;
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
 * Generates real AI imagery using open-source Flux / Stable Diffusion models via Pollinations AI & Hugging Face.
 * Requires NO API keys, NO authentication, NO tokens.
 */
export async function generateOpenSourceAIImage(options: GenerationOptions): Promise<string | null> {
  const { prompt, model, aspectRatio = "16:9", seed = Math.floor(Math.random() * 100000) } = options;
  const { width, height } = getDimensionsFromRatio(aspectRatio);

  // Map internal model IDs to Pollinations / HF open models
  let pollModel = "flux";
  if (model === "studio-cinema-xl") pollModel = "flux-realism";
  if (model === "cyber-concept-pro") pollModel = "flux-anime";
  if (model === "hyperdetail-ultra") pollModel = "flux-3d";

  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt
  )}?width=${width}&height=${height}&seed=${seed}&model=${pollModel}&nologo=true`;

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.warn(`Open AI image endpoint returned ${response.status}`);
      return null;
    }

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("Open AI model fetch error:", err);
    return null;
  }
}

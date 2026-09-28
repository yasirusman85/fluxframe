/**
 * Sample projects seeded into an empty library so first-run users (and
 * reviewers) see a populated product. They reference the static showcase
 * images generated with the same Pollinations pipeline the app uses.
 */
import type { GenerationProject } from "../types/project";
import { SHOWCASE_PRESETS } from "./catalog";
import { dimensionsFor } from "./aspect";

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

const SAMPLE_IDS = ["valkyrie", "noir-detective", "glass-spire", "editorial-portrait", "celestial-dragon", "market-illustration"];

export const SAMPLE_PROJECTS: GenerationProject[] = SAMPLE_IDS.map((id, index) => {
  const preset = SHOWCASE_PRESETS.find((p) => p.id === id)!;
  const { width, height } = dimensionsFor(preset.aspectRatio, 1024);
  return {
    id: `sample-${id}`,
    type: "image",
    mediaKind: "image",
    title: preset.title,
    prompt: preset.prompt,
    model: preset.model,
    aspectRatio: preset.aspectRatio,
    width,
    height,
    quality: "high",
    status: "completed",
    progress: 100,
    outputUrl: preset.previewUrl,
    thumbnailUrl: preset.previewUrl,
    outputMimeType: "image/jpeg",
    favorite: index < 2,
    createdAt: hoursAgo(20 + index * 7),
    updatedAt: hoursAgo(20 + index * 7),
    completedAt: hoursAgo(20 + index * 7),
    seed: preset.seed,
    creditCost: 0,
    providerSource: "pollinations",
    providerDetail: "Showcase sample generated with the image pipeline",
    tags: ["sample"],
    origin: "studio",
  };
});

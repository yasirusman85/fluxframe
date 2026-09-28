/**
 * Every studio accepts the same query parameters so Explore, the command
 * palette, project "remix" and the node canvas can deep-link into it:
 *   prompt, negative, model, ratio, duration, camera (preset id),
 *   product, template, tone, script, source (asset id), remix (project id)
 */
import type { GenerationProject } from "../types/project";
import { STUDIO_ROUTES } from "../types/project";

export interface StudioParams {
  prompt?: string;
  negative?: string;
  model?: string;
  ratio?: string;
  duration?: number;
  camera?: string;
  product?: string;
  template?: string;
  tone?: string;
  script?: string;
  source?: string;
  remix?: string;
}

export function parseStudioParams(search: URLSearchParams): StudioParams {
  const get = (key: string) => search.get(key)?.trim() || undefined;
  const duration = Number(search.get("duration"));
  return {
    prompt: get("prompt"),
    negative: get("negative"),
    model: get("model"),
    ratio: get("ratio"),
    duration: Number.isFinite(duration) && duration > 0 ? duration : undefined,
    camera: get("camera"),
    product: get("product"),
    template: get("template"),
    tone: get("tone"),
    script: get("script"),
    source: get("source"),
    remix: get("remix"),
  };
}

export function buildStudioUrl(route: string, params: StudioParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || value === null) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${route}?${query}` : route;
}

/** Deep link that re-opens a project's settings in its studio. */
export function remixUrl(project: GenerationProject): string {
  return buildStudioUrl(STUDIO_ROUTES[project.type], {
    prompt: project.prompt,
    negative: project.negativePrompt,
    model: project.model,
    ratio: project.aspectRatio,
    duration: project.duration,
    camera: project.cameraMotion?.preset,
    product: project.marketing?.productName,
    template: project.marketing?.template,
    tone: project.marketing?.tone,
    script: project.lipsync?.script,
    source: project.sourceAssetId ?? project.keyframeAssetId,
    remix: project.id,
  });
}

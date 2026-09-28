/**
 * Pure helpers for the Image Studio form: defaults, query-param prefill and
 * "remix" from an existing project. Kept free of React so they are trivial
 * to unit test.
 */
import type { GenerationProject, Quality } from "../../types/project";
import type { StudioParams } from "../../lib/query-params";
import { IMAGE_MODELS } from "../../lib/catalog";
import type { ModelInfo } from "../../lib/catalog";
import { ASPECT_RATIOS } from "../../lib/aspect";

export interface ImageStudioForm {
  prompt: string;
  negativePrompt: string;
  modelId: string;
  ratio: string;
  quality: Quality;
  /** `null` lets the store pick a random seed. */
  seed: number | null;
  advancedOpen: boolean;
}

export const DEFAULT_IMAGE_MODEL_ID = IMAGE_MODELS[0].id;
export const DEFAULT_IMAGE_RATIO = "16:9";
export const DEFAULT_IMAGE_QUALITY: Quality = "standard";
export const MAX_SEED = 2_147_483_647;

export const QUALITY_OPTIONS: Array<{ value: Quality; label: string; testId: string }> = [
  { value: "draft", label: "Draft", testId: "quality-draft" },
  { value: "standard", label: "Standard", testId: "quality-standard" },
  { value: "high", label: "High", testId: "quality-high" },
];

export const IMAGE_RATIO_IDS = ASPECT_RATIOS.map((ratio) => ratio.id);

export function isImageModelId(id: string | undefined): id is string {
  return typeof id === "string" && IMAGE_MODELS.some((model) => model.id === id);
}

export function isRatioId(id: string | undefined): id is string {
  return typeof id === "string" && ASPECT_RATIOS.some((ratio) => ratio.id === id);
}

export function findImageModel(id: string): ModelInfo {
  return IMAGE_MODELS.find((model) => model.id === id) ?? IMAGE_MODELS[0];
}

/** Clamps user/query input to a valid non-negative integer seed, or null. */
export function normalizeSeed(value: string | number | undefined | null): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(n, MAX_SEED);
}

export function defaultImageForm(): ImageStudioForm {
  return {
    prompt: "",
    negativePrompt: "",
    modelId: DEFAULT_IMAGE_MODEL_ID,
    ratio: DEFAULT_IMAGE_RATIO,
    quality: DEFAULT_IMAGE_QUALITY,
    seed: null,
    advancedOpen: false,
  };
}

/**
 * Builds the initial form from studio query params. Unknown models/ratios
 * fall back to defaults. When `remix` points at a known project its seed and
 * quality are restored too so the result is reproducible.
 */
export function formFromParams(params: StudioParams, getProject?: (id: string) => GenerationProject | undefined): ImageStudioForm {
  const source = params.remix && getProject ? getProject(params.remix) : undefined;
  const base = source ? formFromProject(source) : defaultImageForm();
  const negativePrompt = params.negative ?? base.negativePrompt;
  const form: ImageStudioForm = {
    ...base,
    prompt: params.prompt ?? base.prompt,
    negativePrompt,
    modelId: isImageModelId(params.model) ? params.model : base.modelId,
    ratio: isRatioId(params.ratio) ? params.ratio : base.ratio,
  };
  form.advancedOpen = Boolean(form.negativePrompt || form.seed !== null);
  return form;
}

/** Restores every setting of an existing image project ("remix"). */
export function formFromProject(project: GenerationProject): ImageStudioForm {
  const negativePrompt = project.negativePrompt ?? "";
  const seed = normalizeSeed(project.seed);
  return {
    prompt: project.prompt,
    negativePrompt,
    modelId: isImageModelId(project.model) ? project.model : DEFAULT_IMAGE_MODEL_ID,
    ratio: isRatioId(project.aspectRatio) ? project.aspectRatio : DEFAULT_IMAGE_RATIO,
    quality: project.quality ?? DEFAULT_IMAGE_QUALITY,
    seed,
    advancedOpen: Boolean(negativePrompt || seed !== null),
  };
}

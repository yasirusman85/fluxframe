/**
 * Pure helpers for the Cinema Studio form: defaults, query-param prefill,
 * "remix" from an existing project and the shot-sheet copy. Kept free of
 * React so they are trivial to unit test — every deep-linkable value is
 * validated here, never in the page.
 */
import type { CameraMotionSettings, GenerationProject } from "../../types/project";
import type { StudioParams } from "../../lib/query-params";
import { CAMERA_PRESETS, CINEMA_MODELS, DEFAULT_CAMERA, VIDEO_DURATIONS, cameraFromPreset } from "../../lib/catalog";
import type { ModelInfo } from "../../lib/catalog";

export interface CinemaStudioForm {
  prompt: string;
  modelId: string;
  ratio: string;
  /** Seconds; one of VIDEO_DURATIONS. */
  duration: number;
  /** 1..10 — the scale the motion renderer expects (6 = catalogue default). */
  motionStrength: number;
  camera: CameraMotionSettings;
  /** Stored asset id of an uploaded or deep-linked keyframe. */
  sourceAssetId?: string;
  /** Object URL of a just-uploaded keyframe so the preview appears instantly. */
  sourceUrl?: string;
  sourceName?: string;
}

export const CINEMA_RATIO_IDS = ["16:9", "21:9", "9:16", "1:1"];
export const DEFAULT_CINEMA_MODEL_ID = CINEMA_MODELS[0].id;
export const DEFAULT_CINEMA_RATIO = "16:9";
export const DEFAULT_CINEMA_DURATION = 5;
export const MIN_MOTION_STRENGTH = 1;
export const MAX_MOTION_STRENGTH = 10;
export const DEFAULT_MOTION_STRENGTH = 6;

/** The one engine whose renders are speed-ramped (see pipelines/motion.ts). */
export const SPEED_RAMP_MODEL_ID = "hailuo-2-3-motion";

export function isCinemaModelId(id: string | undefined): id is string {
  return typeof id === "string" && CINEMA_MODELS.some((model) => model.id === id);
}

export function isCinemaRatioId(id: string | undefined): id is string {
  return typeof id === "string" && CINEMA_RATIO_IDS.includes(id);
}

export function isCinemaDuration(value: number | undefined): value is number {
  return typeof value === "number" && (VIDEO_DURATIONS as readonly number[]).includes(value);
}

export function findCinemaModel(id: string): ModelInfo {
  return CINEMA_MODELS.find((model) => model.id === id) ?? CINEMA_MODELS[0];
}

export function clampMotionStrength(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_MOTION_STRENGTH;
  return Math.min(MAX_MOTION_STRENGTH, Math.max(MIN_MOTION_STRENGTH, Math.round(value)));
}

/** Resolves a `?camera=` preset id to a full camera, keeping the current lens optics. */
export function cameraFromParam(presetId: string | undefined, base: CameraMotionSettings = DEFAULT_CAMERA): CameraMotionSettings {
  const preset = presetId ? CAMERA_PRESETS.find((candidate) => candidate.id === presetId) : undefined;
  return preset ? cameraFromPreset(preset, base) : base;
}

/**
 * What the engine's `look` actually does to the render, in the shot-sheet's
 * own words. Reads the catalogue so the copy can never drift from the renderer.
 */
export function describeLook(model: ModelInfo): string {
  const { look } = model;
  const parts: string[] = [];
  if (model.id === SPEED_RAMP_MODEL_ID) parts.push("Speed-ramped");
  if (look?.letterbox) parts.push("Letterboxed 2.39:1");
  if (look?.lightLeak) parts.push("Light leaks");
  if (look && look.grain >= 0.05) parts.push("Film grain");
  else if (look && look.grain <= 0.02) parts.push("Clean, minimal grain");
  if (look?.handheld !== undefined && look.handheld >= 0.5) parts.push("Handheld");
  return parts.length > 0 ? parts.join(" · ") : "Neutral grade";
}

export function defaultCinemaForm(): CinemaStudioForm {
  return {
    prompt: "",
    modelId: DEFAULT_CINEMA_MODEL_ID,
    ratio: DEFAULT_CINEMA_RATIO,
    duration: DEFAULT_CINEMA_DURATION,
    motionStrength: DEFAULT_MOTION_STRENGTH,
    camera: DEFAULT_CAMERA,
  };
}

/**
 * Builds the initial form from studio query params. Unknown models, ratios,
 * durations and camera presets fall back to the defaults instead of failing.
 */
export function formFromParams(params: StudioParams): CinemaStudioForm {
  const base = defaultCinemaForm();
  return {
    ...base,
    prompt: params.prompt ?? base.prompt,
    modelId: isCinemaModelId(params.model) ? params.model : base.modelId,
    ratio: isCinemaRatioId(params.ratio) ? params.ratio : base.ratio,
    duration: isCinemaDuration(params.duration) ? params.duration : base.duration,
    camera: cameraFromParam(params.camera, base.camera),
    sourceAssetId: params.source,
  };
}

/**
 * Restores every setting of an existing sequence ("remix"). The AI keyframe is
 * reused as the source when there was no upload, so a remix re-choreographs the
 * same frame instead of paying for a new one.
 */
export function formFromProject(project: GenerationProject): CinemaStudioForm {
  const base = defaultCinemaForm();
  return {
    prompt: project.prompt,
    modelId: isCinemaModelId(project.model) ? project.model : base.modelId,
    ratio: isCinemaRatioId(project.aspectRatio) ? project.aspectRatio : base.ratio,
    duration: isCinemaDuration(project.duration) ? project.duration : base.duration,
    motionStrength: clampMotionStrength(project.motionStrength),
    camera: project.cameraMotion ?? base.camera,
    sourceAssetId: project.sourceAssetId ?? project.keyframeAssetId,
  };
}

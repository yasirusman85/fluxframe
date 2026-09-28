/**
 * Pure helpers for the Video Studio form: defaults, query-param prefill and
 * "remix" from an existing project. Kept free of React so they are trivial
 * to unit test — every deep-linkable value is validated here, never in the page.
 */
import type { CameraMotionSettings, GenerationProject } from "../../types/project";
import type { StudioParams } from "../../lib/query-params";
import { CAMERA_PRESETS, DEFAULT_CAMERA, VIDEO_DURATIONS, VIDEO_MODELS, cameraFromPreset } from "../../lib/catalog";
import type { ModelInfo } from "../../lib/catalog";

export interface VideoStudioForm {
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

export const VIDEO_RATIO_IDS = ["16:9", "9:16", "1:1", "4:3"];
export const DEFAULT_VIDEO_MODEL_ID = VIDEO_MODELS[0].id;
export const DEFAULT_VIDEO_RATIO = "16:9";
export const DEFAULT_VIDEO_DURATION = 5;
export const MIN_MOTION_STRENGTH = 1;
export const MAX_MOTION_STRENGTH = 10;
export const DEFAULT_MOTION_STRENGTH = 6;

export function isVideoModelId(id: string | undefined): id is string {
  return typeof id === "string" && VIDEO_MODELS.some((model) => model.id === id);
}

export function isVideoRatioId(id: string | undefined): id is string {
  return typeof id === "string" && VIDEO_RATIO_IDS.includes(id);
}

export function isVideoDuration(value: number | undefined): value is number {
  return typeof value === "number" && (VIDEO_DURATIONS as readonly number[]).includes(value);
}

export function findVideoModel(id: string): ModelInfo {
  return VIDEO_MODELS.find((model) => model.id === id) ?? VIDEO_MODELS[0];
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

export function defaultVideoForm(): VideoStudioForm {
  return {
    prompt: "",
    modelId: DEFAULT_VIDEO_MODEL_ID,
    ratio: DEFAULT_VIDEO_RATIO,
    duration: DEFAULT_VIDEO_DURATION,
    motionStrength: DEFAULT_MOTION_STRENGTH,
    camera: DEFAULT_CAMERA,
  };
}

/**
 * Builds the initial form from studio query params. Unknown models, ratios,
 * durations and camera presets fall back to the defaults instead of failing.
 */
export function formFromParams(params: StudioParams): VideoStudioForm {
  const base = defaultVideoForm();
  return {
    ...base,
    prompt: params.prompt ?? base.prompt,
    modelId: isVideoModelId(params.model) ? params.model : base.modelId,
    ratio: isVideoRatioId(params.ratio) ? params.ratio : base.ratio,
    duration: isVideoDuration(params.duration) ? params.duration : base.duration,
    camera: cameraFromParam(params.camera, base.camera),
    sourceAssetId: params.source,
  };
}

/**
 * Restores every setting of an existing clip ("remix"). The AI keyframe is
 * reused as the source when there was no upload, so a remix re-renders the
 * same frame instead of paying for a new one.
 */
export function formFromProject(project: GenerationProject): VideoStudioForm {
  const base = defaultVideoForm();
  return {
    prompt: project.prompt,
    modelId: isVideoModelId(project.model) ? project.model : base.modelId,
    ratio: isVideoRatioId(project.aspectRatio) ? project.aspectRatio : base.ratio,
    duration: isVideoDuration(project.duration) ? project.duration : base.duration,
    motionStrength: clampMotionStrength(project.motionStrength),
    camera: project.cameraMotion ?? base.camera,
    sourceAssetId: project.sourceAssetId ?? project.keyframeAssetId,
  };
}

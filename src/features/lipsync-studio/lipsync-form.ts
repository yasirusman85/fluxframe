/**
 * Pure helpers for the LipSync Studio form: defaults, query-param prefill,
 * mouth calibration clamping and the exact `generate()` payload that
 * `src/lib/pipelines/lipsync.ts` reads. Kept free of React so it is trivial
 * to unit test.
 */
import type { GenerateInput } from "../../hooks/useGeneration";
import type { LipSyncSettings } from "../../types/project";
import type { StudioParams } from "../../lib/query-params";
import type { ModelInfo } from "../../lib/catalog";
import { LIPSYNC_MODELS } from "../../lib/catalog";
import { titleFromPrompt } from "../../lib/format";

export type LipSyncMode = LipSyncSettings["mode"];

export interface LipSyncForm {
  mode: LipSyncMode;
  script: string;
  /** SpeechSynthesisVoice.name, "" for the browser default. */
  voice: string;
  /** Used to generate a portrait when none is uploaded. */
  portraitPrompt: string;
  modelId: string;
  ratio: string;
  expression: number;
  amplitude: number;
  captions: boolean;
  visualizer: boolean;
  /** Normalised mouth centre, 0..1. */
  mouthX: number;
  mouthY: number;
}

/** A stored portrait upload plus the object URL the dropzone previews. */
export interface PortraitUpload {
  assetId: string;
  url: string;
  name: string;
}

/** A stored audio upload plus its decoded duration, used for the summary line. */
export interface AudioUpload {
  assetId: string;
  url: string;
  name: string;
  durationMs: number;
}

export interface LipSyncUploads {
  portrait?: PortraitUpload;
  audio?: AudioUpload;
}

export const DEFAULT_LIPSYNC_MODEL_ID = LIPSYNC_MODELS[0].id;
export const LIPSYNC_RATIO_IDS = ["1:1", "9:16", "4:3"];
export const DEFAULT_LIPSYNC_RATIO = "1:1";
export const MAX_SCRIPT_LENGTH = 600;

/**
 * Mirrors `DEFAULT_MOUTH` in `src/lib/render/lipsync.ts`. It is duplicated
 * rather than imported so the studio bundle does not pull in the renderer
 * (and with it MediaRecorder helpers) before a generation starts.
 */
export const DEFAULT_MOUTH_X = 0.5;
export const DEFAULT_MOUTH_Y = 0.63;

export const DEFAULT_EXPRESSION = 60;
export const DEFAULT_AMPLITUDE = 70;

/** Mirrors `MAX_SCRIPT_SECONDS` in `src/lib/pipelines/lipsync.ts`: longer scripts are truncated. */
export const SCRIPT_CAP_SECONDS = 20;

/** Portrait description used when the field is empty and nothing was uploaded. */
export const DEFAULT_PORTRAIT_DESCRIPTION = "a friendly presenter with short dark hair in a charcoal jacket, plain studio backdrop";

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

export function findLipsyncModel(id: string): ModelInfo {
  return LIPSYNC_MODELS.find((model) => model.id === id) ?? LIPSYNC_MODELS[0];
}

export function isLipsyncRatio(id: string | undefined): id is string {
  return typeof id === "string" && LIPSYNC_RATIO_IDS.includes(id);
}

export function defaultLipSyncForm(): LipSyncForm {
  return {
    mode: "script",
    script: "",
    voice: "",
    portraitPrompt: "",
    modelId: DEFAULT_LIPSYNC_MODEL_ID,
    ratio: DEFAULT_LIPSYNC_RATIO,
    expression: DEFAULT_EXPRESSION,
    amplitude: DEFAULT_AMPLITUDE,
    captions: true,
    visualizer: false,
    mouthX: DEFAULT_MOUTH_X,
    mouthY: DEFAULT_MOUTH_Y,
  };
}

/** Prefill from a deep link: `script`, `prompt` (portrait), `model` and `ratio`. */
export function lipSyncFormFromParams(params: StudioParams): LipSyncForm {
  const base = defaultLipSyncForm();
  return {
    ...base,
    script: params.script?.slice(0, MAX_SCRIPT_LENGTH) ?? base.script,
    portraitPrompt: params.prompt ?? base.portraitPrompt,
    modelId: LIPSYNC_MODELS.some((model) => model.id === params.model) ? (params.model as string) : base.modelId,
    ratio: isLipsyncRatio(params.ratio) ? params.ratio : base.ratio,
  };
}

/** Generate is enabled by a script (script mode) or an uploaded file (audio mode). */
export function canSynthesize(form: LipSyncForm, uploads: LipSyncUploads): boolean {
  return form.mode === "script" ? form.script.trim().length > 0 : Boolean(uploads.audio);
}

/**
 * The pipeline generates the portrait from `project.prompt` when nothing is
 * uploaded, so without an upload the prompt must describe a face. With an
 * upload the prompt is only metadata, and the script reads best.
 */
export function lipsyncPrompt(form: LipSyncForm, hasPortrait: boolean): string {
  const description = form.portraitPrompt.trim();
  if (!hasPortrait) return description || DEFAULT_PORTRAIT_DESCRIPTION;
  if (form.mode === "script") return form.script.trim() || description || "Talking portrait";
  return description || "Talking portrait driven by an uploaded audio track";
}

/** Drops a file extension: "welcome-take-2.wav" → "welcome-take-2". */
export function baseFileName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

export function lipsyncTitle(form: LipSyncForm, audio?: AudioUpload): string {
  if (form.mode === "audio") {
    const base = audio ? baseFileName(audio.name) : "";
    return base ? `${base} · LipSync` : "Talking portrait";
  }
  return titleFromPrompt(form.script, "Talking portrait", 42);
}

/** Builds the exact payload `useGeneration().generate` needs for a lipsync job. */
export function buildLipsyncRequest(form: LipSyncForm, uploads: LipSyncUploads): GenerateInput {
  const model = findLipsyncModel(form.modelId);
  const audio = form.mode === "audio" ? uploads.audio : undefined;
  const script = form.script.trim();
  const lipsync: LipSyncSettings = {
    mode: form.mode,
    script: form.mode === "script" ? script : undefined,
    voice: form.mode === "script" ? form.voice || undefined : undefined,
    expression: form.expression,
    amplitude: form.amplitude,
    // Captions need word timings, which only the script envelope has.
    captions: form.mode === "script" ? form.captions : false,
    visualizer: form.visualizer,
    audioFileName: audio?.name,
    mouthX: clamp01(form.mouthX),
    mouthY: clamp01(form.mouthY),
  };
  return {
    type: "lipsync",
    prompt: lipsyncPrompt(form, Boolean(uploads.portrait)),
    title: lipsyncTitle(form, audio),
    model: model.id,
    aspectRatio: form.ratio,
    sourceAssetId: uploads.portrait?.assetId,
    audioAssetId: audio?.assetId,
    lipsync,
    creditCost: model.creditCost,
  };
}

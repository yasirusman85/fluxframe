/**
 * Creative Apps runner. Each app turns its form values into a generation
 * plan: a project input (prompt, model, ratio, credits, title) plus the
 * pipeline that produces the output. Single-step apps reuse the image
 * pipeline; Storyboarder composites four generations into a contact sheet
 * and LogoMotion renders a keyframe into an orbiting reveal clip.
 *
 * Usage (Apps page):
 *   const errors = validateAppValues(app, values);   // field key → message
 *   const plan = createAppPlan(app, values);
 *   generate({ ...plan.project, pipeline: plan.pipeline });
 */
import type { CameraMotionSettings, GenerationType, ProviderSource } from "../types/project";
import { videoDimensionsFor } from "./aspect";
import { putAsset } from "./asset-store";
import { throwIfAborted } from "./async";
import { CAMERA_PRESETS, IMAGE_MODELS, VIDEO_FPS, VIDEO_MODELS, cameraFromPreset, type CreativeApp } from "./catalog";
import { titleFromPrompt } from "./format";
import { blobToImage, canvasToBlob, createThumbnail } from "./image-utils";
import type { Pipeline } from "./pipelines";
import { generateKeyframe, imagePipeline, type KeyframeResult } from "./pipelines/image";
import { coverFit, roundRect } from "./render/drawing";

export interface AppProjectInput {
  type: GenerationType;
  prompt: string;
  model: string;
  aspectRatio: string;
  creditCost: number;
  title: string;
  duration?: number;
  cameraMotion?: CameraMotionSettings;
  motionStrength?: number;
  tags: string[];
  origin: "app";
}

export interface AppPlan {
  pipeline: Pipeline;
  project: AppProjectInput;
}

export interface AppPrompt {
  prompt: string;
  model: string;
  aspectRatio: string;
}

export const MAX_FIELD_LENGTH = 500;
const FONT = "Inter, system-ui, sans-serif";
const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

const styleSuffixOf = (modelId: string) => IMAGE_MODELS.find((m) => m.id === modelId)?.styleSuffix ?? "";

/** Trims every value and fills missing select fields with their first option. */
export function normalizeAppValues(app: CreativeApp, values: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of app.fields) {
    const value = (values[field.key] ?? "").trim();
    out[field.key] = value || (field.type === "select" ? (field.options?.[0] ?? "") : "");
  }
  return out;
}

/** Field key → error message. Empty object when the values are valid. */
export function validateAppValues(app: CreativeApp, values: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of app.fields) {
    const value = (values[field.key] ?? "").trim();
    const label = field.label;
    if (field.required && !value) {
      errors[field.key] = `${label} is required.`;
    } else if (value && field.options && !field.options.includes(value)) {
      errors[field.key] = `Choose one of the listed ${label.toLowerCase()} options.`;
    } else if (value.length > MAX_FIELD_LENGTH) {
      errors[field.key] = `Keep ${label.toLowerCase()} under ${MAX_FIELD_LENGTH} characters.`;
    }
  }
  return errors;
}

/** Prompt, model and ratio for a single-step (image) app. */
export function buildAppPrompt(app: CreativeApp, rawValues: Record<string, string>): AppPrompt {
  const v = normalizeAppValues(app, rawValues);
  switch (app.id) {
    case "style-snap":
      return {
        prompt: `full-body editorial fashion photograph of ${v.subject} wearing a ${v.style} outfit${v.setting ? `, ${v.setting}` : ""}, ${styleSuffixOf("flux-realism-v2")}`,
        model: "flux-realism-v2",
        aspectRatio: "3:4",
      };
    case "outfit-vending":
      return {
        prompt: `glowing Japanese arcade vending machine display filled with ${v.outfit}, ${v.palette} palette, product photography, neon signage`,
        model: "hyperdetail-ultra",
        aspectRatio: "9:16",
      };
    case "character-sheet":
      return {
        prompt: `character reference sheet of ${v.character}, front view, side profile and three expressions, ${v.style} style, clean white background, turnaround sheet`,
        model: v.style === "Realistic" ? "flux-realism-v2" : v.style === "Pixar-style 3D" ? "hyperdetail-ultra" : "painterly-muse",
        aspectRatio: "16:9",
      };
    case "storyboard":
      return { prompt: `${v.logline}, four-shot storyboard, ${v.style} style`, model: "studio-cinema-xl", aspectRatio: "16:9" };
    case "logomotion":
      return { prompt: logoPrompt(v), model: "cinematic-camera-pro", aspectRatio: "1:1" };
    default:
      throw new Error(`Unknown creative app "${app.id}".`);
  }
}

function logoPrompt(v: Record<string, string>): string {
  return [`logo mark for a brand called "${v.brand}"`, v.material, v.vibe, "centred on dark background, symmetrical, high detail"].filter(Boolean).join(", ");
}

/** Which field names the project ("Style Snap · Techwear"). */
const TITLE_FIELD: Record<string, string> = {
  "style-snap": "style",
  "outfit-vending": "outfit",
  "character-sheet": "character",
  storyboard: "logline",
  logomotion: "brand",
};

export function appTitle(app: CreativeApp, values: Record<string, string>): string {
  const key = TITLE_FIELD[app.id] ?? app.fields[0]?.key;
  const value = (values[key] ?? "").trim();
  return value ? `${app.name} · ${titleFromPrompt(value, value, 40)}` : app.name;
}

/** Builds the generation plan for an app. Throws with the first validation error when values are invalid. */
export function createAppPlan(app: CreativeApp, rawValues: Record<string, string>): AppPlan {
  const firstError = Object.values(validateAppValues(app, rawValues))[0];
  if (firstError) throw new Error(firstError);
  const values = normalizeAppValues(app, rawValues);
  const { prompt, model, aspectRatio } = buildAppPrompt(app, values);
  const base: AppProjectInput = {
    type: app.outputKind === "video" ? "video" : "image",
    prompt,
    model,
    aspectRatio,
    creditCost: app.creditCost,
    title: appTitle(app, values),
    tags: ["app", app.id],
    origin: "app",
  };

  switch (app.id) {
    case "storyboard":
      return { pipeline: createStoryboardPipeline(values), project: base };
    case "logomotion": {
      const preset = CAMERA_PRESETS.find((p) => p.id === "orbit") ?? CAMERA_PRESETS[0];
      return {
        pipeline: createLogoMotionPipeline(values),
        project: { ...base, duration: LOGO_DURATION_S, cameraMotion: cameraFromPreset(preset), motionStrength: 6 },
      };
    }
    default:
      return { pipeline: imagePipeline, project: base };
  }
}

// ---- Storyboarder: four shots composited into a labelled contact sheet -------

export const STORYBOARD_SHOTS = [
  { prompt: "wide establishing shot", label: "WIDE" },
  { prompt: "medium shot", label: "MEDIUM" },
  { prompt: "close-up", label: "CLOSE-UP" },
  { prompt: "over-the-shoulder reverse shot", label: "REVERSE" },
] as const;

const PANEL_W = 640;
const PANEL_H = 360;
const GUTTER = 12;
const CAPTION_H = 28;
const TITLE_H = 64;

export const STORYBOARD_SHEET = {
  width: GUTTER * 3 + PANEL_W * 2,
  height: TITLE_H + GUTTER * 3 + (PANEL_H + CAPTION_H) * 2,
} as const;

function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1).trimEnd();
  return `${out}…`;
}

/** Draws the 2×2 contact sheet and returns it as a JPEG blob. */
export async function composeStoryboardSheet(panels: KeyframeResult[], logline: string, style: string): Promise<Blob> {
  const { width, height } = STORYBOARD_SHEET;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not supported");
  const images = await Promise.all(panels.map((panel) => blobToImage(panel.blob)));

  ctx.fillStyle = "#0b0b0f";
  ctx.fillRect(0, 0, width, height);

  // Title strip.
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = "#f4f4f5";
  ctx.font = `600 22px ${FONT}`;
  ctx.fillText(truncateToWidth(ctx, logline, width - GUTTER * 2 - 320), GUTTER + 2, TITLE_H / 2);
  ctx.textAlign = "right";
  ctx.fillStyle = "#34d399";
  ctx.font = `600 12px ${MONO}`;
  ctx.fillText(`STORYBOARD · 4 SHOTS · ${style.toUpperCase()}`, width - GUTTER - 2, TITLE_H / 2);

  images.forEach((img, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = GUTTER + col * (PANEL_W + GUTTER);
    const y = TITLE_H + GUTTER + row * (PANEL_H + CAPTION_H + GUTTER);
    ctx.save();
    roundRect(ctx, x, y, PANEL_W, PANEL_H + CAPTION_H, 8);
    ctx.clip();
    ctx.fillStyle = "#141418";
    ctx.fillRect(x, y, PANEL_W, PANEL_H + CAPTION_H);
    const fit = coverFit(img.naturalWidth || 1, img.naturalHeight || 1, PANEL_W, PANEL_H);
    ctx.drawImage(img, x + fit.x, y + fit.y, fit.w, fit.h);
    ctx.font = `600 12px ${MONO}`;
    ctx.fillStyle = "#d4d4d8";
    ctx.textAlign = "left";
    ctx.fillText(`SHOT ${i + 1} · ${STORYBOARD_SHOTS[i]?.label ?? ""}`, x + 10, y + PANEL_H + CAPTION_H / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = panels[i].providerSource === "pollinations" ? "#71717a" : "#f59e0b";
    ctx.fillText(panels[i].providerSource === "pollinations" ? "POLLINATIONS" : "PROCEDURAL", x + PANEL_W - 10, y + PANEL_H + CAPTION_H / 2);
    ctx.restore();
  });

  return canvasToBlob(canvas, "image/jpeg", 0.92);
}

export function createStoryboardPipeline(values: Record<string, string>): Pipeline {
  const logline = (values.logline ?? "").trim();
  const style = (values.style ?? "").trim() || "Cinematic realism";
  return async (ctx) => {
    const panels: KeyframeResult[] = [];
    for (let i = 0; i < STORYBOARD_SHOTS.length; i++) {
      const shot = STORYBOARD_SHOTS[i];
      const range: [number, number] = [4 + i * 20, 4 + (i + 1) * 20];
      panels.push(await generateKeyframe(ctx, `${logline}, ${shot.prompt}, ${style} style, storyboard frame`, "16:9", ctx.project.seed + i, `Shot ${i + 1}/4`, range));
      throwIfAborted(ctx.signal);
    }

    ctx.report(86, "Composing contact sheet");
    const sheet = await composeStoryboardSheet(panels, logline, style);
    throwIfAborted(ctx.signal);

    ctx.report(92, "Storing output");
    const outputAssetId = await putAsset(sheet, "image", { width: STORYBOARD_SHEET.width, height: STORYBOARD_SHEET.height });
    let thumbnailAssetId: string | undefined;
    try {
      thumbnailAssetId = await putAsset(await createThumbnail(sheet), "image");
    } catch {
      // Thumbnail is optional.
    }

    const procedural = panels.filter((p) => p.providerSource !== "pollinations").length;
    const providerSource: ProviderSource = procedural === 0 ? "pollinations" : "procedural";
    return {
      outputAssetId,
      outputMimeType: "image/jpeg",
      thumbnailAssetId,
      providerSource,
      providerDetail: procedural === 0 ? "Storyboard · 4 panels" : `Storyboard · 4 panels · ${procedural} procedural fallback${procedural === 1 ? "" : "s"}`,
      width: STORYBOARD_SHEET.width,
      height: STORYBOARD_SHEET.height,
    };
  };
}

// ---- LogoMotion: keyframe → orbiting reveal clip ----------------------------

export const LOGO_DURATION_S = 5;

export function createLogoMotionPipeline(values: Record<string, string>): Pipeline {
  const prompt = logoPrompt(values);
  return async (ctx) => {
    // Loaded lazily so the Apps page does not ship the video engine up front.
    const [{ isVideoRenderingSupported }, { loadImageSource, renderMotionVideo }, { VIDEO_UNSUPPORTED_MESSAGE, renderProgressReporter }] = await Promise.all([
      import("./render/canvas-recorder"),
      import("./render/motion"),
      import("./pipelines/motion"),
    ]);
    if (!isVideoRenderingSupported()) throw new Error(VIDEO_UNSUPPORTED_MESSAGE);

    const keyframe = await generateKeyframe(ctx, prompt, "1:1", ctx.project.seed, "Logo", [4, 34]);
    ctx.report(35, "Storing logo keyframe");
    const keyframeAssetId = await putAsset(keyframe.blob, "image", { width: keyframe.width, height: keyframe.height });
    throwIfAborted(ctx.signal);

    ctx.report(37, "Decoding keyframe");
    const image = await loadImageSource(keyframe.blob);
    const { width, height } = videoDimensionsFor("1:1");
    const preset = CAMERA_PRESETS.find((p) => p.id === "orbit") ?? CAMERA_PRESETS[0];
    const camera = ctx.project.cameraMotion ?? cameraFromPreset(preset);
    const look = VIDEO_MODELS.find((m) => m.id === "cinematic-camera-pro")?.look;
    const fps = ctx.project.fps ?? VIDEO_FPS;
    const durationMs = LOGO_DURATION_S * 1000;
    const totalFrames = LOGO_DURATION_S * fps;
    ctx.report(40, `Rendering frame 0 / ${totalFrames}`);

    const result = await renderMotionVideo({
      image,
      width,
      height,
      durationMs,
      camera,
      motionStrength: ctx.project.motionStrength ?? 6,
      look,
      fps,
      signal: ctx.signal,
      onProgress: renderProgressReporter(ctx, 40, 95, totalFrames),
    });
    throwIfAborted(ctx.signal);

    ctx.report(96, "Storing output");
    const outputAssetId = await putAsset(result.blob, "video", { width, height, durationMs });
    let thumbnailAssetId: string | undefined;
    try {
      thumbnailAssetId = await putAsset(await createThumbnail(keyframe.blob), "image");
    } catch {
      // Thumbnail is optional.
    }

    return {
      outputAssetId,
      outputMimeType: result.mimeType,
      thumbnailAssetId,
      keyframeAssetId,
      width,
      height,
      duration: LOGO_DURATION_S,
      fps,
      providerSource: "motion-engine",
      providerDetail: `Motion engine · ${result.extension.toUpperCase()} ${width}×${height} · logo via ${keyframe.providerSource === "pollinations" ? "Pollinations" : "procedural fallback"}`,
      renderMs: result.renderMs,
    };
  };
}

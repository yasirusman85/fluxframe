/**
 * Pure helpers for the Marketing Studio form: template/tone lookup, the
 * auto-filled brand copy (and which fields the user has taken over), the
 * storyboard preview text and the exact `generate()` payload that
 * `src/lib/pipelines/ad.ts` + `src/lib/render/ad.ts` read.
 */
import type { GenerateInput } from "../../hooks/useGeneration";
import type { MarketingSettings } from "../../types/project";
import type { StudioParams } from "../../lib/query-params";
import type { AdSceneTemplate, AdTemplate, BrandTone } from "../../lib/catalog";
import { AD_TEMPLATES, BRAND_TONES, productNameFromUrl } from "../../lib/catalog";

export type AdCopyField = "headline" | "subheadline" | "cta" | "proof";
export type AdSceneKind = AdSceneTemplate["kind"];

export const AD_COPY_FIELDS: AdCopyField[] = ["headline", "subheadline", "cta", "proof"];
/** Marketing is a fixed-price studio (SPEC: "Marketing fixed 25"). */
export const AD_CREDIT_COST = 25;
export const MAX_FEATURES = 3;

export const SCENE_LABELS: Record<AdSceneKind, string> = {
  hook: "Hook",
  feature: "Feature",
  proof: "Social proof",
  cta: "Call to action",
};

export const MOTION_LABELS: Record<AdSceneTemplate["motion"], string> = {
  push: "push in",
  pull: "pull back",
  pan: "pan",
  orbit: "orbit",
  static: "locked off",
};

export interface AdForm {
  productUrl: string;
  productName: string;
  templateId: string;
  toneId: string;
  /** Aspect ratio id, e.g. "9:16". */
  format: string;
  headline: string;
  subheadline: string;
  cta: string;
  proof: string;
  /** One feature per line; the first three reach the renderer. */
  features: string;
  /** Copy fields edited by hand — auto-fill leaves those alone. */
  touched: ReadonlySet<AdCopyField>;
  /** True once the name is edited by hand; URL changes then stop overwriting it. */
  nameTouched: boolean;
}

/** A stored packshot upload plus the object URL the dropzone previews. */
export interface PackshotUpload {
  assetId: string;
  url: string;
  name: string;
}

export function findTemplate(id: string): AdTemplate {
  return AD_TEMPLATES.find((template) => template.id === id) ?? AD_TEMPLATES[0];
}

export function findTone(id: string): BrandTone {
  return BRAND_TONES.find((tone) => tone.id === id) ?? BRAND_TONES[0];
}

export function templateDurationMs(template: AdTemplate): number {
  return template.scenes.reduce((sum, scene) => sum + Math.max(0, scene.durationMs), 0);
}

export function templateSeconds(template: AdTemplate): number {
  return Math.round(templateDurationMs(template) / 100) / 10;
}

/** The brand copy a tone writes for a product. */
export function autoCopy(tone: BrandTone, productName: string): Record<AdCopyField, string> {
  const name = productName.trim() || "your product";
  return {
    headline: tone.headline(name),
    subheadline: tone.subheadline(name),
    cta: tone.cta,
    proof: tone.proof(name),
  };
}

/** Re-derives every field the user has not edited from the current tone + product name. */
export function applyAutoCopy(form: AdForm): AdForm {
  const copy = autoCopy(findTone(form.toneId), form.productName);
  const next: AdForm = { ...form };
  for (const field of AD_COPY_FIELDS) {
    if (!form.touched.has(field)) next[field] = copy[field];
  }
  return next;
}

export function defaultAdForm(): AdForm {
  const template = AD_TEMPLATES[0];
  return applyAutoCopy({
    productUrl: "",
    productName: "",
    templateId: template.id,
    toneId: BRAND_TONES[0].id,
    format: template.aspectRatio,
    headline: "",
    subheadline: "",
    cta: "",
    proof: "",
    features: "",
    touched: new Set(),
    nameTouched: false,
  });
}

/** Prefill from a deep link: `product`, `template` and `tone`. */
export function adFormFromParams(params: StudioParams): AdForm {
  const base = defaultAdForm();
  const template = params.template && AD_TEMPLATES.some((t) => t.id === params.template) ? findTemplate(params.template) : findTemplate(base.templateId);
  const toneId = params.tone && BRAND_TONES.some((t) => t.id === params.tone) ? params.tone : base.toneId;
  const productName = params.product?.trim() ?? "";
  return applyAutoCopy({
    ...base,
    productName,
    nameTouched: productName.length > 0,
    templateId: template.id,
    toneId,
    format: template.aspectRatio,
  });
}

/** Marks a copy field as hand-written so auto-fill stops overwriting it. */
export function setCopyField(form: AdForm, field: AdCopyField, value: string): AdForm {
  const touched = new Set(form.touched);
  touched.add(field);
  const next: AdForm = { ...form, touched };
  next[field] = value;
  return next;
}

/** Forgets every manual edit and re-applies the tone's copy. */
export function resetCopy(form: AdForm): AdForm {
  return applyAutoCopy({ ...form, touched: new Set() });
}

export function setTone(form: AdForm, toneId: string): AdForm {
  return applyAutoCopy({ ...form, toneId });
}

export function setProductName(form: AdForm, productName: string): AdForm {
  return applyAutoCopy({ ...form, productName, nameTouched: true });
}

/** Typing a store URL names the product until the name field is edited by hand. */
export function setProductUrl(form: AdForm, productUrl: string): AdForm {
  const productName = form.nameTouched ? form.productName : productNameFromUrl(productUrl);
  return applyAutoCopy({ ...form, productUrl, productName });
}

/** Picking a template also switches to the format it was designed for. */
export function setTemplate(form: AdForm, templateId: string): AdForm {
  const template = findTemplate(templateId);
  return { ...form, templateId: template.id, format: template.aspectRatio };
}

export function parseFeatures(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_FEATURES);
}

/** Mirrors `featurePhrases` in src/lib/render/ad.ts so the storyboard shows what will be drawn. */
export function featureLines(form: AdForm): string[] {
  const explicit = parseFeatures(form.features);
  if (explicit.length) return explicit;
  const source = form.subheadline.trim() || form.headline.trim() || form.productName.trim();
  const phrases = source
    .split(/[.,;:!?]+/)
    .map((phrase) => phrase.trim())
    .filter((phrase) => phrase.length > 1)
    .slice(0, MAX_FEATURES);
  return phrases.length ? phrases : [source].filter(Boolean);
}

/** The copy a scene will render, including the renderer's fallbacks. */
export function sceneCopy(kind: AdSceneKind, form: AdForm): string[] {
  switch (kind) {
    case "hook":
      return [form.headline.trim() || form.productName.trim() || "Introducing"];
    case "feature":
      return [form.subheadline.trim() || form.headline.trim() || form.productName.trim(), ...featureLines(form)].filter(Boolean);
    case "proof":
      return [form.proof.trim() || "Loved by thousands"];
    case "cta":
      return [form.cta.trim() || "Learn more"];
    default:
      return [];
  }
}

export function adPrompt(form: AdForm): string {
  const template = findTemplate(form.templateId);
  const tone = findTone(form.toneId);
  const name = form.productName.trim() || "product";
  return `${name} — ${template.title.toLowerCase()} ad in a ${tone.label.toLowerCase()} tone, ${form.format}`;
}

/** Builds the exact payload `useGeneration().generate` needs for an ad job. */
export function buildAdRequest(form: AdForm, packshotAssetId?: string): GenerateInput {
  const template = findTemplate(form.templateId);
  const tone = findTone(form.toneId);
  const productName = form.productName.trim();
  const marketing: MarketingSettings = {
    template: template.id,
    tone: tone.id,
    format: form.format,
    productName,
    productUrl: form.productUrl.trim() || undefined,
    headline: form.headline.trim(),
    subheadline: form.subheadline.trim(),
    cta: form.cta.trim(),
    accent: tone.accent,
    secondary: tone.secondary,
    features: parseFeatures(form.features),
    proof: form.proof.trim() || undefined,
  };
  return {
    type: "marketing",
    prompt: adPrompt(form),
    title: `${productName} · ${template.title}`,
    model: "ad-engine",
    aspectRatio: form.format,
    duration: Math.round(templateDurationMs(template) / 1000),
    sourceAssetId: packshotAssetId,
    marketing,
    creditCost: AD_CREDIT_COST,
  };
}

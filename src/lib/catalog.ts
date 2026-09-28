/**
 * Static product catalog: engines, presets, apps, plans and templates.
 *
 * Engine names mirror the Higgsfield catalog for UI parity. What actually
 * runs is always shown to the user: images come from the public
 * Pollinations endpoint (with prompt "style suffixes" per engine), video
 * is rendered by the in-browser motion/lipsync/ad engines.
 */
import type { Aperture, CameraMotionSettings, FocalLength, GenerationType } from "../types/project";

export interface RenderLook {
  /** 0..0.2 film grain alpha */
  grain: number;
  /** 0..1 vignette strength */
  vignette: number;
  letterbox: boolean;
  tint?: string;
  tintAlpha?: number;
  lightLeak?: boolean;
  /** CSS filter saturation multiplier */
  saturation?: number;
  contrast?: number;
  /** 0..1 handheld micro-motion */
  handheld?: number;
}

export type EngineKind = "pollinations" | "motion-engine" | "lipsync-engine";

export interface ModelInfo {
  id: string;
  name: string;
  badge: string;
  description: string;
  type: Exclude<GenerationType, "marketing">;
  speed: string;
  qualityLabel: string;
  isPopular?: boolean;
  creditCost: number;
  engine: EngineKind;
  /** Appended to prompts sent to the image endpoint. */
  styleSuffix?: string;
  look?: RenderLook;
}

export const IMAGE_MODELS: ModelInfo[] = [
  {
    id: "flux-realism-v2",
    name: "Flux Realism v2",
    badge: "Popular",
    description: "Photorealistic portraits, natural lighting and complex surfaces",
    type: "image",
    speed: "~6s",
    qualityLabel: "Photoreal",
    isPopular: true,
    creditCost: 5,
    engine: "pollinations",
    styleSuffix: "photorealistic, natural lighting, sharp focus, highly detailed",
  },
  {
    id: "studio-cinema-xl",
    name: "Studio Cinema XL",
    badge: "Cinematic",
    description: "Anamorphic film stills with shallow depth of field and grain",
    type: "image",
    speed: "~6s",
    qualityLabel: "Film still",
    creditCost: 8,
    engine: "pollinations",
    styleSuffix: "cinematic film still, anamorphic lens, shallow depth of field, subtle film grain, dramatic lighting",
  },
  {
    id: "cyber-concept-pro",
    name: "Cyber Concept Pro",
    badge: "Stylized",
    description: "Neon sci-fi concept art with high-contrast synthwave palettes",
    type: "image",
    speed: "~6s",
    qualityLabel: "Concept art",
    creditCost: 5,
    engine: "pollinations",
    styleSuffix: "concept art, neon synthwave palette, high contrast, stylized digital painting",
  },
  {
    id: "hyperdetail-ultra",
    name: "HyperDetail Ultra",
    badge: "Detailed",
    description: "Intricate textures, architectural renders, macro detail",
    type: "image",
    speed: "~7s",
    qualityLabel: "High detail",
    creditCost: 10,
    engine: "pollinations",
    styleSuffix: "intricate detail, macro textures, architectural precision, octane render, 8k",
  },
  {
    id: "aurora-frame",
    name: "Aurora Frame",
    badge: "Editorial",
    description: "Soft studio light, magazine-grade editorial photography",
    type: "image",
    speed: "~7s",
    qualityLabel: "Editorial",
    creditCost: 12,
    engine: "pollinations",
    styleSuffix: "editorial photography, soft studio lighting, magazine cover quality, medium format",
  },
  {
    id: "painterly-muse",
    name: "Painterly Muse",
    badge: "Artistic",
    description: "Expressive brushwork, rich colour and illustrative composition",
    type: "image",
    speed: "~6s",
    qualityLabel: "Illustration",
    creditCost: 8,
    engine: "pollinations",
    styleSuffix: "painterly illustration, expressive brushwork, rich colour, gouache texture",
  },
];

export const VIDEO_MODELS: ModelInfo[] = [
  {
    id: "motion-v1-realism",
    name: "Motion-v1 Realism",
    badge: "Popular",
    description: "Natural camera drift and parallax from a single keyframe",
    type: "video",
    speed: "real-time",
    qualityLabel: "30 fps",
    isPopular: true,
    creditCost: 15,
    engine: "motion-engine",
    look: { grain: 0.04, vignette: 0.35, letterbox: false, handheld: 0.35 },
  },
  {
    id: "cinematic-camera-pro",
    name: "Cinematic Camera Pro",
    badge: "Widescreen",
    description: "Letterboxed 2.39:1 look with grain, vignette and light leaks",
    type: "video",
    speed: "real-time",
    qualityLabel: "30 fps · 2.39:1",
    creditCost: 20,
    engine: "motion-engine",
    look: { grain: 0.08, vignette: 0.55, letterbox: true, lightLeak: true, tint: "#f59e0b", tintAlpha: 0.08, handheld: 0.2 },
  },
  {
    id: "anime-flux-motion",
    name: "Anime Flux Motion",
    badge: "Stylized",
    description: "Punchy saturation and clean motion for illustrated frames",
    type: "video",
    speed: "real-time",
    qualityLabel: "30 fps",
    creditCost: 15,
    engine: "motion-engine",
    look: { grain: 0, vignette: 0.2, letterbox: false, saturation: 1.25, contrast: 1.08, handheld: 0 },
  },
];

export const CINEMA_MODELS: ModelInfo[] = [
  {
    id: "kling-3-cinema",
    name: "Kling 3.0 Cinema",
    badge: "Flagship",
    description: "Multi-axis camera choreography with cinematic colour",
    type: "cinema",
    speed: "real-time",
    qualityLabel: "30 fps · graded",
    isPopular: true,
    creditCost: 30,
    engine: "motion-engine",
    look: { grain: 0.06, vignette: 0.5, letterbox: true, tint: "#0ea5e9", tintAlpha: 0.07, handheld: 0.25 },
  },
  {
    id: "google-veo-3",
    name: "Veo 3.1 Pro",
    badge: "Broadcast",
    description: "Clean broadcast look, minimal grain, precise camera moves",
    type: "cinema",
    speed: "real-time",
    qualityLabel: "30 fps · clean",
    creditCost: 35,
    engine: "motion-engine",
    look: { grain: 0.02, vignette: 0.3, letterbox: false, contrast: 1.05, handheld: 0.1 },
  },
  {
    id: "wan-2-6-camera",
    name: "WAN 2.6 Camera Control",
    badge: "Lens optics",
    description: "Focal-length aware framing and aperture-driven vignette",
    type: "cinema",
    speed: "real-time",
    qualityLabel: "30 fps · optics",
    creditCost: 25,
    engine: "motion-engine",
    look: { grain: 0.05, vignette: 0.6, letterbox: true, lightLeak: true, handheld: 0.15 },
  },
  {
    id: "hailuo-2-3-motion",
    name: "Hailuo 2.3 Speed Ramp",
    badge: "Action",
    description: "Speed-ramped, high-energy moves with handheld feel",
    type: "cinema",
    speed: "real-time",
    qualityLabel: "30 fps · ramped",
    creditCost: 25,
    engine: "motion-engine",
    look: { grain: 0.07, vignette: 0.4, letterbox: false, saturation: 1.1, handheld: 0.7 },
  },
];

export const LIPSYNC_MODELS: ModelInfo[] = [
  {
    id: "fluxframe-speak-2",
    name: "FluxFrame Speak 2.0",
    badge: "Audio-driven",
    description: "Mouth and head motion driven by the real audio envelope",
    type: "lipsync",
    speed: "real-time",
    qualityLabel: "30 fps",
    isPopular: true,
    creditCost: 20,
    engine: "lipsync-engine",
    look: { grain: 0.03, vignette: 0.35, letterbox: false, handheld: 0.15 },
  },
  {
    id: "veo-talk-pro",
    name: "Veo Talk Pro",
    badge: "Studio",
    description: "Softer expression curve with studio vignette",
    type: "lipsync",
    speed: "real-time",
    qualityLabel: "30 fps · studio",
    creditCost: 25,
    engine: "lipsync-engine",
    look: { grain: 0.02, vignette: 0.5, letterbox: false, tint: "#f59e0b", tintAlpha: 0.05, handheld: 0.05 },
  },
];

export const ALL_MODELS: ModelInfo[] = [...IMAGE_MODELS, ...VIDEO_MODELS, ...CINEMA_MODELS, ...LIPSYNC_MODELS];

export function findModel(id: string): ModelInfo | undefined {
  return ALL_MODELS.find((m) => m.id === id);
}

export function modelsForType(type: GenerationType): ModelInfo[] {
  switch (type) {
    case "image":
      return IMAGE_MODELS;
    case "video":
      return VIDEO_MODELS;
    case "cinema":
      return CINEMA_MODELS;
    case "lipsync":
      return LIPSYNC_MODELS;
    default:
      return [];
  }
}

// ---- camera ------------------------------------------------------------------

export const FOCAL_LENGTHS: FocalLength[] = ["18mm", "24mm", "35mm", "50mm", "85mm", "135mm"];
export const APERTURES: Aperture[] = ["f/1.4", "f/2.8", "f/5.6", "f/11", "f/16"];

export interface CameraPreset extends Pick<CameraMotionSettings, "pan" | "tilt" | "zoom" | "dolly" | "orbit" | "roll"> {
  id: string;
  name: string;
  category: "Cinematic" | "Dynamic" | "Specialty";
  description: string;
}

export const CAMERA_PRESETS: CameraPreset[] = [
  { id: "static", name: "Static Lock", category: "Cinematic", pan: 0, tilt: 0, zoom: 0, dolly: 0, orbit: 0, roll: 0, description: "Tripod lock with subtle ambient drift" },
  { id: "pan-right", name: "Pan Right", category: "Cinematic", pan: 45, tilt: 0, zoom: 0, dolly: 0, orbit: 0, roll: 0, description: "Horizontal sweep across the scene" },
  { id: "pan-left", name: "Pan Left", category: "Cinematic", pan: -45, tilt: 0, zoom: 0, dolly: 0, orbit: 0, roll: 0, description: "Horizontal sweep moving left" },
  { id: "dolly-in", name: "Dolly In", category: "Dynamic", pan: 0, tilt: 0, zoom: 45, dolly: 60, orbit: 0, roll: 0, description: "Push toward the subject, accentuating depth" },
  { id: "dolly-out", name: "Dolly Out", category: "Dynamic", pan: 0, tilt: 0, zoom: -40, dolly: -60, orbit: 0, roll: 0, description: "Pull back to reveal the environment" },
  { id: "orbit", name: "Hero Orbit", category: "Dynamic", pan: 20, tilt: 0, zoom: 15, dolly: 0, orbit: 120, roll: 0, description: "Arc around the subject" },
  { id: "crane-up", name: "Crane Up", category: "Cinematic", pan: 0, tilt: 35, zoom: 10, dolly: 0, orbit: 0, roll: 0, description: "Rise while looking down over the scene" },
  { id: "fpv-dive", name: "FPV Dive", category: "Specialty", pan: 30, tilt: -50, zoom: 80, dolly: 90, orbit: 40, roll: 12, description: "Aggressive aerial approach" },
  { id: "bullet-time", name: "Bullet Time", category: "Specialty", pan: 0, tilt: 0, zoom: 10, dolly: 0, orbit: 180, roll: 0, description: "Frozen-moment orbital sweep" },
  { id: "tracking", name: "Tracking Shot", category: "Cinematic", pan: 15, tilt: 0, zoom: 25, dolly: 40, orbit: 20, roll: 0, description: "Follow the subject through the frame" },
  { id: "dutch-roll", name: "Dutch Roll", category: "Specialty", pan: 10, tilt: 0, zoom: 20, dolly: 0, orbit: 0, roll: 30, description: "Tilted horizon for unease" },
];

export const DEFAULT_CAMERA: CameraMotionSettings = {
  preset: "dolly-in",
  pan: 0,
  tilt: 0,
  zoom: 45,
  dolly: 60,
  orbit: 0,
  roll: 0,
  focalLength: "35mm",
  aperture: "f/2.8",
};

export function cameraFromPreset(preset: CameraPreset, base: Partial<CameraMotionSettings> = {}): CameraMotionSettings {
  return {
    focalLength: base.focalLength ?? "35mm",
    aperture: base.aperture ?? "f/2.8",
    preset: preset.id,
    pan: preset.pan,
    tilt: preset.tilt,
    zoom: preset.zoom,
    dolly: preset.dolly,
    orbit: preset.orbit,
    roll: preset.roll,
  };
}

/** Human-readable camera description, also appended to keyframe prompts. */
export function describeCamera(camera: CameraMotionSettings): string {
  const parts: string[] = [];
  if (Math.abs(camera.pan) > 5) parts.push(`pan ${camera.pan > 0 ? "right" : "left"}`);
  if (Math.abs(camera.tilt) > 5) parts.push(`tilt ${camera.tilt > 0 ? "up" : "down"}`);
  if (Math.abs(camera.zoom) > 5) parts.push(camera.zoom > 0 ? "zoom in" : "zoom out");
  if (Math.abs(camera.dolly) > 5) parts.push(camera.dolly > 0 ? "dolly in" : "dolly out");
  if (Math.abs(camera.orbit) > 5) parts.push("orbit");
  if (Math.abs(camera.roll) > 3) parts.push("dutch angle");
  if (parts.length === 0) parts.push("static shot");
  return `${parts.join(", ")}, ${camera.focalLength} lens at ${camera.aperture}`;
}

// ---- durations ---------------------------------------------------------------

export const VIDEO_DURATIONS = [3, 5, 10] as const;
export const VIDEO_FPS = 30;

// ---- explore showcase --------------------------------------------------------

export interface ShowcasePreset {
  id: string;
  title: string;
  prompt: string;
  type: GenerationType;
  category: string;
  model: string;
  aspectRatio: string;
  cameraPreset?: string;
  previewUrl: string;
  seed: number;
}

const showcase = (id: string) => `${import.meta.env.BASE_URL}showcase/${id}.jpg`;

export const SHOWCASE_CATEGORIES = ["All", "Cinematic", "Sci-Fi", "Nature", "Portrait", "Architecture", "Commercial", "Automotive", "Fantasy", "Illustration"];

export const SHOWCASE_PRESETS: ShowcasePreset[] = [
  { id: "valkyrie", title: "Obsidian Valkyrie", prompt: "Cinematic portrait of a cybernetic warrior in obsidian armour with bioluminescent blue trim, 85mm lens, volumetric smoke, dramatic rim lighting", type: "image", category: "Sci-Fi", model: "flux-realism-v2", aspectRatio: "16:9", previewUrl: showcase("valkyrie"), seed: 8492041 },
  { id: "rainforest", title: "Bioluminescent Rainforest", prompt: "Drone shot gliding through an enchanted bioluminescent rainforest, glowing flora, floating spores, atmospheric mist", type: "video", category: "Nature", model: "motion-v1-realism", aspectRatio: "16:9", cameraPreset: "tracking", previewUrl: showcase("rainforest"), seed: 3391 },
  { id: "tokyo-drift", title: "Neon Drift", prompt: "1980s sports car drifting around a rain-soaked neon street corner at sunset, reflections in puddles, motion blur, retro-wave aesthetics", type: "cinema", category: "Automotive", model: "kling-3-cinema", aspectRatio: "16:9", cameraPreset: "tracking", previewUrl: showcase("tokyo-drift"), seed: 7710 },
  { id: "glass-spire", title: "Glass Prism Spire", prompt: "Futuristic skyscraper built from iridescent glass prisms, dramatic low-angle shot, clear sapphire sky, architectural photography", type: "image", category: "Architecture", model: "hyperdetail-ultra", aspectRatio: "9:16", previewUrl: showcase("glass-spire"), seed: 1209384 },
  { id: "celestial-dragon", title: "Celestial Dragon", prompt: "Ethereal spirit dragon made of liquid starlight weaving through falling cherry blossom petals, luminous, golden-ratio composition", type: "image", category: "Fantasy", model: "cyber-concept-pro", aspectRatio: "1:1", previewUrl: showcase("celestial-dragon"), seed: 5521 },
  { id: "hyperjump", title: "Hyperjump", prompt: "First-person view from a starship cockpit during a light-speed jump, streaking stars, lens flare, intense kinetic energy", type: "cinema", category: "Sci-Fi", model: "google-veo-3", aspectRatio: "21:9", cameraPreset: "dolly-in", previewUrl: showcase("hyperjump"), seed: 90210 },
  { id: "perfume", title: "Silk & Gold Perfume", prompt: "Luxury glass perfume bottle rising from dark rippling silk, gold dust particles, caustic lighting, product commercial", type: "cinema", category: "Commercial", model: "wan-2-6-camera", aspectRatio: "9:16", cameraPreset: "orbit", previewUrl: showcase("perfume"), seed: 4141 },
  { id: "noir-detective", title: "Neo-Tokyo Detective", prompt: "Moody noir detective in an illuminated trench coat standing in a rain-drenched alley, holograms reflecting off wet pavement", type: "image", category: "Cinematic", model: "studio-cinema-xl", aspectRatio: "16:9", previewUrl: showcase("noir-detective"), seed: 2277 },
  { id: "volcano", title: "Volcanic Island Flyby", prompt: "Aerial orbit around an erupting tropical island volcano, glowing lava rivers flowing into turquoise ocean waves", type: "cinema", category: "Nature", model: "hailuo-2-3-motion", aspectRatio: "16:9", cameraPreset: "orbit", previewUrl: showcase("volcano"), seed: 6060 },
  { id: "editorial-portrait", title: "Editorial Portrait", prompt: "Editorial fashion portrait of a woman with silver braids in a sculptural white coat, soft studio light, medium format", type: "image", category: "Portrait", model: "aurora-frame", aspectRatio: "3:4", previewUrl: showcase("editorial-portrait"), seed: 3030 },
  { id: "market-illustration", title: "Lantern Market", prompt: "Painterly illustration of a floating night market lit by paper lanterns, boats laden with fruit, warm gouache texture", type: "image", category: "Illustration", model: "painterly-muse", aspectRatio: "4:3", previewUrl: showcase("market-illustration"), seed: 8181 },
  { id: "sneaker-ad", title: "Sneaker Launch Ad", prompt: "Studio product photo of a futuristic running sneaker floating above a wet reflective floor, dramatic teal and orange lighting", type: "marketing", category: "Commercial", model: "ad-engine", aspectRatio: "9:16", previewUrl: showcase("sneaker-ad"), seed: 1212 },
];

// ---- apps --------------------------------------------------------------------

export interface AppField {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "image";
  placeholder?: string;
  options?: string[];
  required?: boolean;
  help?: string;
}

export interface CreativeApp {
  id: string;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  icon: "Shirt" | "Store" | "Zap" | "Clapperboard" | "UserSquare";
  category: "Fashion" | "Branding" | "Storyboarding" | "Character";
  creditCost: number;
  outputKind: "image" | "video";
  fields: AppField[];
  /** How many generations the app performs (for progress + ETA copy). */
  steps: number;
}

export const STYLE_SNAP_STYLES = ["Techwear", "Y2K", "Streetwear", "Haute Couture", "Old Money", "Cyberpunk", "Cottagecore", "Minimalist", "Vintage 70s", "Gorpcore", "Dark Academia", "Athleisure", "Avant-garde", "Coastal"];

export const CREATIVE_APPS: CreativeApp[] = [
  {
    id: "style-snap",
    name: "Style Snap",
    badge: "Fashion",
    tagline: "Editorial outfit looks in 14 curated aesthetics",
    description: "Describe a person and pick an aesthetic. Style Snap composes a full-body editorial fashion shot in that style.",
    icon: "Shirt",
    category: "Fashion",
    creditCost: 10,
    outputKind: "image",
    steps: 1,
    fields: [
      { key: "subject", label: "Subject", type: "text", placeholder: "e.g. tall man with curly hair and glasses", required: true },
      { key: "style", label: "Aesthetic", type: "select", options: STYLE_SNAP_STYLES, required: true },
      { key: "setting", label: "Setting", type: "text", placeholder: "e.g. Tokyo crosswalk at dusk" },
    ],
  },
  {
    id: "outfit-vending",
    name: "Outfit Vending Machine",
    badge: "Viral",
    tagline: "Your wardrobe as a Japanese vending display",
    description: "Turns an outfit description into a glowing arcade-style vending machine filled with colour-matched pieces.",
    icon: "Store",
    category: "Fashion",
    creditCost: 12,
    outputKind: "image",
    steps: 1,
    fields: [
      { key: "outfit", label: "Outfit pieces", type: "textarea", placeholder: "e.g. cream trench coat, burgundy loafers, gold watch, tortoise sunglasses", required: true },
      { key: "palette", label: "Colour palette", type: "select", options: ["Warm neutrals", "Pastel", "Monochrome", "Neon", "Earth tones"] },
    ],
  },
  {
    id: "logomotion",
    name: "LogoMotion",
    badge: "Branding",
    tagline: "A kinetic logo reveal from a brand name",
    description: "Generates a logo mark in your chosen material, then renders a 5-second orbiting reveal video.",
    icon: "Zap",
    category: "Branding",
    creditCost: 15,
    outputKind: "video",
    steps: 2,
    fields: [
      { key: "brand", label: "Brand name", type: "text", placeholder: "e.g. Northwind", required: true },
      { key: "material", label: "Material", type: "select", options: ["Liquid chrome", "Neon glass", "Brushed gold", "Volumetric particles", "Matte ceramic"], required: true },
      { key: "vibe", label: "Vibe", type: "text", placeholder: "e.g. premium outdoor gear" },
    ],
  },
  {
    id: "storyboard",
    name: "Shots Storyboarder",
    badge: "Filmmaking",
    tagline: "Logline to a four-shot storyboard",
    description: "Generates establishing, medium, close-up and reverse shots for your scene and composes them into a labelled contact sheet.",
    icon: "Clapperboard",
    category: "Storyboarding",
    creditCost: 20,
    outputKind: "image",
    steps: 4,
    fields: [
      { key: "logline", label: "Scene logline", type: "textarea", placeholder: "e.g. A lighthouse keeper discovers a message in a bottle during a storm", required: true },
      { key: "style", label: "Visual style", type: "select", options: ["Cinematic realism", "Graphic novel", "Anime", "Noir", "Documentary"], required: true },
    ],
  },
  {
    id: "character-sheet",
    name: "Character Sheet",
    badge: "Character",
    tagline: "Consistent reference sheet for a character",
    description: "Produces a turnaround-style character reference sheet with front, profile and expression views for reuse across studios.",
    icon: "UserSquare",
    category: "Character",
    creditCost: 12,
    outputKind: "image",
    steps: 1,
    fields: [
      { key: "character", label: "Character description", type: "textarea", placeholder: "e.g. young astronaut with freckles, copper hair, orange EVA suit", required: true },
      { key: "style", label: "Art style", type: "select", options: ["Realistic", "Pixar-style 3D", "Anime", "Comic ink", "Watercolour"], required: true },
    ],
  },
];

// ---- marketing ---------------------------------------------------------------

export interface AdSceneTemplate {
  kind: "hook" | "feature" | "proof" | "cta";
  durationMs: number;
  motion: "push" | "pull" | "pan" | "orbit" | "static";
}

export interface AdTemplate {
  id: string;
  title: string;
  badge: string;
  description: string;
  aspectRatio: string;
  scenes: AdSceneTemplate[];
}

export const AD_TEMPLATES: AdTemplate[] = [
  {
    id: "ugc-review",
    title: "UGC Product Review",
    badge: "9:16 · Social",
    description: "Hook, feature callouts and a social-proof line — the TikTok formula.",
    aspectRatio: "9:16",
    scenes: [
      { kind: "hook", durationMs: 2400, motion: "push" },
      { kind: "feature", durationMs: 2600, motion: "pan" },
      { kind: "proof", durationMs: 2200, motion: "orbit" },
      { kind: "cta", durationMs: 2300, motion: "pull" },
    ],
  },
  {
    id: "unboxing-reveal",
    title: "Cinematic Reveal",
    badge: "High impact",
    description: "Slow push-in reveal with a single bold claim and a strong close.",
    aspectRatio: "9:16",
    scenes: [
      { kind: "hook", durationMs: 3200, motion: "push" },
      { kind: "feature", durationMs: 3000, motion: "orbit" },
      { kind: "cta", durationMs: 2800, motion: "static" },
    ],
  },
  {
    id: "spotlight-360",
    title: "360° Product Spotlight",
    badge: "16:9 · Desktop",
    description: "Orbiting spotlight for landing pages and YouTube pre-roll.",
    aspectRatio: "16:9",
    scenes: [
      { kind: "hook", durationMs: 2500, motion: "orbit" },
      { kind: "feature", durationMs: 2500, motion: "orbit" },
      { kind: "proof", durationMs: 2000, motion: "pan" },
      { kind: "cta", durationMs: 2500, motion: "pull" },
    ],
  },
  {
    id: "founder-story",
    title: "Founder Story",
    badge: "Brand",
    description: "Warm, narrative pacing that leads with the why.",
    aspectRatio: "9:16",
    scenes: [
      { kind: "hook", durationMs: 3000, motion: "pull" },
      { kind: "proof", durationMs: 3000, motion: "pan" },
      { kind: "feature", durationMs: 2500, motion: "push" },
      { kind: "cta", durationMs: 2500, motion: "static" },
    ],
  },
];

export interface BrandTone {
  id: string;
  label: string;
  accent: string;
  secondary: string;
  headline: (product: string) => string;
  subheadline: (product: string) => string;
  proof: (product: string) => string;
  cta: string;
}

export const BRAND_TONES: BrandTone[] = [
  {
    id: "energetic",
    label: "Energetic & Modern",
    accent: "#10b981",
    secondary: "#22d3ee",
    headline: (p) => `Meet ${p}.`,
    subheadline: () => "Built for people who move fast.",
    proof: () => "Loved by 12,000+ early adopters",
    cta: "Get yours today",
  },
  {
    id: "luxury",
    label: "Luxury & Minimal",
    accent: "#f5d0a9",
    secondary: "#fafafa",
    headline: (p) => `${p}`,
    subheadline: () => "Quiet craftsmanship. Nothing more.",
    proof: () => "Hand-finished in small batches",
    cta: "Discover the collection",
  },
  {
    id: "technical",
    label: "Informative & Technical",
    accent: "#38bdf8",
    secondary: "#a5b4fc",
    headline: (p) => `${p}, engineered.`,
    subheadline: () => "Precision materials. Measured performance.",
    proof: () => "Independently tested, 3-year warranty",
    cta: "See the specs",
  },
  {
    id: "urgent",
    label: "Urgent & Promotional",
    accent: "#f97316",
    secondary: "#fde047",
    headline: (p) => `${p} — 40% off`,
    subheadline: () => "Launch pricing ends Sunday.",
    proof: () => "Selling fast: 2,300 sold this week",
    cta: "Claim the deal",
  },
];

export const AD_FORMATS = [
  { ratio: "9:16", label: "Reels / TikTok" },
  { ratio: "16:9", label: "YouTube" },
  { ratio: "1:1", label: "Feed" },
];

/** Extracts a readable product name from a store URL slug. */
export function productNameFromUrl(url: string): string {
  try {
    const { pathname, hostname } = new URL(url.includes("://") ? url : `https://${url}`);
    const segment = pathname.split("/").filter(Boolean).pop() ?? "";
    const cleaned = segment.replace(/\.[a-z]+$/i, "").replace(/[-_+]+/g, " ").replace(/\b\d{4,}\b/g, "").trim();
    if (cleaned.length > 2) return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
    const brand = hostname.replace(/^www\./, "").split(".")[0];
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  } catch {
    return "";
  }
}

// ---- plans -------------------------------------------------------------------

export interface SubscriptionTier {
  id: string;
  name: string;
  price: string;
  billingPeriod: string;
  creditsMonthly: number;
  badge?: string;
  isPopular?: boolean;
  features: string[];
}

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  { id: "free", name: "Free", price: "$0", billingPeriod: "forever", creditsMonthly: 50, features: ["Image generation", "3-second motion previews", "Community showcase", "Local project library"] },
  { id: "starter", name: "Creator", price: "$19", billingPeriod: "per month", creditsMonthly: 400, badge: "Popular", isPopular: true, features: ["400 credits / month", "All cinema camera engines", "10-second clips", "Commercial licence", "Priority queue"] },
  { id: "pro", name: "Cinema Pro", price: "$59", billingPeriod: "per month", creditsMonthly: 1500, badge: "Best value", features: ["1,500 credits / month", "LipSync and Ad studios", "Node canvas workflows", "4K exports", "Character sheets"] },
  { id: "ultra", name: "Studio", price: "$149", billingPeriod: "per month", creditsMonthly: 5000, features: ["5,000 credits / month", "Parallel generation", "Dedicated queue", "API access", "Account manager"] },
];

export const PROMPT_ENHANCERS: Record<string, string> = {
  cinematic: "cinematic lighting, anamorphic lens flare, shallow depth of field, volumetric atmosphere, film grain",
  photoreal: "photorealistic, 85mm lens, soft natural light, ultra-detailed skin and fabric texture",
  concept: "concept art, dramatic composition, painterly detail, atmospheric perspective",
  product: "studio product photography, softbox lighting, clean reflections, commercial quality",
};

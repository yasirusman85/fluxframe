/**
 * Domain model for everything FluxFrame generates.
 *
 * A "project" is one generation request and its output. Outputs are
 * stored as blobs in IndexedDB (see lib/asset-store) and referenced by
 * asset id, so localStorage only holds small metadata.
 */

export type GenerationType = "image" | "video" | "cinema" | "lipsync" | "marketing";

export type MediaKind = "image" | "video";

export type GenerationStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";

export type Quality = "draft" | "standard" | "high";

/** Which engine actually produced the output. Surfaced in the UI for honesty. */
export type ProviderSource =
  | "pollinations" // real AI image from the public Pollinations endpoint
  | "procedural" // deterministic SVG fallback when the endpoint is unavailable
  | "motion-engine" // in-browser canvas/MediaRecorder camera-motion renderer
  | "lipsync-engine" // in-browser audio-driven talking-portrait renderer
  | "ad-engine"; // in-browser multi-scene ad renderer

export type FocalLength = "18mm" | "24mm" | "35mm" | "50mm" | "85mm" | "135mm";
export type Aperture = "f/1.4" | "f/2.8" | "f/5.6" | "f/11" | "f/16";

export interface CameraMotionSettings {
  preset?: string;
  /** Horizontal sweep in degrees, -90..90. Positive pans right. */
  pan: number;
  /** Vertical sweep in degrees, -90..90. Positive tilts up. */
  tilt: number;
  /** Optical zoom, -100..100 percent. Positive pushes in. */
  zoom: number;
  /** Physical dolly, -100..100. Positive approaches the subject. */
  dolly: number;
  /** Orbit around the subject, -180..180 degrees. */
  orbit: number;
  /** Dutch-angle roll, -45..45 degrees. */
  roll: number;
  focalLength: FocalLength;
  aperture: Aperture;
}

export interface MarketingSettings {
  template: string;
  tone: string;
  format: string;
  productName: string;
  productUrl?: string;
  headline: string;
  subheadline: string;
  cta: string;
  /** Hex accent colour used by the ad renderer. */
  accent: string;
  secondary?: string;
  features?: string[];
  proof?: string;
}

export interface LipSyncSettings {
  mode: "script" | "audio";
  script?: string;
  voice?: string;
  /** 0..100 facial expression intensity. */
  expression: number;
  /** 0..100 mouth amplitude. */
  amplitude: number;
  captions: boolean;
  audioFileName?: string;
  /** Normalised mouth position (0..1) used by the jaw renderer. */
  mouthX?: number;
  mouthY?: number;
  visualizer?: boolean;
}

export interface GenerationProject {
  id: string;
  type: GenerationType;
  mediaKind: MediaKind;
  title: string;
  prompt: string;
  negativePrompt?: string;
  model: string;
  aspectRatio: string;
  width?: number;
  height?: number;
  /** Seconds, video outputs only. */
  duration?: number;
  fps?: number;
  quality: Quality;
  status: GenerationStatus;
  /** 0..100 */
  progress: number;
  stageMessage?: string;
  errorMessage?: string;

  outputAssetId?: string;
  /** Remote URL or data URL used when there is no stored blob (procedural fallback). */
  outputUrl?: string;
  outputMimeType?: string;
  thumbnailAssetId?: string;
  thumbnailUrl?: string;
  /** Uploaded keyframe / portrait / packshot. */
  sourceAssetId?: string;
  /** AI-generated keyframe used as the source for motion pipelines. */
  keyframeAssetId?: string;
  audioAssetId?: string;

  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  seed: number;
  creditCost: number;
  providerSource?: ProviderSource;
  providerDetail?: string;
  renderMs?: number;

  cameraMotion?: CameraMotionSettings;
  motionStrength?: number;
  marketing?: MarketingSettings;
  lipsync?: LipSyncSettings;

  tags?: string[];
  origin?: "studio" | "canvas" | "app" | "remix";
  parentId?: string;
}

export type CreateProjectInput = Pick<GenerationProject, "type" | "prompt" | "model" | "aspectRatio"> &
  Partial<
    Pick<
      GenerationProject,
      | "title"
      | "negativePrompt"
      | "duration"
      | "fps"
      | "quality"
      | "seed"
      | "creditCost"
      | "sourceAssetId"
      | "audioAssetId"
      | "cameraMotion"
      | "motionStrength"
      | "marketing"
      | "lipsync"
      | "tags"
      | "origin"
      | "parentId"
      | "width"
      | "height"
    >
  >;

export const MEDIA_KIND_BY_TYPE: Record<GenerationType, MediaKind> = {
  image: "image",
  video: "video",
  cinema: "video",
  lipsync: "video",
  marketing: "video",
};

export const TYPE_LABELS: Record<GenerationType, string> = {
  image: "Image",
  video: "Video",
  cinema: "Cinema",
  lipsync: "LipSync",
  marketing: "Ad",
};

export const STUDIO_ROUTES: Record<GenerationType, string> = {
  image: "/create/image",
  video: "/create/video",
  cinema: "/create/cinema",
  lipsync: "/create/lipsync",
  marketing: "/create/marketing",
};

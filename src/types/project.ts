export type GenerationType = "image" | "video" | "cinema" | "lipsync" | "marketing";

export type GenerationStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export interface CameraMotionSettings {
  preset?: string;
  pan: number;
  tilt: number;
  zoom: number;
  dolly?: number;
  crane?: number;
  orbit?: number;
  focalLength?: string; // 18mm, 24mm, 35mm, 50mm, 85mm, 135mm
  aperture?: string; // f/1.4, f/2.8, f/5.6, f/11, f/16
  anamorphic?: boolean;
}

export interface GenerationProject {
  id: string;
  type: GenerationType;
  title: string;
  prompt: string;
  negativePrompt?: string;
  model: string;
  aspectRatio: string;
  duration?: number;
  quality: "draft" | "standard" | "high";
  status: GenerationStatus;
  progress: number;
  outputUrl?: string;
  thumbnailUrl?: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  seed?: number;
  motionStrength?: number;
  initialImageUrl?: string;
  audioUrl?: string;
  errorMessage?: string;
  providerSource?: "pollinations-ai" | "procedural-fallback" | "kling-simulated" | "veo-simulated" | "lipsync-simulated";
  cameraMotion?: CameraMotionSettings;
  marketingFormat?: string;
  productUrl?: string;
}

export interface CreateProjectInput {
  type: GenerationType;
  prompt: string;
  negativePrompt?: string;
  model: string;
  aspectRatio: string;
  duration?: number;
  quality?: "draft" | "standard" | "high";
  seed?: number;
  motionStrength?: number;
  initialImageUrl?: string;
  audioUrl?: string;
  cameraMotion?: CameraMotionSettings;
  marketingFormat?: string;
  productUrl?: string;
}

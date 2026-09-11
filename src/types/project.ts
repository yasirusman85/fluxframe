export type GenerationType = "image" | "video";

export type GenerationStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

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
  errorMessage?: string;
  providerSource?: "pollinations-ai" | "procedural-fallback";
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
}

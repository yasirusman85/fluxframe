/**
 * Static copy and metadata for the Explore landing page. Kept out of the
 * component files so react-refresh only sees component exports there.
 */
import type { LucideIcon } from "lucide-react";
import { AudioLines, Clapperboard, Film, ImageIcon, Megaphone } from "lucide-react";
import type { GenerationType } from "../../types/project";
import { modelsForType } from "../../lib/catalog";
import type { BadgeVariant } from "../../components/ui";

export interface StudioMeta {
  type: GenerationType;
  name: string;
  /** One-line value proposition. */
  tagline: string;
  /** What the studio really produces — honest, concrete. */
  delivers: string;
  icon: LucideIcon;
}

/** Order matches the hero composer's studio select. */
export const STUDIOS: StudioMeta[] = [
  {
    type: "cinema",
    name: "Cinema Studio",
    tagline: "Choreograph pan, tilt, dolly and orbit moves over an AI keyframe.",
    delivers: "Real .webm clip, colour graded",
    icon: Clapperboard,
  },
  {
    type: "image",
    name: "Image Studio",
    tagline: "Six engine styles, negative prompts and reproducible seeds.",
    delivers: "Real JPEG via Pollinations",
    icon: ImageIcon,
  },
  {
    type: "video",
    name: "Video Studio",
    tagline: "Turn a prompt or your own keyframe into a camera-motion clip.",
    delivers: "Real .webm clip, 3–10 s",
    icon: Film,
  },
  {
    type: "marketing",
    name: "Marketing Studio",
    tagline: "A packshot becomes a multi-scene ad with headline, proof and CTA.",
    delivers: "Real .webm ad in 9:16, 16:9 or 1:1",
    icon: Megaphone,
  },
  {
    type: "lipsync",
    name: "LipSync Studio",
    tagline: "A portrait and your audio become a talking-head clip.",
    delivers: "Real .webm with your audio muxed in",
    icon: AudioLines,
  },
];

export const MARKETING_CREDIT_COST = 25;

/** Lowest credit cost for a studio, read from the catalog so copy never drifts. */
export function studioStartingCost(type: GenerationType): number {
  if (type === "marketing") return MARKETING_CREDIT_COST;
  const costs = modelsForType(type).map((m) => m.creditCost);
  return costs.length ? Math.min(...costs) : 0;
}

export interface TryPrompt {
  label: string;
  prompt: string;
}

export const TRY_PROMPTS: TryPrompt[] = [
  { label: "Astronaut in neon rain", prompt: "Lone astronaut walking through neon-lit rain at night, reflections on wet asphalt, slow dolly in, anamorphic" },
  { label: "Dew at golden hour", prompt: "Macro shot of dew drops on a spider web at golden hour, soft bokeh meadow, 100mm macro lens" },
  { label: "Brutalist villa on a fjord", prompt: "Brutalist concrete villa perched above a misty fjord at dusk, warm interior light, 24mm architectural photography" },
  { label: "Ceramic mug packshot", prompt: "Studio packshot of a matte ceramic coffee mug on wet slate, soft rim light, steam curling upward" },
];

/** Showcase ids used as the faint backdrop montage behind the hero. */
export const HERO_STILL_IDS = ["valkyrie", "tokyo-drift", "hyperjump", "perfume"];

export const TYPE_BADGE_VARIANT: Record<GenerationType, BadgeVariant> = {
  image: "brand",
  video: "sky",
  cinema: "sky",
  marketing: "amber",
  lipsync: "neutral",
};

/**
 * Static copy and link data for the marketing landing page.
 *
 * Kept out of the component files so react-refresh only ever sees component
 * exports there, and so the nav/footer column definitions stay in one place.
 */
import type { ShowcasePreset } from "../../lib/catalog";

export interface LandingLink {
  label: string;
  to: string;
  /** Small pill shown after the label ("NEW", "BETA"). */
  tag?: string;
}

export interface LandingGroup {
  title: string;
  links: LandingLink[];
}

/** Primary navigation, in header order. */
export const LANDING_NAV: LandingLink[] = [
  { label: "Explore", to: "/" },
  { label: "Image", to: "/create/image" },
  { label: "Video", to: "/create/video" },
  { label: "Audio", to: "/create/lipsync" },
  { label: "MCP", to: "/apps", tag: "NEW" },
  { label: "Genjutsu", to: "/create/video?mode=genjutsu" },
  { label: "Effects", to: "/apps?view=effects" },
  { label: "Cinema Studio", to: "/create/cinema" },
  { label: "Marketing Studio", to: "/create/marketing" },
  { label: "Supercomputer", to: "/canvas?mode=agent" },
  { label: "Edit", to: "/create/image?mode=edit" },
  { label: "Canvas", to: "/canvas" },
  { label: "Community", to: "/projects" },
];

export const LANDING_FOOTER_GROUPS: LandingGroup[] = [
  {
    title: "Create",
    links: [
      { label: "AI Video", to: "/create/video" },
      { label: "AI Image", to: "/create/image" },
      { label: "Cinema Studio", to: "/create/cinema" },
      { label: "LipSync Studio", to: "/create/lipsync" },
      { label: "Marketing Studio", to: "/create/marketing" },
    ],
  },
  {
    title: "Models",
    links: [
      { label: "Flux Realism", to: "/create/image?model=flux-realism-v2" },
      { label: "Studio Cinema", to: "/create/image?model=studio-cinema-xl" },
      { label: "Motion Engine", to: "/create/video?model=motion-v1-realism" },
      { label: "Kling Cinema", to: "/create/cinema?model=kling-3-cinema" },
    ],
  },
  {
    title: "Workspaces",
    links: [
      { label: "Node Canvas", to: "/canvas", tag: "BETA" },
      { label: "Creative Apps", to: "/apps" },
      { label: "Library", to: "/projects" },
      { label: "Favorites", to: "/projects?filter=favorites" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Account", to: "/account" },
      { label: "Plans", to: "/account?tab=plans" },
      { label: "API Keys", to: "/account?tab=api-keys" },
      { label: "Storage", to: "/account?tab=storage" },
    ],
  },
];

export const LANDING_ADDRESS = "Higgsfield Studio · Creative AI workspace";

export const LANDING_SOCIALS: LandingLink[] = [
  { label: "X / Twitter", to: "/account" },
  { label: "Discord", to: "/account" },
  { label: "YouTube", to: "/account" },
];

/** Cards in the top horizontal rail. Each deep-links into a studio. */
export const HERO_RAIL: LandingLink[] = [
  { label: "API Cashback", to: "/account?tab=plans" },
  { label: "Production Skills Bundle", to: "/apps" },
  { label: "Paid Ads with AI", to: "/create/marketing" },
  { label: "Higgsfield Genjutsu", to: "/create/video", tag: "NEW" },
];

/** Short descriptor shown under a rail card title. */
export const HERO_RAIL_SUBTITLES: Record<string, string> = {
  "/": "Everything new, in one place",
  "/create/image": "Six engines, real JPEG output",
  "/create/video": "Keyframe to clip with camera motion",
  "/create/cinema": "Pan, tilt, dolly, orbit over a keyframe",
  "/create/lipsync": "Portrait plus audio becomes a talking head",
  "/create/marketing": "Packshot to multi-scene product ad",
  "/create/marketing?tab=ad-form": "Packshot to multi-scene product ad",
  "/canvas": "Chain prompts and motion as nodes",
  "/apps": "One-click creative workflows",
  "/account": "Billing, keys and storage",
  "/account?tab=plans": "Plans and credits",
  "/account?tab=api-keys": "Keys for the public pipeline",
  "/account?tab=storage": "What is stored on this device",
  "/projects": "Every generation, searchable",
  "/projects?filter=favorites": "Projects you starred",
};

export function railSubtitle(to: string): string {
  return HERO_RAIL_SUBTITLES[to] ?? "Generated in your browser";
}

/** The wide promo card that sits directly under the rail. */
export const PROMO_CARD = {
  eyebrow: "Limited creator offer",
  title: "Sign up and get your extra discount",
  body: "Get unlimited image generation, unlock your extra discount, and access our newest video tools.",
  cta: "Sign up and get your discount",
  to: "/account?tab=plans",
};

/** A preset card carries a title, a one-liner and a target studio. */
export interface PresetCard {
  id: string;
  title: string;
  subtitle: string;
  to: string;
  image?: string;
  seed: number;
}

export function presetFromShowcase(preset: ShowcasePreset): PresetCard {
  return {
    id: preset.id,
    title: preset.title,
    subtitle: preset.category,
    to: `/create/${preset.type}?prompt=${encodeURIComponent(preset.prompt)}`,
    image: preset.previewUrl,
    seed: preset.seed,
  };
}

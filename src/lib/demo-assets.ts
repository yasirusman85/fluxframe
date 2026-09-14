export interface ModelInfo {
  id: string;
  name: string;
  badge: string;
  description: string;
  type: "image" | "video" | "cinema" | "lipsync";
  speed: string;
  qualityRating: string;
  isPopular?: boolean;
  creditCost: number;
}

export interface PresetPrompt {
  id: string;
  title: string;
  prompt: string;
  type: "image" | "video" | "cinema";
  category: string;
  model: string;
  aspectRatio: string;
  previewUrl: string;
}

export interface CameraPreset {
  id: string;
  name: string;
  category: "Cinematic" | "Dynamic" | "Specialty";
  pan: number;
  tilt: number;
  zoom: number;
  dolly: number;
  crane: number;
  orbit: number;
  description: string;
}

export interface CreativeApp {
  id: string;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  iconName: string;
  category: "Fashion" | "Branding" | "Storyboarding" | "Character";
  creditCost: number;
}

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

export const IMAGE_MODELS: ModelInfo[] = [
  {
    id: "flux-realism-v2",
    name: "Flux Realism v2",
    badge: "Popular",
    description: "Photorealistic portraits, lighting, and complex surfaces",
    type: "image",
    speed: "~ 3.5s",
    qualityRating: "Balanced Preset",
    isPopular: true,
    creditCost: 5,
  },
  {
    id: "studio-cinema-xl",
    name: "Studio Cinema XL",
    badge: "Cinematic",
    description: "Cinematic lens flare, shallow depth of field, film grain aesthetics",
    type: "image",
    speed: "~ 4.2s",
    qualityRating: "Cinematic Preset",
    creditCost: 8,
  },
  {
    id: "cyber-concept-pro",
    name: "Cyber Concept Pro",
    badge: "Stylized",
    description: "Futuristic sci-fi, dark anime synthwave, vibrant neon contrast",
    type: "image",
    speed: "~ 2.8s",
    qualityRating: "Stylized Preset",
    creditCost: 5,
  },
  {
    id: "hyperdetail-ultra",
    name: "HyperDetail Ultra",
    badge: "Detailed",
    description: "Detailed textures, architectural renders, organic patterns",
    type: "image",
    speed: "~ 5.0s",
    qualityRating: "High Detail",
    creditCost: 10,
  },
  {
    id: "sora-still-v1",
    name: "Sora Ultra Frame",
    badge: "8K Native",
    description: "OpenAI Sora core image generator with extreme prompt adherence",
    type: "image",
    speed: "~ 6.0s",
    qualityRating: "Master Render",
    creditCost: 12,
  },
  {
    id: "midjourney-v6-pro",
    name: "Midjourney v6 Core",
    badge: "Artistic",
    description: "Rich painterly lighting and hyper-expressive character anatomy",
    type: "image",
    speed: "~ 4.0s",
    qualityRating: "Artistic Preset",
    creditCost: 8,
  },
];

export const VIDEO_MODELS: ModelInfo[] = [
  {
    id: "motion-v1-realism",
    name: "Motion-v1 Realism",
    badge: "Popular",
    description: "Simulated motion vector keyframing, fluid panning motion",
    type: "video",
    speed: "~ 6.5s",
    qualityRating: "30fps Motion Preview",
    isPopular: true,
    creditCost: 15,
  },
  {
    id: "cinematic-camera-pro",
    name: "Cinematic Camera Pro",
    badge: "Camera Control",
    description: "Orbiting camera simulation, speed ramp animation vectors",
    type: "video",
    speed: "~ 8.0s",
    qualityRating: "Camera Motion Preview",
    creditCost: 20,
  },
  {
    id: "anime-flux-motion",
    name: "Anime Flux Motion",
    badge: "Stylized",
    description: "2D sakuga motion preview, particle dynamic simulation",
    type: "video",
    speed: "~ 5.2s",
    qualityRating: "Anime Motion Preview",
    creditCost: 15,
  },
];

export const CINEMA_MODELS: ModelInfo[] = [
  {
    id: "kling-3-cinema",
    name: "Kling 3.0 Cinema",
    badge: "Flagship",
    description: "State-of-the-art multi-axis video diffusion with physics simulation",
    type: "cinema",
    speed: "~ 12s",
    qualityRating: "60fps Ultra Cinema",
    isPopular: true,
    creditCost: 30,
  },
  {
    id: "google-veo-3",
    name: "Google Veo 3.1 Pro",
    badge: "Google AI",
    description: "High-fidelity spatio-temporal video model with natural camera control",
    type: "cinema",
    speed: "~ 14s",
    qualityRating: "Studio Broadcast",
    creditCost: 35,
  },
  {
    id: "wan-2-6-camera",
    name: "WAN 2.6 Camera Control",
    badge: "3D Optics",
    description: "Native focal length & lens aperture rendering with zero warping",
    type: "cinema",
    speed: "~ 10s",
    qualityRating: "Optics Emulated",
    creditCost: 25,
  },
  {
    id: "hailuo-2-3-motion",
    name: "Hailuo 2.3 Speed Ramping",
    badge: "Action",
    description: "Dynamic speed ramping, bullet time, and high-velocity camera sweeps",
    type: "cinema",
    speed: "~ 9s",
    qualityRating: "Action Cam 60fps",
    creditCost: 25,
  },
];

export const LIPSYNC_MODELS: ModelInfo[] = [
  {
    id: "higgsfield-speak-2",
    name: "Higgsfield Speak 2.0",
    badge: "Ultra Sync",
    description: "Phoneme-perfect lip synchronization with natural facial micro-expressions",
    type: "lipsync",
    speed: "~ 8s",
    qualityRating: "Broadcasting Sync",
    isPopular: true,
    creditCost: 20,
  },
  {
    id: "veo-talk-pro",
    name: "Veo Talk Pro 3.1",
    badge: "Google Core",
    description: "Multilingual dialogue lip-sync supporting expression emotion shifts",
    type: "lipsync",
    speed: "~ 11s",
    qualityRating: "4K Studio Avatar",
    creditCost: 25,
  },
];

export const CAMERA_PRESETS: CameraPreset[] = [
  { id: "static", name: "Static Lock", category: "Cinematic", pan: 0, tilt: 0, zoom: 0, dolly: 0, crane: 0, orbit: 0, description: "Fixed tripodal position with subtle ambient movement" },
  { id: "pan-right", name: "Smooth Pan Right", category: "Cinematic", pan: 45, tilt: 0, zoom: 0, dolly: 0, crane: 0, orbit: 0, description: "Horizontal camera sweep across the environment" },
  { id: "pan-left", name: "Smooth Pan Left", category: "Cinematic", pan: -45, tilt: 0, zoom: 0, dolly: 0, crane: 0, orbit: 0, description: "Horizontal camera sweep moving left" },
  { id: "dolly-in", name: "Dolly Push In", category: "Dynamic", pan: 0, tilt: 0, zoom: 60, dolly: 75, crane: 0, orbit: 0, description: "Physical camera approach accentuating depth" },
  { id: "dolly-out", name: "Dolly Pull Back", category: "Dynamic", pan: 0, tilt: 0, zoom: -40, dolly: -60, crane: 0, orbit: 0, description: "Revealing wide environment shot" },
  { id: "orbit-360", name: "360 Hero Orbit", category: "Dynamic", pan: 0, tilt: 0, zoom: 20, dolly: 0, crane: 0, orbit: 100, description: "Full circular revolution around subject" },
  { id: "crane-up", name: "Pedestal Crane Up", category: "Cinematic", pan: 0, tilt: -20, zoom: 10, dolly: 0, crane: 80, orbit: 0, description: "Vertical camera elevation looking down" },
  { id: "fpv-drone", name: "FPV Drone Dive", category: "Specialty", pan: 30, tilt: 50, zoom: 90, dolly: 90, crane: -60, orbit: 40, description: "High-speed acrobatic aerial perspective" },
  { id: "bullet-time", name: "Matrix Bullet Time", category: "Specialty", pan: 0, tilt: 0, zoom: 10, dolly: 0, crane: 0, orbit: 180, description: "Time-frozen spatial orbital sweep" },
  { id: "tracking-shot", name: "Character Tracking", category: "Cinematic", pan: 15, tilt: 0, zoom: 30, dolly: 50, crane: 0, orbit: 20, description: "Following subject movement dynamically" },
];

export const CREATIVE_APPS: CreativeApp[] = [
  {
    id: "style-snap",
    name: "Style Snap V2",
    badge: "Virtual Try-On",
    tagline: "Instant fashion model outfit transfer",
    description: "Upload any portrait and swap outfits into 14+ curated aesthetic styles (Techwear, Y2K, Streetwear, Haute Couture) preserving character facial identity.",
    iconName: "Shirt",
    category: "Fashion",
    creditCost: 10,
  },
  {
    id: "outfit-vending",
    name: "Outfit Vending Machine",
    badge: "Viral App",
    tagline: "Deconstruct wardrobe into vending display",
    description: "Generate aesthetic Japanese arcade vending machine displays filled with color-matched streetwear items and accessories.",
    iconName: "Store",
    category: "Fashion",
    creditCost: 12,
  },
  {
    id: "logomotion-ai",
    name: "LogoMotion AI",
    badge: "Branding",
    tagline: "1-Click kinetic logo animation",
    description: "Transform vector or PNG logos into fluid liquid metal, glowing cyber neon, or volumetric particle motion videos.",
    iconName: "Zap",
    category: "Branding",
    creditCost: 15,
  },
  {
    id: "shots-storyboard",
    name: "Shots Storyboarder",
    badge: "Filmmaking",
    tagline: "Full script to cinematic shotlist",
    description: "Input script loglines to auto-generate 6-panel film storyboards with camera angle notes, focal lengths, and character placement.",
    iconName: "Clapperboard",
    category: "Storyboarding",
    creditCost: 20,
  },
  {
    id: "soul-id-actor",
    name: "Soul ID Character Vault",
    badge: "AI Actor",
    tagline: "Train reusable digital double",
    description: "Upload photos of yourself or character concept to lock in facial structure across all future image & video generations.",
    iconName: "UserCheck",
    category: "Character",
    creditCost: 50,
  },
];

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: "free",
    name: "Free Trial",
    price: "$0",
    billingPeriod: "forever",
    creditsMonthly: 50,
    features: [
      "Access to basic FLUX image models",
      "Simulated 5s motion previews",
      "Standard quality outputs",
      "Community library access",
    ],
  },
  {
    id: "starter",
    name: "Creator Starter",
    price: "$19",
    billingPeriod: "per month",
    creditsMonthly: 400,
    badge: "Popular",
    isPopular: true,
    features: [
      "400 Credits / month (~80 images or 20 videos)",
      "Access to Kling 3.0 & Studio Cinema XL",
      "Multi-axis camera motion controls",
      "Commercial licensing included",
      "Priority generation queue",
    ],
  },
  {
    id: "pro",
    name: "Cinema Pro",
    price: "$59",
    billingPeriod: "per month",
    creditsMonthly: 1500,
    badge: "Best Value",
    features: [
      "1,500 Credits / month (~300 images or 75 videos)",
      "All Flagship Models (Sora, Google Veo 3.1, WAN 2.6)",
      "4K Video & Image Upscaling",
      "Soul ID digital double creation",
      "Infinite Node Canvas workspace",
      "Batch ad builder & LipSync Studio",
    ],
  },
  {
    id: "ultra",
    name: "Studio Enterprise",
    price: "$149",
    billingPeriod: "per month",
    creditsMonthly: 5000,
    features: [
      "5,000 Credits / month",
      "Parallel multi-model generation",
      "Dedicated GPU instant queue",
      "Custom LoRA character model tuning",
      "API developer keys & Adobe Premiere plugin",
      "Dedicated account manager",
    ],
  },
];

// High quality SVG Data URIs for offline reliable demo visuals
export function generateVisualDataUrl(
  title: string,
  type: "image" | "video" | "cinema" | "lipsync" | "marketing",
  aspectRatio: string = "16:9",
  variant: number = 0
): string {
  const colors = [
    ["#1e1b4b", "#4c1d95", "#8b5cf6", "#c084fc"],
    ["#064e3b", "#047857", "#10b981", "#6ee7b7"],
    ["#450a0a", "#991b1b", "#ef4444", "#fca5a5"],
    ["#0f172a", "#1e293b", "#0284c7", "#38bdf8"],
    ["#2e1065", "#701a75", "#ec4899", "#f472b6"],
    ["#312e81", "#4338ca", "#6366f1", "#a5b4fc"],
  ];

  const palette = colors[variant % colors.length];

  let width = 800;
  let height = 450;
  if (aspectRatio === "1:1") {
    height = 800;
  } else if (aspectRatio === "9:16") {
    width = 450;
    height = 800;
  } else if (aspectRatio === "4:3") {
    height = 600;
  } else if (aspectRatio === "21:9") {
    height = 342;
  }

  const isMotion = type === "video" || type === "cinema" || type === "lipsync";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${palette[0]}" />
        <stop offset="50%" stop-color="${palette[1]}" />
        <stop offset="100%" stop-color="${palette[2]}" />
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${palette[3]}" stop-opacity="0.8" />
        <stop offset="100%" stop-color="${palette[1]}" stop-opacity="0" />
      </radialGradient>
      <filter id="blurFilter">
        <feGaussianBlur stdDeviation="25" />
      </filter>
    </defs>
    
    <rect width="100%" height="100%" fill="url(#bgGrad)" />
    
    <!-- Abstract shapes -->
    <circle cx="${width * 0.3}" cy="${height * 0.4}" r="${Math.min(width, height) * 0.35}" fill="url(#glow)" filter="url(#blurFilter)" />
    <circle cx="${width * 0.7}" cy="${height * 0.6}" r="${Math.min(width, height) * 0.25}" fill="${palette[3]}" opacity="0.3" filter="url(#blurFilter)" />
    
    <g opacity="0.15" stroke="#ffffff" stroke-width="1.5" fill="none">
      <circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) * 0.2}" />
      <circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) * 0.35}" stroke-dasharray="8 8" />
      <path d="M 0 ${height / 2} L ${width} ${height / 2}" />
      <path d="M ${width / 2} 0 L ${width / 2} ${height}" />
    </g>

    ${
      isMotion
        ? `<g transform="translate(${width / 2}, ${height / 2})">
             <circle r="42" fill="rgba(0,0,0,0.5)" stroke="${palette[3]}" stroke-width="2"/>
             <polygon points="-10,-18 20,0 -10,18" fill="${palette[3]}"/>
           </g>`
        : `<g transform="translate(${width - 60}, 40)">
             <rect width="40" height="24" rx="6" fill="rgba(0,0,0,0.4)" stroke="${palette[3]}" stroke-width="1"/>
             <text x="20" y="16" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">HQ</text>
           </g>`
    }

    <text x="30" y="${height - 40}" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="700" fill="#ffffff" opacity="0.95">${title.replace(/['"<>&]/g, "")}</text>
    <text x="30" y="${height - 20}" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="500" fill="${palette[3]}" opacity="0.9">${type.toUpperCase()} • HIGGSFIELD CLONE ENGINE</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const PRESET_PROMPTS: PresetPrompt[] = [
  {
    id: "p-1",
    title: "Cybernetic Obsidian Valkyrie",
    prompt:
      "A cinematic hyper-realistic portrait of a cybernetic warrior with obsidian armor and bioluminescent blue neon trim, 85mm lens, volumetric smoke, dramatic rim lighting",
    type: "image",
    category: "Sci-Fi",
    model: "flux-realism-v2",
    aspectRatio: "16:9",
    previewUrl: generateVisualDataUrl("Cybernetic Obsidian Valkyrie", "image", "16:9", 0),
  },
  {
    id: "p-2",
    title: "Bioluminescent Rainforest Motion",
    prompt:
      "Fluid drone shot tracking through an enchanted bioluminescent rainforest with glowing flora, floating spore particles, atmospheric mist, ultra smooth 60fps movement",
    type: "video",
    category: "Nature & Motion",
    model: "motion-v1-realism",
    aspectRatio: "16:9",
    previewUrl: generateVisualDataUrl("Bioluminescent Motion", "video", "16:9", 1),
  },
  {
    id: "p-3",
    title: "Neukölln Tokyo Drift Sunset",
    prompt:
      "Synthwave 1980s sportscar drifting around a wet neon street curve at sunset, reflections in rain puddles, motion blur wheels, retro wave aesthetics",
    type: "cinema",
    category: "Automotive",
    model: "kling-3-cinema",
    aspectRatio: "16:9",
    previewUrl: generateVisualDataUrl("Tokyo Drift Sunset", "cinema", "16:9", 2),
  },
  {
    id: "p-4",
    title: "Glass Prism Architectural Spire",
    prompt:
      "Futuristic brutalist skyscraper crafted from iridescent rainbow glass prisms, dramatic low-angle shot, clear sapphire sky, octane 3d render",
    type: "image",
    category: "Architecture",
    model: "hyperdetail-ultra",
    aspectRatio: "9:16",
    previewUrl: generateVisualDataUrl("Glass Prism Architecture", "image", "9:16", 3),
  },
  {
    id: "p-5",
    title: "Ethereal Celestial Dragon Sakura",
    prompt:
      "Floating ethereal spirit dragon made of liquid starlight weaving through falling pink cherry blossom petals, 3d sakuga anime style, golden ratio composition",
    type: "image",
    category: "Fantasy",
    model: "cyber-concept-pro",
    aspectRatio: "1:1",
    previewUrl: generateVisualDataUrl("Celestial Dragon", "image", "1:1", 4),
  },
  {
    id: "p-6",
    title: "Hyper-Speed Galaxy Hyperjump",
    prompt:
      "First-person perspective looking out of a starship cockpit during light-speed warp jump, streaking starbursts, lens flare, intense kinetic energy",
    type: "cinema",
    category: "Sci-Fi",
    model: "google-veo-3",
    aspectRatio: "21:9",
    previewUrl: generateVisualDataUrl("Galaxy Hyperjump", "cinema", "21:9", 5),
  },
  {
    id: "p-7",
    title: "Minimalist Luxury Perfume Spot",
    prompt:
      "Commercial luxury glass perfume bottle emerging from dark rippling silk water with gold dust particles and volumetric caustic lighting",
    type: "cinema",
    category: "Commercial",
    model: "wan-2-6-camera",
    aspectRatio: "9:16",
    previewUrl: generateVisualDataUrl("Luxury Perfume Commercial", "cinema", "9:16", 0),
  },
  {
    id: "p-8",
    title: "Neo-Tokyo Cyberpunk Detective",
    prompt:
      "Moody noir detective wearing illuminated neon trench coat standing in rain-drenched alleyway with holograms reflecting off wet pavement",
    type: "image",
    category: "Cinematic",
    model: "studio-cinema-xl",
    aspectRatio: "16:9",
    previewUrl: generateVisualDataUrl("Cyberpunk Detective", "image", "16:9", 1),
  },
  {
    id: "p-9",
    title: "Volcanic Island Orbit Flyby",
    prompt:
      "360 degree orbital camera flight around an erupting tropical island volcano with glowing orange lava rivers flowing into dark turquoise ocean waves",
    type: "cinema",
    category: "Nature & Motion",
    model: "hailuo-2-3-motion",
    aspectRatio: "16:9",
    previewUrl: generateVisualDataUrl("Volcano Orbit Flyby", "cinema", "16:9", 2),
  },
];

export const INITIAL_PROJECTS = [
  {
    id: "proj-demo-1",
    type: "image" as const,
    title: "Cybernetic Obsidian Valkyrie",
    prompt:
      "A cinematic hyper-realistic portrait of a cybernetic warrior with obsidian armor and bioluminescent blue neon trim, 85mm lens, volumetric smoke, dramatic rim lighting",
    negativePrompt: "low quality, blurry, deformed, distortion, bad anatomy",
    model: "flux-realism-v2",
    aspectRatio: "16:9",
    quality: "high" as const,
    status: "completed" as const,
    progress: 100,
    outputUrl: generateVisualDataUrl("Cybernetic Obsidian Valkyrie", "image", "16:9", 0),
    thumbnailUrl: generateVisualDataUrl("Cybernetic Obsidian Valkyrie", "image", "16:9", 0),
    favorite: true,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    seed: 8492041,
  },
  {
    id: "proj-demo-2",
    type: "video" as const,
    title: "Bioluminescent Rainforest Motion",
    prompt:
      "Fluid drone shot tracking through an enchanted bioluminescent rainforest with glowing flora, floating spore particles, atmospheric mist, ultra smooth 60fps movement",
    negativePrompt: "shaky camera, jitter, pixelated, blur",
    model: "motion-v1-realism",
    aspectRatio: "16:9",
    duration: 5,
    quality: "high" as const,
    status: "completed" as const,
    progress: 100,
    outputUrl: generateVisualDataUrl("Bioluminescent Motion", "video", "16:9", 1),
    thumbnailUrl: generateVisualDataUrl("Bioluminescent Motion", "video", "16:9", 1),
    favorite: false,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    motionStrength: 8,
  },
  {
    id: "proj-demo-3",
    type: "image" as const,
    title: "Glass Prism Architectural Spire",
    prompt:
      "Futuristic brutalist skyscraper crafted from iridescent rainbow glass prisms, dramatic low-angle shot, clear sapphire sky, octane 3d render",
    model: "hyperdetail-ultra",
    aspectRatio: "9:16",
    quality: "standard" as const,
    status: "completed" as const,
    progress: 100,
    outputUrl: generateVisualDataUrl("Glass Prism Architecture", "image", "9:16", 3),
    thumbnailUrl: generateVisualDataUrl("Glass Prism Architecture", "image", "9:16", 3),
    favorite: true,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    seed: 1209384,
  },
];

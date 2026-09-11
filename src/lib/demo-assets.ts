export interface ModelInfo {
  id: string;
  name: string;
  badge: string;
  description: string;
  type: "image" | "video";
  speed: string;
  qualityRating: string;
  isPopular?: boolean;
}

export interface PresetPrompt {
  id: string;
  title: string;
  prompt: string;
  type: "image" | "video";
  category: string;
  model: string;
  aspectRatio: string;
  previewUrl: string;
}

export const IMAGE_MODELS: ModelInfo[] = [
  {
    id: "flux-realism-v2",
    name: "Flux Realism v2",
    badge: "Popular",
    description: "Ultra-photorealistic portraits, lighting, and complex surfaces",
    type: "image",
    speed: "~ 3.5s",
    qualityRating: "8K UHD",
    isPopular: true,
  },
  {
    id: "studio-cinema-xl",
    name: "Studio Cinema XL",
    badge: "Cinematic",
    description: "Hollywood lens flare, shallow depth of field, 35mm film grain",
    type: "image",
    speed: "~ 4.2s",
    qualityRating: "Pro Optics",
  },
  {
    id: "cyber-concept-pro",
    name: "Cyber Concept Pro",
    badge: "Stylized",
    description: "Futuristic sci-fi, dark anime synthwave, vibrant neon contrast",
    type: "image",
    speed: "~ 2.8s",
    qualityRating: "Vector & 3D",
  },
  {
    id: "hyperdetail-ultra",
    name: "HyperDetail Ultra",
    badge: "High Res",
    description: "Microscope macro detail, architectural renders, organic textures",
    type: "image",
    speed: "~ 5.0s",
    qualityRating: "16K Render",
  },
];

export const VIDEO_MODELS: ModelInfo[] = [
  {
    id: "motion-v1-realism",
    name: "Motion-v1 Realism",
    badge: "Flagship",
    description: "Fluid physics, realistic human movement, camera panning",
    type: "video",
    speed: "~ 6.5s",
    qualityRating: "60 FPS FX",
    isPopular: true,
  },
  {
    id: "cinematic-camera-pro",
    name: "Cinematic Camera Pro",
    badge: "Dolly Zoom",
    description: "Orbiting cameras, dramatic speed ramps, filmic slow motion",
    type: "video",
    speed: "~ 8.0s",
    qualityRating: "4K Motion",
  },
  {
    id: "anime-flux-motion",
    name: "Anime Flux Motion",
    badge: "2D & 3D Anime",
    description: "Sakuga animation style, vibrant energy aura, particle dynamics",
    type: "video",
    speed: "~ 5.2s",
    qualityRating: "Hand-Drawn FX",
  },
];

// High quality SVG Data URIs for offline reliable demo visuals
export function generateVisualDataUrl(
  title: string,
  type: "image" | "video",
  aspectRatio: string = "16:9",
  variant: number = 0
): string {
  const colors = [
    ["#1e1b4b", "#4c1d95", "#8b5cf6", "#c084fc"],
    ["#064e3b", "#047857", "#10b981", "#6ee7b7"],
    ["#450a0a", "#991b1b", "#ef4444", "#fca5a5"],
    ["#0f172a", "#1e293b", "#0284c7", "#38bdf8"],
    ["#2e1065", "#701a75", "#ec4899", "#f472b6"],
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

  const isVideo = type === "video";

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
      isVideo
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
    <text x="30" y="${height - 20}" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="500" fill="${palette[3]}" opacity="0.9">${type.toUpperCase()} • FLUXFRAME STUDIO ENGINE</text>
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
    type: "video",
    category: "Automotive",
    model: "cinematic-camera-pro",
    aspectRatio: "16:9",
    previewUrl: generateVisualDataUrl("Tokyo Drift Sunset", "video", "16:9", 2),
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
    type: "video",
    category: "Sci-Fi",
    model: "anime-flux-motion",
    aspectRatio: "21:9",
    previewUrl: generateVisualDataUrl("Galaxy Hyperjump", "video", "21:9", 0),
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

/**
 * Single source of truth for navigation. The sidebar, header breadcrumb,
 * command palette, 404 page and document titles all read from ROUTES, so a
 * route is added or renamed in exactly one place.
 */
import type { LucideIcon } from "lucide-react";
import {
  AudioLines,
  Clapperboard,
  Compass,
  FolderOpen,
  Heart,
  Image as ImageIcon,
  LayoutGrid,
  Library,
  Megaphone,
  User,
  Video,
  Workflow,
} from "lucide-react";
import type { GenerationType } from "../types/project";

export type RouteGroup = "discover" | "studios" | "workspaces" | "library";

export interface RouteMeta {
  id: string;
  /** Link target. May carry a query string (Favorites). */
  path: string;
  title: string;
  icon: LucideIcon;
  group: RouteGroup;
  badge?: string;
  description: string;
  /** Generation type for studio routes. */
  type?: GenerationType;
  /** Extra search terms for the command palette. */
  keywords?: string[];
}

export const ROUTE_GROUPS: ReadonlyArray<{ id: RouteGroup; label: string }> = [
  { id: "discover", label: "Discover" },
  { id: "studios", label: "Studios" },
  { id: "workspaces", label: "Workspaces" },
  { id: "library", label: "Library" },
];

export const ROUTES: RouteMeta[] = [
  {
    id: "explore",
    path: "/",
    title: "Explore",
    icon: Compass,
    group: "discover",
    description: "Showcase, trending prompts and a quick-start composer",
    keywords: ["home", "discover", "showcase", "gallery", "trending", "start"],
  },
  {
    id: "cinema",
    path: "/create/cinema",
    title: "Cinema Studio",
    icon: Clapperboard,
    group: "studios",
    badge: "4.0",
    type: "cinema",
    description: "Multi-axis camera choreography from a single keyframe",
    keywords: ["camera", "motion", "clip", "film", "dolly", "orbit", "keyframe", "lens"],
  },
  {
    id: "image",
    path: "/create/image",
    title: "Image Studio",
    icon: ImageIcon,
    group: "studios",
    type: "image",
    description: "Text-to-image with six specialised engines",
    keywords: ["picture", "photo", "text to image", "generate", "render", "art"],
  },
  {
    id: "video",
    path: "/create/video",
    title: "Video Studio",
    icon: Video,
    group: "studios",
    type: "video",
    description: "Turn a keyframe into a clip with camera motion",
    keywords: ["clip", "motion", "animate", "keyframe", "webm", "parallax"],
  },
  {
    id: "marketing",
    path: "/create/marketing",
    title: "Marketing Studio",
    icon: Megaphone,
    group: "studios",
    badge: "Ads",
    type: "marketing",
    description: "Packshot to multi-scene product ad in seconds",
    keywords: ["ad", "ads", "commercial", "product", "brand", "ugc", "packshot", "promo"],
  },
  {
    id: "lipsync",
    path: "/create/lipsync",
    title: "LipSync Studio",
    icon: AudioLines,
    group: "studios",
    type: "lipsync",
    description: "Talking-portrait clips from a script or an audio file",
    keywords: ["lip sync", "talking", "avatar", "voice", "speech", "portrait", "audio", "dialogue"],
  },
  {
    id: "canvas",
    path: "/canvas",
    title: "Node Canvas",
    icon: Workflow,
    group: "workspaces",
    badge: "Beta",
    description: "Chain prompts, keyframes and motion as connected nodes",
    keywords: ["workflow", "nodes", "graph", "pipeline", "chain", "board"],
  },
  {
    id: "apps",
    path: "/apps",
    title: "Creative Apps",
    icon: LayoutGrid,
    group: "workspaces",
    description: "One-click workflows: fashion looks, logos, storyboards",
    keywords: ["style snap", "logomotion", "storyboard", "character sheet", "vending", "templates", "tools"],
  },
  {
    id: "projects",
    path: "/projects",
    title: "Library",
    icon: Library,
    group: "library",
    description: "Every generation, searchable and filterable",
    keywords: ["projects", "history", "gallery", "outputs", "downloads", "files"],
  },
  {
    id: "favorites",
    path: "/projects?filter=favorites",
    title: "Favorites",
    icon: Heart,
    group: "library",
    description: "Projects you have starred",
    keywords: ["starred", "saved", "liked", "favourites", "hearts"],
  },
  {
    id: "account",
    path: "/account",
    title: "Account",
    icon: User,
    group: "library",
    description: "Profile, plans, credit history, API keys and storage",
    keywords: ["settings", "profile", "billing", "plans", "api keys", "preferences", "storage", "credits"],
  },
];

/** Synthetic entry for `/projects/:projectId` (not listed in navigation). */
export const PROJECT_ROUTE: RouteMeta = {
  id: "project",
  path: "/projects/:projectId",
  title: "Project",
  icon: FolderOpen,
  group: "library",
  description: "Project details, output and actions",
};

export const PROJECT_DETAIL_PATTERN = /^\/projects\/[^/]+$/;

export function routeById(id: string): RouteMeta | undefined {
  return ROUTES.find((route) => route.id === id);
}

export function routesInGroup(group: RouteGroup): RouteMeta[] {
  return ROUTES.filter((route) => route.group === group);
}

/** Pathname part of a route's `path` (drops the query string). */
export function routePathname(route: RouteMeta): string {
  return route.path.split("?")[0];
}

function normalizePathname(input: string): string {
  let path = input.trim().split("?")[0].split("#")[0];
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return path || "/";
}

/**
 * Resolves the navigation entry for a location using longest-prefix matching.
 * "/" only matches exactly, so unknown paths return `undefined` (404).
 * `/projects/:id` resolves to the synthetic "Project" entry. Pass the query
 * string (`location.search`) so `/projects?filter=favorites` resolves to
 * Favorites instead of Library.
 */
export function routeForPath(pathname: string, search = ""): RouteMeta | undefined {
  const path = normalizePathname(pathname);
  const query = search || (pathname.includes("?") ? pathname.slice(pathname.indexOf("?")) : "");
  if (PROJECT_DETAIL_PATTERN.test(path)) return PROJECT_ROUTE;

  let best: RouteMeta | undefined;
  let bestLength = -1;
  for (const route of ROUTES) {
    const candidate = routePathname(route);
    const matches = candidate === "/" ? path === "/" : path === candidate || path.startsWith(`${candidate}/`);
    // Longest prefix wins; on ties the first (query-free) entry is kept.
    if (matches && candidate.length > bestLength) {
      best = route;
      bestLength = candidate.length;
    }
  }
  if (best?.id === "projects" && /(^\?|[?&])filter=favorites(&|$)/.test(query)) return routeById("favorites");
  return best;
}

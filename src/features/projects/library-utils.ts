/**
 * Pure helpers for the project library: filter / sort / search logic, view
 * persistence and small presentation maps. Kept free of React so the
 * behaviour is unit-testable (see tests/projects/library-utils.test.ts).
 */
import type { BadgeVariant } from "../../components/ui";
import type { GenerationProject, GenerationStatus, GenerationType, ProviderSource } from "../../types/project";
import { findModel } from "../../lib/catalog";

export const LIBRARY_FILTERS = ["all", "image", "video", "cinema", "lipsync", "marketing", "favorites"] as const;
export type LibraryFilter = (typeof LIBRARY_FILTERS)[number];

export const FILTER_LABELS: Record<LibraryFilter, string> = {
  all: "All",
  image: "Images",
  video: "Video",
  cinema: "Cinema",
  lipsync: "LipSync",
  marketing: "Ads",
  favorites: "Favorites",
};

export const LIBRARY_SORTS = ["newest", "oldest", "title", "favorites", "type"] as const;
export type LibrarySort = (typeof LIBRARY_SORTS)[number];

export const SORT_OPTIONS: Array<{ value: LibrarySort; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title", label: "Title A–Z" },
  { value: "favorites", label: "Favorites first" },
  { value: "type", label: "By type" },
];

export type LibraryView = "grid" | "list";
export const LIBRARY_VIEW_STORAGE_KEY = "fluxframe-library-view";
export const LIBRARY_PAGE_SIZE = 24;

export function parseFilter(value: string | null | undefined): LibraryFilter {
  return value && (LIBRARY_FILTERS as readonly string[]).includes(value) ? (value as LibraryFilter) : "all";
}

export function parseSort(value: string | null | undefined): LibrarySort {
  return value && (LIBRARY_SORTS as readonly string[]).includes(value) ? (value as LibrarySort) : "newest";
}

export function readStoredView(): LibraryView {
  try {
    return localStorage.getItem(LIBRARY_VIEW_STORAGE_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

export function storeView(view: LibraryView): void {
  try {
    localStorage.setItem(LIBRARY_VIEW_STORAGE_KEY, view);
  } catch {
    /* private mode or quota: the toggle still works for this session */
  }
}

export function isInProgress(project: Pick<GenerationProject, "status">): boolean {
  return project.status === "queued" || project.status === "processing";
}

export function matchesFilter(project: GenerationProject, filter: LibraryFilter): boolean {
  if (filter === "all") return true;
  if (filter === "favorites") return project.favorite;
  return project.type === filter;
}

export function searchTokens(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/** Case-insensitive match against title, prompt, model id + name and tags. Every token must match. */
export function matchesQuery(project: GenerationProject, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const haystack = [project.title, project.prompt, project.model, findModel(project.model)?.name ?? "", ...(project.tags ?? [])]
    .join("\n")
    .toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

export function filterProjects(projects: GenerationProject[], filter: LibraryFilter, query: string): GenerationProject[] {
  const tokens = searchTokens(query);
  return projects.filter((project) => matchesFilter(project, filter) && matchesQuery(project, tokens));
}

const TYPE_ORDER: Record<GenerationType, number> = { image: 0, video: 1, cinema: 2, lipsync: 3, marketing: 4 };

const createdAt = (project: GenerationProject) => new Date(project.createdAt).getTime() || 0;
const byNewest = (a: GenerationProject, b: GenerationProject) => createdAt(b) - createdAt(a);

/** Returns a sorted copy. Queued/processing projects always come first so active work stays visible. */
export function sortProjects(projects: GenerationProject[], sort: LibrarySort): GenerationProject[] {
  return [...projects].sort((a, b) => {
    const active = Number(isInProgress(b)) - Number(isInProgress(a));
    if (active !== 0) return active;
    switch (sort) {
      case "oldest":
        return createdAt(a) - createdAt(b);
      case "title":
        return a.title.localeCompare(b.title, undefined, { sensitivity: "base" }) || byNewest(a, b);
      case "favorites":
        return Number(b.favorite) - Number(a.favorite) || byNewest(a, b);
      case "type":
        return TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || byNewest(a, b);
      case "newest":
      default:
        return byNewest(a, b);
    }
  });
}

export function countByFilter(projects: GenerationProject[]): Record<LibraryFilter, number> {
  const counts: Record<LibraryFilter, number> = { all: projects.length, image: 0, video: 0, cinema: 0, lipsync: 0, marketing: 0, favorites: 0 };
  for (const project of projects) {
    counts[project.type] += 1;
    if (project.favorite) counts.favorites += 1;
  }
  return counts;
}

/** Best still image for a project: stored thumbnail, then thumbnail URL, then the output when it is an image. */
export function thumbnailSource(project: GenerationProject): { assetId?: string; fallbackUrl?: string } {
  const isImage = project.mediaKind === "image";
  if (project.thumbnailAssetId) {
    return { assetId: project.thumbnailAssetId, fallbackUrl: project.thumbnailUrl ?? (isImage ? project.outputUrl : undefined) };
  }
  if (project.thumbnailUrl) return { fallbackUrl: project.thumbnailUrl };
  if (isImage) return { assetId: project.outputAssetId, fallbackUrl: project.outputUrl };
  return {};
}

export const STATUS_LABELS: Record<GenerationStatus, string> = {
  queued: "Queued",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const STATUS_VARIANTS: Record<GenerationStatus, BadgeVariant> = {
  queued: "neutral",
  processing: "sky",
  completed: "brand",
  failed: "rose",
  cancelled: "amber",
};

export const PROVIDER_LABELS: Record<ProviderSource, string> = {
  pollinations: "Pollinations",
  procedural: "Procedural fallback",
  "motion-engine": "Motion engine",
  "lipsync-engine": "LipSync engine",
  "ad-engine": "Ad engine",
};

export const TYPE_PLURALS: Record<GenerationType, string> = {
  image: "images",
  video: "videos",
  cinema: "cinema clips",
  lipsync: "LipSync clips",
  marketing: "ads",
};

export function modelName(modelId: string): string {
  return findModel(modelId)?.name ?? modelId;
}

/** "16:9 · 5s" for clips, "16:9 · 1024×576" for stills. */
export function describeMedia(project: GenerationProject): string {
  if (project.mediaKind === "video") return `${project.aspectRatio} · ${project.duration ?? "–"}s`;
  return project.width && project.height ? `${project.aspectRatio} · ${project.width}×${project.height}` : project.aspectRatio;
}

export function formatRenderTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export function excerpt(text: string, max = 180): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

import type { MouseEvent as ReactMouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Copy, Download, ImageIcon, Loader2, Play, RotateCcw, Shuffle, Star, Trash2 } from "lucide-react";
import type { GenerationProject } from "../../types/project";
import { TYPE_LABELS } from "../../types/project";
import { useProjectStore } from "../../store/project-store";
import { useAccountStore } from "../../store/account-store";
import { useUIStore } from "../../store/ui-store";
import { useAsset } from "../../hooks/useAsset";
import { downloadProject } from "../../lib/download";
import { remixUrl } from "../../lib/query-params";
import { retryGeneration } from "../../lib/generation-runner";
import { formatDuration, timeAgo } from "../../lib/format";
import { cn } from "../../lib/cn";
import { Badge, Button, IconButton, ProgressBar, Skeleton } from "../ui";
import { ProviderBadge } from "./ProviderBadge";
import { gridAspect, isInFlight, modelLabel } from "./project-meta";

export interface MediaCardProps {
  project: GenerationProject;
  /** Selection mode: shows a checkbox and makes clicks toggle selection instead of navigating. */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  size?: "sm" | "md";
}

const stop = (event: ReactMouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

/** Library / recent-row card for any project type with status overlays, favorite and hover actions. */
export function MediaCard({ project, selectable = false, selected = false, onToggleSelect, size = "md" }: MediaCardProps) {
  const navigate = useNavigate();
  const toggleFavorite = useProjectStore((s) => s.toggleFavorite);
  const duplicateProject = useProjectStore((s) => s.duplicateProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const confirmDeletes = useAccountStore((s) => s.preferences.confirmDeletes);
  const addToast = useUIStore((s) => s.addToast);

  const hasThumbnail = Boolean(project.thumbnailAssetId ?? project.thumbnailUrl);
  const { url, status: assetStatus } = useAsset(project.thumbnailAssetId ?? project.outputAssetId, project.thumbnailUrl ?? project.outputUrl);

  const isVideo = project.mediaKind === "video";
  const completed = project.status === "completed";
  const inFlight = isInFlight(project);
  const detailHref = `/projects/${project.id}`;
  const small = size === "sm";

  const toggleSelection = () => onToggleSelect?.(project.id);

  const onCardClick = () => {
    if (selectable) toggleSelection();
  };

  const onLinkClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (!selectable) return;
    event.preventDefault();
    event.stopPropagation();
    toggleSelection();
  };

  const onFavorite = (event: ReactMouseEvent<HTMLButtonElement>) => {
    stop(event);
    toggleFavorite(project.id);
  };

  const onDownload = (event: ReactMouseEvent<HTMLButtonElement>) => {
    stop(event);
    downloadProject(project).catch((err: unknown) => addToast(err instanceof Error ? err.message : "Download failed.", { type: "error" }));
  };

  const onRemix = (event: ReactMouseEvent<HTMLButtonElement>) => {
    stop(event);
    navigate(remixUrl(project));
  };

  const onDuplicate = (event: ReactMouseEvent<HTMLButtonElement>) => {
    stop(event);
    const copy = duplicateProject(project.id);
    if (copy) addToast(`Duplicated as "${copy.title}"`, { type: "success" });
  };

  const onDelete = (event: ReactMouseEvent<HTMLButtonElement>) => {
    stop(event);
    if (confirmDeletes && !window.confirm(`Delete "${project.title}"? This cannot be undone.`)) return;
    deleteProject(project.id);
    addToast("Project deleted", { type: "info" });
  };

  const onRetry = (event: ReactMouseEvent<HTMLButtonElement>) => {
    stop(event);
    void retryGeneration(project.id);
  };

  const thumbnail = (() => {
    if (assetStatus === "loading") return <Skeleton className="absolute inset-0 rounded-none" />;
    if (!url) {
      return (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-400">
          <ImageIcon className="h-8 w-8" aria-hidden />
        </div>
      );
    }
    if (isVideo && !hasThumbnail) {
      return <video src={url} muted playsInline preload="metadata" aria-hidden className="absolute inset-0 h-full w-full object-cover" />;
    }
    return <img src={url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />;
  })();

  const actionClass = "bg-black/70 text-zinc-100 ring-1 ring-white/10 backdrop-blur hover:bg-black/90 hover:text-white";

  return (
    <article
      data-testid="media-card"
      data-project-id={project.id}
      data-status={project.status}
      data-selected={selected || undefined}
      onClick={onCardClick}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-surface-1 transition-[border-color,transform,box-shadow] duration-200",
        selected ? "border-brand-500/70 shadow-[0_0_0_2px_rgb(16_185_129/0.35)]" : "border-zinc-800/80 hover:border-zinc-700 focus-within:border-zinc-600",
        selectable && "cursor-pointer",
      )}
    >
      <div className="relative bg-surface-2" style={{ aspectRatio: gridAspect(project.aspectRatio) }}>
        <Link to={detailHref} onClick={onLinkClick} aria-label={selectable ? `${selected ? "Deselect" : "Select"} ${project.title}` : `Open ${project.title}`} className="absolute inset-0 block overflow-hidden">
          {thumbnail}
          {isVideo && completed && (
            <>
              <span aria-hidden className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white ring-1 ring-white/20 backdrop-blur transition-transform group-hover:scale-110">
                  <Play className="ml-0.5 h-4 w-4 fill-current" />
                </span>
              </span>
              {project.duration ? (
                <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-100">{formatDuration(project.duration)}</span>
              ) : null}
            </>
          )}
          {inFlight && (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/65 p-4 backdrop-blur-[2px]">
              <Loader2 className="h-5 w-5 animate-spin text-brand-400" aria-hidden />
              <ProgressBar value={project.progress} indeterminate={project.status === "queued"} size="sm" label={`${project.title} progress`} className="max-w-[70%]" />
              <span className="line-clamp-2 text-center text-[11px] text-zinc-300">{project.stageMessage ?? "Processing…"}</span>
            </span>
          )}
          {project.status === "failed" && (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-rose-950/80 p-4 pb-12 text-center backdrop-blur-[2px]">
              <AlertCircle className="h-5 w-5 text-rose-300" aria-hidden />
              <span className="text-[11px] font-semibold text-rose-100">Generation failed</span>
              <span className="line-clamp-2 text-[11px] text-rose-200/80">{project.errorMessage}</span>
            </span>
          )}
          {project.status === "cancelled" && (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/70 p-4 pb-12 text-center backdrop-blur-[2px]">
              <span className="text-[11px] font-semibold text-zinc-200">Cancelled</span>
              <span className="text-[11px] text-zinc-400">Retry to run it again.</span>
            </span>
          )}
        </Link>

        <div className={cn("pointer-events-none absolute left-2 top-2 flex items-center gap-1", selectable && "left-9")}>
          <Badge size="sm" variant="neutral" className="bg-black/70 backdrop-blur">
            {TYPE_LABELS[project.type]}
          </Badge>
          {!small && completed && <ProviderBadge source={project.providerSource} detail={project.providerDetail} size="sm" />}
        </div>

        {selectable && (
          <input
            type="checkbox"
            data-testid="media-card-select"
            checked={selected}
            onChange={toggleSelection}
            onClick={(event) => event.stopPropagation()}
            aria-label={`Select ${project.title}`}
            className="absolute left-2 top-2 z-10 h-5 w-5 cursor-pointer rounded border-zinc-600 accent-brand-500"
          />
        )}

        <button
          type="button"
          data-testid="media-card-favorite"
          aria-pressed={project.favorite}
          aria-label={project.favorite ? "Remove from favorites" : "Add to favorites"}
          onClick={onFavorite}
          className={cn(
            "absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 ring-1 ring-white/10 backdrop-blur transition-colors",
            project.favorite ? "text-amber-300" : "text-zinc-300 hover:text-white",
          )}
        >
          <Star className={cn("h-4 w-4", project.favorite && "fill-current")} aria-hidden />
        </button>

        {(project.status === "failed" || project.status === "cancelled") && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <Button size="sm" variant="secondary" leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden />} onClick={onRetry} data-testid="media-card-retry" className="pointer-events-auto">
              Retry
            </Button>
          </div>
        )}

        {!inFlight && (
          <div
            role="toolbar"
            aria-label={`Actions for ${project.title}`}
            className={cn(
              "absolute bottom-2 left-2 z-10 flex items-center gap-1 transition-opacity duration-150",
              "md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100",
              (project.status === "failed" || project.status === "cancelled") && "hidden",
            )}
          >
            {completed && <IconButton size="sm" label="Download" icon={<Download className="h-4 w-4" aria-hidden />} onClick={onDownload} data-testid="media-card-download" className={actionClass} />}
            {completed && <IconButton size="sm" label="Remix in studio" icon={<Shuffle className="h-4 w-4" aria-hidden />} onClick={onRemix} className={actionClass} />}
            <IconButton size="sm" label="Duplicate" icon={<Copy className="h-4 w-4" aria-hidden />} onClick={onDuplicate} className={actionClass} />
            <IconButton size="sm" label="Delete" icon={<Trash2 className="h-4 w-4" aria-hidden />} onClick={onDelete} data-testid="media-card-delete" className={cn(actionClass, "hover:bg-rose-600 hover:text-white")} />
          </div>
        )}
      </div>

      <div className={cn("flex min-w-0 flex-1 flex-col gap-1", small ? "p-2.5" : "p-3")}>
        <h3 className={cn("truncate font-semibold text-zinc-100", small ? "text-xs" : "text-sm")} title={project.title}>
          {project.title}
        </h3>
        {!small && <p className="line-clamp-2 text-xs leading-snug text-zinc-400">{project.prompt}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-[11px] text-zinc-400">
          <span className="truncate">{modelLabel(project.model)}</span>
          <time dateTime={project.createdAt} className="shrink-0">
            {timeAgo(project.createdAt)}
          </time>
        </div>
      </div>
    </article>
  );
}

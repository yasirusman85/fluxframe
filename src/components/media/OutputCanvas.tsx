import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Download, ExternalLink, ImageOff, Shuffle, Star } from "lucide-react";
import type { GenerationProject } from "../../types/project";
import { useProjectStore } from "../../store/project-store";
import { useAccountStore } from "../../store/account-store";
import { useUIStore } from "../../store/ui-store";
import { useAsset } from "../../hooks/useAsset";
import { downloadProject } from "../../lib/download";
import { remixUrl } from "../../lib/query-params";
import { cssAspect } from "../../lib/aspect";
import { cn } from "../../lib/cn";
import { Button, Card, EmptyState, IconButton, Skeleton } from "../ui";
import { QueuePanel } from "../generation/QueuePanel";
import { ProviderBadge } from "./ProviderBadge";
import { VideoPlayer } from "./VideoPlayer";
import { projectMeta } from "./project-meta";

export interface OutputCanvasProps {
  /** Latest completed project of the studio. */
  project?: GenerationProject;
  /** Job currently running for the studio (shown as a QueuePanel). */
  activeJob?: GenerationProject;
  emptyTitle: string;
  emptyDescription: string;
  emptyIcon?: ReactNode;
  /** CSS aspect-ratio for the empty / processing stage (default "16 / 9"). */
  aspect?: string;
  onRemix?: (project: GenerationProject) => void;
}

const linkButtonClass =
  "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-zinc-700 px-3 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800/60";

function CompletedMedia({ project, onDownload }: { project: GenerationProject; onDownload: () => void }) {
  const openLightbox = useUIStore((s) => s.openLightbox);
  const autoplayPreviews = useAccountStore((s) => s.preferences.autoplayPreviews);
  const output = useAsset(project.outputAssetId, project.outputUrl);
  const poster = useAsset(project.thumbnailAssetId, project.thumbnailUrl);
  const aspect = cssAspect(project.aspectRatio);

  if (output.status === "loading") {
    return <Skeleton className="w-full max-h-[560px] rounded-xl" style={{ aspectRatio: aspect }} />;
  }
  if (!output.url) {
    return (
      <div className="flex w-full max-h-[560px] flex-col items-center justify-center gap-2 rounded-xl bg-surface-2 text-xs text-zinc-400" style={{ aspectRatio: aspect }}>
        <ImageOff className="h-5 w-5" aria-hidden />
        The output file is no longer stored on this device.
      </div>
    );
  }
  if (project.mediaKind === "video") {
    return (
      <div className="mx-auto max-h-[560px] w-full" style={{ aspectRatio: aspect, maxWidth: `calc(560px * (${aspect}))` }}>
        <VideoPlayer src={output.url} poster={poster.url} title={project.title} autoPlay={autoplayPreviews} loop onDownload={onDownload} className="h-full w-full" />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => openLightbox({ url: output.url as string, title: project.title, kind: "image" })}
      aria-label={`View ${project.title} full size`}
      className="block w-full cursor-zoom-in rounded-xl bg-black/40"
    >
      <img data-testid="output-image" src={output.url} alt={project.title} className="mx-auto max-h-[560px] w-full rounded-xl object-contain" />
    </button>
  );
}

/** The large output stage of a studio: latest completed output, live job progress, or an empty state. */
export function OutputCanvas({ project, activeJob, emptyTitle, emptyDescription, emptyIcon, aspect = "16 / 9", onRemix }: OutputCanvasProps) {
  const navigate = useNavigate();
  const toggleFavorite = useProjectStore((s) => s.toggleFavorite);
  const addToast = useUIStore((s) => s.addToast);

  const ready = project?.status === "completed" ? project : undefined;
  const state = activeJob ? "processing" : ready ? "ready" : "empty";

  const download = () => {
    if (!ready) return;
    downloadProject(ready).catch((err: unknown) => addToast(err instanceof Error ? err.message : "Download failed.", { type: "error" }));
  };

  const remix = () => {
    if (!ready) return;
    if (onRemix) onRemix(ready);
    else navigate(remixUrl(ready));
  };

  return (
    <Card padding="none" data-testid="output-canvas" data-state={state} className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Latest output</h3>
          {ready && <ProviderBadge source={ready.providerSource} detail={ready.providerDetail} size="sm" />}
        </div>
        {ready && (
          <span className="truncate font-mono text-[11px] text-zinc-400" title={projectMeta(ready)}>
            {projectMeta(ready)}
            {ready.width && ready.height ? ` · ${ready.width}×${ready.height}` : ""}
          </span>
        )}
      </div>

      <div className="p-3 sm:p-4">
        {ready ? (
          <div className="space-y-3">
            {activeJob && <QueuePanel project={activeJob} compact />}
            <CompletedMedia project={ready} onDownload={download} />
          </div>
        ) : activeJob ? (
          <div className="dot-grid flex items-center justify-center rounded-xl bg-surface-2 p-4" style={{ aspectRatio: aspect }}>
            <div className="w-full max-w-md animate-fade-in">
              <QueuePanel project={activeJob} />
            </div>
          </div>
        ) : (
          <div className="dot-grid rounded-xl bg-surface-2" style={{ aspectRatio: aspect }}>
            <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} className="h-full border-0 bg-transparent" />
          </div>
        )}
      </div>

      {ready && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-100" title={ready.title}>
              {ready.title}
            </p>
            <p className="truncate text-[11px] text-zinc-400" title={ready.prompt}>
              {ready.prompt}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="sm" variant="secondary" leftIcon={<Download className="h-3.5 w-3.5" aria-hidden />} onClick={download} data-testid="download-button">
              Download
            </Button>
            <Link to={`/projects/${ready.id}`} className={cn(linkButtonClass)} data-testid="output-open">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Open details
            </Link>
            <Button size="sm" variant="ghost" leftIcon={<Shuffle className="h-3.5 w-3.5" aria-hidden />} onClick={remix} data-testid="output-remix">
              Remix
            </Button>
            <IconButton
              size="sm"
              label={ready.favorite ? "Remove from favorites" : "Add to favorites"}
              active={ready.favorite}
              icon={<Star className={cn("h-4 w-4", ready.favorite && "fill-current text-amber-300")} aria-hidden />}
              onClick={() => toggleFavorite(ready.id)}
              data-testid="output-favorite"
            />
          </div>
        </div>
      )}
    </Card>
  );
}

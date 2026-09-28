import React from "react";
import { Link } from "react-router-dom";
import { Clapperboard, Download, Image as ImageIcon, Megaphone, Mic, Star, Trash2, Video } from "lucide-react";
import type { GenerationProject, GenerationType } from "../../types/project";
import { TYPE_LABELS } from "../../types/project";
import { Badge, IconButton } from "../../components/ui";
import { ProviderBadge } from "../../components/media/ProviderBadge";
import { useAsset } from "../../hooks/useAsset";
import { cn } from "../../lib/cn";
import { timeAgo } from "../../lib/format";
import { STATUS_LABELS, STATUS_VARIANTS, describeMedia, isInProgress, modelName, thumbnailSource } from "./library-utils";

const TYPE_ICONS: Record<GenerationType, React.ReactNode> = {
  image: <ImageIcon />,
  video: <Video />,
  cinema: <Clapperboard />,
  lipsync: <Mic />,
  marketing: <Megaphone />,
};

export interface ProjectListRowProps {
  project: GenerationProject;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDownload: (project: GenerationProject) => void;
  onDelete: (project: GenerationProject) => void;
}

/**
 * Compact list row. The title is a "stretched" link (its ::after covers the
 * whole row) so the row navigates like an anchor while the quick actions stay
 * valid, separately focusable controls instead of buttons nested in an <a>.
 */
export const ProjectListRow: React.FC<ProjectListRowProps> = ({ project, selectable, selected, onToggleSelect, onToggleFavorite, onDownload, onDelete }) => {
  const thumb = thumbnailSource(project);
  const { url: thumbUrl } = useAsset(thumb.assetId, thumb.fallbackUrl);
  const active = isInProgress(project);

  return (
    <li
      data-testid="library-row"
      data-project-id={project.id}
      className={cn(
        "relative flex items-center gap-3 rounded-xl border bg-surface-1 p-2 pr-2.5 transition-colors hover:border-zinc-700 focus-within:border-zinc-600",
        selected ? "border-brand-500/60 bg-brand-500/5" : "border-zinc-800/80",
      )}
    >
      {selectable && (
        <input
          type="checkbox"
          className="relative z-10 ml-1 h-4 w-4 shrink-0 accent-brand-500"
          checked={Boolean(selected)}
          onChange={() => onToggleSelect?.(project.id)}
          aria-label={`Select ${project.title}`}
          data-testid="library-row-select"
        />
      )}
      <div className="flex h-[54px] w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-surface-2">
        {thumbUrl ? (
          <img src={thumbUrl} alt="" loading="lazy" width={96} height={54} className="h-full w-full object-cover" />
        ) : (
          <span className="text-zinc-400 [&>svg]:h-5 [&>svg]:w-5" aria-hidden>
            {TYPE_ICONS[project.type]}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to={`/projects/${project.id}`}
            className="min-w-0 text-sm font-semibold text-zinc-100 hover:text-white after:absolute after:inset-0 after:rounded-xl after:content-['']"
          >
            <span className="block truncate">{project.title}</span>
          </Link>
          <Badge variant="outline" size="sm">
            {TYPE_LABELS[project.type]}
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-400">
          <span className="truncate">{modelName(project.model)}</span>
          <span aria-hidden className="text-zinc-400">
            ·
          </span>
          <span className="tabular-nums">{describeMedia(project)}</span>
          {project.providerSource && <ProviderBadge source={project.providerSource} detail={project.providerDetail} size="sm" />}
          <Badge variant={STATUS_VARIANTS[project.status]} size="sm" dot={active}>
            {STATUS_LABELS[project.status]}
          </Badge>
          <time dateTime={project.createdAt}>{timeAgo(project.createdAt)}</time>
        </div>
      </div>
      <div className="relative z-10 flex shrink-0 items-center gap-0.5">
        <IconButton
          size="sm"
          label={project.favorite ? "Remove from favorites" : "Add to favorites"}
          icon={<Star className={cn("h-4 w-4", project.favorite && "fill-current")} />}
          active={project.favorite}
          aria-pressed={project.favorite}
          onClick={() => onToggleFavorite(project.id)}
          data-testid="library-row-favorite"
        />
        <IconButton
          size="sm"
          label="Download"
          icon={<Download className="h-4 w-4" />}
          disabled={project.status !== "completed"}
          onClick={() => onDownload(project)}
          data-testid="library-row-download"
        />
        <IconButton size="sm" variant="danger" label="Delete" icon={<Trash2 className="h-4 w-4" />} onClick={() => onDelete(project)} data-testid="library-row-delete" />
      </div>
    </li>
  );
};

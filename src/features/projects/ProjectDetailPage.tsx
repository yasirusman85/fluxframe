import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Ban, Columns2, Copy, Download, FolderOpen, ImageOff, Library, Pencil, RotateCcw, Share2, Shuffle, Star, Trash2 } from "lucide-react";
import type { GenerationProject } from "../../types/project";
import { TYPE_LABELS } from "../../types/project";
import { Badge, Button, Card, EmptyState, IconButton, Input, Modal, Skeleton } from "../../components/ui";
import { ImageCompare } from "../../components/media/ImageCompare";
import { ProviderBadge } from "../../components/media/ProviderBadge";
import { VideoPlayer } from "../../components/media/VideoPlayer";
import { QueuePanel } from "../../components/generation/QueuePanel";
import { useAsset, useAssetUrl } from "../../hooks/useAsset";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useProjectStore } from "../../store/project-store";
import { useUIStore } from "../../store/ui-store";
import { downloadProject } from "../../lib/download";
import { cancelGeneration, retryGeneration } from "../../lib/generation-runner";
import { remixUrl } from "../../lib/query-params";
import { cssAspect } from "../../lib/aspect";
import { cn } from "../../lib/cn";
import { LinkButton } from "./LinkButton";
import { ProjectDetailsPanel } from "./ProjectDetailsPanel";
import { RelatedProjects } from "./RelatedProjects";
import { STATUS_LABELS, STATUS_VARIANTS, describeMedia, excerpt, isInProgress, thumbnailSource } from "./library-utils";

const MAX_TITLE_LENGTH = 80;

/** Shortcuts must never fire while the user is typing. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

interface ProjectDetailProps {
  project: GenerationProject;
  projects: GenerationProject[];
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, projects }) => {
  const navigate = useNavigate();
  const renameProject = useProjectStore((s) => s.renameProject);
  const toggleFavorite = useProjectStore((s) => s.toggleFavorite);
  const duplicateProject = useProjectStore((s) => s.duplicateProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const addToast = useUIStore((s) => s.addToast);
  const openLightbox = useUIStore((s) => s.openLightbox);

  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(project.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [compare, setCompare] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renameCancelled = useRef(false);

  const output = useAsset(project.outputAssetId, project.outputUrl);
  const thumb = thumbnailSource(project);
  const posterUrl = useAssetUrl(thumb.assetId, thumb.fallbackUrl);
  const sourceId = project.sourceAssetId ?? project.keyframeAssetId;
  const sourceUrl = useAssetUrl(sourceId);

  const completed = project.status === "completed";
  const inProgress = isInProgress(project);
  const retryable = project.status === "failed" || project.status === "cancelled";
  const aspect = cssAspect(project.aspectRatio);
  const afterUrl = project.mediaKind === "video" ? posterUrl : output.url;
  const canCompare = Boolean(sourceId) && completed;

  useEffect(() => {
    if (!renaming) return;
    const input = renameInputRef.current;
    input?.focus();
    input?.select();
  }, [renaming]);

  const download = useCallback(() => {
    if (project.status !== "completed") return;
    downloadProject(project).catch((err: unknown) => addToast(err instanceof Error ? err.message : "Download failed.", { type: "error" }));
  }, [project, addToast]);

  const share = useCallback(() => {
    const url = window.location.href;
    void (async () => {
      try {
        await navigator.clipboard.writeText(url);
        addToast("Link copied", { type: "success" });
      } catch {
        addToast(`Copy this link: ${url}`, { type: "info", title: "Share project", duration: 8000 });
      }
    })();
  }, [addToast]);

  const duplicate = () => {
    const copy = duplicateProject(project.id);
    if (!copy) return;
    addToast(`Duplicated as “${copy.title}”`, { type: "success" });
    navigate(`/projects/${copy.id}`);
  };

  const remove = () => {
    setConfirmDelete(false);
    deleteProject(project.id);
    addToast(`“${project.title}” deleted.`, { type: "info" });
    navigate("/projects");
  };

  const startRename = () => {
    setDraft(project.title);
    renameCancelled.current = false;
    setRenaming(true);
  };

  const commitRename = () => {
    const next = draft.trim();
    if (next && next !== project.title) renameProject(project.id, next);
    setRenaming(false);
  };

  const onRenameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitRename();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      renameCancelled.current = true;
      setDraft(project.title);
      setRenaming(false);
    }
  };

  const onRenameBlur = () => {
    if (renameCancelled.current) {
      renameCancelled.current = false;
      return;
    }
    commitRename();
  };

  // f = favorite, d = download, Delete = delete (never while typing).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isEditableTarget(event.target)) return;
      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        toggleFavorite(project.id);
      } else if (event.key === "d" || event.key === "D") {
        event.preventDefault();
        download();
      } else if (event.key === "Delete") {
        event.preventDefault();
        setConfirmDelete(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [download, project.id, toggleFavorite]);

  const viewer = (() => {
    if (!completed) return <QueuePanel project={project} />;
    if (compare && sourceUrl && afterUrl) {
      return (
        <ImageCompare
          beforeUrl={sourceUrl}
          afterUrl={afterUrl}
          beforeLabel={project.sourceAssetId ? "Input" : "Keyframe"}
          afterLabel={project.mediaKind === "video" ? "First frame" : "Output"}
        />
      );
    }
    if (output.status === "loading") return <Skeleton className="w-full max-h-[620px] rounded-xl" style={{ aspectRatio: aspect }} />;
    if (!output.url) {
      return (
        <div className="flex w-full max-h-[620px] flex-col items-center justify-center gap-2 rounded-xl bg-surface-2 text-xs text-zinc-400" style={{ aspectRatio: aspect }}>
          <ImageOff className="h-5 w-5" aria-hidden />
          The output file is no longer stored on this device.
        </div>
      );
    }
    if (project.mediaKind === "video") {
      return (
        <div className="mx-auto w-full max-h-[620px]" style={{ aspectRatio: aspect, maxWidth: `calc(620px * (${aspect}))` }}>
          <VideoPlayer src={output.url} poster={posterUrl} title={project.title} autoPlay loop onDownload={download} className="h-full w-full" />
        </div>
      );
    }
    const imageUrl = output.url;
    return (
      <button
        type="button"
        onClick={() => openLightbox({ url: imageUrl, title: project.title, kind: "image" })}
        aria-label={`View ${project.title} full size`}
        className="block w-full cursor-zoom-in rounded-xl bg-black/40"
      >
        <img data-testid="project-image" src={imageUrl} alt={project.title} className="mx-auto max-h-[620px] w-full rounded-xl object-contain" />
      </button>
    );
  })();

  return (
    <div className="animate-fade-in mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/projects"
          data-testid="project-back"
          className="inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold text-zinc-400 transition-colors hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Library
        </Link>
        <Badge variant={STATUS_VARIANTS[project.status]} size="sm" dot={inProgress} data-testid="project-status">
          {STATUS_LABELS[project.status]}
        </Badge>
        <Badge variant="outline" size="sm">
          {TYPE_LABELS[project.type]}
        </Badge>
        <ProviderBadge source={project.providerSource} detail={project.providerDetail} size="sm" />
        <span className="text-xs text-zinc-400">{describeMedia(project)}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div className="min-w-0 flex-1">
          {renaming ? (
            <Input
              ref={renameInputRef}
              testId="project-rename-input"
              aria-label="Project title"
              value={draft}
              maxLength={MAX_TITLE_LENGTH}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onRenameKeyDown}
              onBlur={onRenameBlur}
              className="text-base font-bold"
              hint={<span className="text-zinc-400">Enter saves · Escape cancels</span>}
            />
          ) : (
            <div className="flex min-w-0 items-center gap-1">
              <h1 data-testid="project-title" className="truncate text-xl font-extrabold tracking-tight text-white md:text-2xl" title={project.title}>
                {project.title}
              </h1>
              <IconButton size="sm" label="Rename project" icon={<Pencil className="h-4 w-4" aria-hidden />} onClick={startRename} data-testid="project-rename" />
            </div>
          )}
          <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{excerpt(project.prompt, 160)}</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <IconButton
            size="sm"
            label={project.favorite ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={project.favorite}
            active={project.favorite}
            icon={<Star className={cn("h-4 w-4", project.favorite && "fill-current text-amber-300")} aria-hidden />}
            onClick={() => toggleFavorite(project.id)}
            data-testid="project-favorite"
          />
          <IconButton size="sm" label="Copy link to this project" icon={<Share2 className="h-4 w-4" aria-hidden />} onClick={share} data-testid="project-share" />
          <IconButton size="sm" label="Duplicate project" icon={<Copy className="h-4 w-4" aria-hidden />} onClick={duplicate} data-testid="project-duplicate" />
          <LinkButton to={remixUrl(project)} size="sm" variant="secondary" leftIcon={<Shuffle aria-hidden />} testId="project-remix">
            Open in studio
          </LinkButton>
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Download className="h-3.5 w-3.5" aria-hidden />}
            disabled={!completed}
            onClick={download}
            data-testid="project-download"
          >
            Download
          </Button>
          {retryable && (
            <Button size="sm" variant="outline" leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden />} onClick={() => void retryGeneration(project.id)} data-testid="project-retry">
              Retry
            </Button>
          )}
          {inProgress && (
            <Button size="sm" variant="outline" leftIcon={<Ban className="h-3.5 w-3.5" aria-hidden />} onClick={() => cancelGeneration(project.id)} data-testid="project-cancel">
              Cancel
            </Button>
          )}
          <IconButton size="sm" variant="danger" label="Delete project" icon={<Trash2 className="h-4 w-4" aria-hidden />} onClick={() => setConfirmDelete(true)} data-testid="project-delete" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Card padding="none" data-testid="project-viewer" data-status={project.status} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 px-4 py-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Output</h2>
              {canCompare && (
                <Button
                  size="sm"
                  variant={compare ? "secondary" : "outline"}
                  aria-pressed={compare}
                  leftIcon={<Columns2 className="h-3.5 w-3.5" aria-hidden />}
                  onClick={() => setCompare((value) => !value)}
                  data-testid="project-compare"
                >
                  {compare ? "Show output only" : "Compare input → output"}
                </Button>
              )}
            </div>
            <div className="p-3 sm:p-4">{viewer}</div>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <ProjectDetailsPanel project={project} />
        </div>
      </div>

      <RelatedProjects project={project} projects={projects} />

      <p className="text-xs text-zinc-400">
        Shortcuts: <kbd className="rounded border border-zinc-700 bg-surface-2 px-1 font-mono text-[10px]">F</kbd> favorite ·{" "}
        <kbd className="rounded border border-zinc-700 bg-surface-2 px-1 font-mono text-[10px]">D</kbd> download ·{" "}
        <kbd className="rounded border border-zinc-700 bg-surface-2 px-1 font-mono text-[10px]">Del</kbd> delete
      </p>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        size="sm"
        title="Delete this project?"
        description="Its stored file is removed from this browser too."
        testId="project-delete-modal"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={remove} data-testid="project-delete-confirm">
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-zinc-300">“{project.title}” will be deleted permanently. This cannot be undone.</p>
      </Modal>
    </div>
  );
};

/** Route component for `/projects/:projectId`. */
export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const projects = useProjectStore((s) => s.projects);
  const project = projects.find((candidate) => candidate.id === projectId);
  useDocumentTitle(project ? project.title : "Project not found");

  if (!project) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <EmptyState
          testId="project-not-found"
          icon={<FolderOpen aria-hidden />}
          title="Project not found"
          description={
            <span className="text-zinc-400">
              Nothing in this browser’s library has that id. It may have been deleted, cleared, or generated on another device.
            </span>
          }
          action={
            <LinkButton to="/projects" variant="primary" leftIcon={<Library aria-hidden />} testId="project-not-found-back">
              Back to the library
            </LinkButton>
          }
        />
      </div>
    );
  }

  return <ProjectDetail key={project.id} project={project} projects={projects} />;
};

export default ProjectDetailPage;

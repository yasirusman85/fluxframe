import { AlertCircle, Ban, CheckCircle2, Eye, Loader2, RotateCcw, X } from "lucide-react";
import type { ReactNode } from "react";
import type { GenerationProject, GenerationStatus } from "../../types/project";
import { TYPE_LABELS } from "../../types/project";
import { cancelGeneration, retryGeneration } from "../../lib/generation-runner";
import { cn } from "../../lib/cn";
import { Badge, Button, Card, IconButton, ProgressBar } from "../ui";
import { projectMeta } from "../media/project-meta";

export interface QueuePanelProps {
  project: GenerationProject;
  /** Shown as a "View" action once the job has completed. */
  onView?: () => void;
  /** Single-row variant for menus and stacked lists. */
  compact?: boolean;
}

const STATUS_ICONS: Record<GenerationStatus, ReactNode> = {
  queued: <Loader2 className="h-4 w-4 animate-spin text-brand-400" aria-hidden />,
  processing: <Loader2 className="h-4 w-4 animate-spin text-brand-400" aria-hidden />,
  completed: <CheckCircle2 className="h-4 w-4 text-brand-400" aria-hidden />,
  failed: <AlertCircle className="h-4 w-4 text-rose-400" aria-hidden />,
  cancelled: <Ban className="h-4 w-4 text-zinc-400" aria-hidden />,
};

const STATUS_TEXT: Record<GenerationStatus, string> = {
  queued: "Queued",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

function statusLine(project: GenerationProject): string {
  switch (project.status) {
    case "queued":
      return project.stageMessage ?? "Waiting for a free slot…";
    case "processing":
      return project.stageMessage ?? "Rendering…";
    case "completed":
      return project.renderMs ? `Completed in ${(project.renderMs / 1000).toFixed(1)}s` : "Completed";
    case "failed":
      return project.errorMessage ?? "Generation failed.";
    case "cancelled":
      return project.errorMessage && project.errorMessage !== "Cancelled" ? `Cancelled · ${project.errorMessage}` : "Cancelled";
    default:
      return "";
  }
}

/** Live view of one generation job with progress, stage text and cancel / retry / view actions. */
export function QueuePanel({ project, onView, compact = false }: QueuePanelProps) {
  const { status } = project;
  const inFlight = status === "queued" || status === "processing";
  const canRetry = status === "failed" || status === "cancelled";
  const progress = Math.max(0, Math.min(100, project.progress));

  const retry = () => void retryGeneration(project.id);
  const cancel = () => cancelGeneration(project.id);

  if (compact) {
    return (
      <div
        data-testid="queue-panel"
        data-status={status}
        className="flex items-center gap-2.5 rounded-xl border border-zinc-800/60 bg-surface-2/60 px-2.5 py-2"
      >
        <span className="shrink-0">{STATUS_ICONS[status]}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-semibold text-zinc-100">{project.title}</span>
            <Badge size="sm" variant="neutral">
              {TYPE_LABELS[project.type]}
            </Badge>
          </div>
          {inFlight ? (
            <div className="mt-1 flex items-center gap-2">
              <ProgressBar value={progress} indeterminate={status === "queued"} size="sm" label={`${project.title} progress`} className="max-w-[160px]" />
              <span className="truncate text-[10px] text-zinc-400">{statusLine(project)}</span>
            </div>
          ) : (
            <p className={cn("truncate text-[10px]", status === "failed" ? "text-rose-300" : "text-zinc-400")}>{statusLine(project)}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {inFlight && <IconButton size="sm" label="Cancel generation" icon={<X className="h-3.5 w-3.5" aria-hidden />} onClick={cancel} data-testid="queue-cancel" />}
          {canRetry && <IconButton size="sm" label="Retry generation" icon={<RotateCcw className="h-3.5 w-3.5" aria-hidden />} onClick={retry} data-testid="queue-retry" />}
          {status === "completed" && onView && <IconButton size="sm" label="View output" icon={<Eye className="h-3.5 w-3.5" aria-hidden />} onClick={onView} data-testid="queue-view" />}
        </div>
      </div>
    );
  }

  return (
    <Card padding="sm" data-testid="queue-panel" data-status={status} className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0" title={STATUS_TEXT[status]}>
          {STATUS_ICONS[status]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge size="sm" variant="neutral">
              {TYPE_LABELS[project.type]}
            </Badge>
            <span className="truncate text-sm font-semibold text-zinc-100">{project.title}</span>
          </div>
          <p className="truncate text-[11px] text-zinc-400">{projectMeta(project)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {inFlight && (
            <Button size="sm" variant="outline" leftIcon={<X className="h-3.5 w-3.5" aria-hidden />} onClick={cancel} data-testid="queue-cancel">
              Cancel
            </Button>
          )}
          {canRetry && (
            <Button size="sm" variant="secondary" leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden />} onClick={retry} data-testid="queue-retry">
              Retry
            </Button>
          )}
          {status === "completed" && onView && (
            <Button size="sm" variant="secondary" leftIcon={<Eye className="h-3.5 w-3.5" aria-hidden />} onClick={onView} data-testid="queue-view">
              View
            </Button>
          )}
        </div>
      </div>

      {inFlight && (
        <div className="space-y-1.5">
          <ProgressBar value={progress} indeterminate={status === "queued"} size="sm" label={`${project.title} progress`} />
          <div className="flex items-center justify-between gap-3 text-[11px]">
            <span className="truncate text-zinc-400" aria-live="polite">
              {statusLine(project)}
            </span>
            <span className="font-mono tabular-nums text-zinc-400">{status === "queued" ? "—" : `${Math.round(progress)}%`}</span>
          </div>
        </div>
      )}
      {status === "failed" && (
        <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs leading-relaxed text-rose-200">
          {statusLine(project)}
        </p>
      )}
      {status === "cancelled" && <p className="text-xs text-zinc-400">{statusLine(project)}</p>}
      {status === "completed" && <p className="text-xs text-brand-300">{statusLine(project)}</p>}
    </Card>
  );
}

import React from "react";
import { Loader2, AlertCircle, RefreshCw, X, Sparkles, CheckCircle2 } from "lucide-react";
import type { GenerationProject } from "../../types/project";
import { useProjectStore } from "../../store/project-store";
import { useUIStore } from "../../store/ui-store";
import { Button } from "../ui/Button";

export interface QueuePanelProps {
  project: GenerationProject;
  stageMessage?: string;
  onViewDetails?: () => void;
}

export const QueuePanel: React.FC<QueuePanelProps> = ({
  project,
  stageMessage = "Processing generation pipeline...",
  onViewDetails,
}) => {
  const { cancelGeneration, retryGeneration } = useProjectStore();
  const { addToast } = useUIStore();

  const handleCancel = () => {
    cancelGeneration(project.id);
    addToast("Generation process cancelled", "info");
  };

  const handleRetry = () => {
    retryGeneration(project.id);
    addToast("Retrying generation...", "info");
  };

  const isFailed = project.status === "failed";
  const isCompleted = project.status === "completed";

  return (
    <div className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 p-5 shadow-2xl space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {isCompleted ? (
            <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/50">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          ) : isFailed ? (
            <div className="p-2 rounded-xl bg-red-950 text-red-400 border border-red-800/50">
              <AlertCircle className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-violet-950 text-violet-400 border border-violet-800/50">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}

          <div>
            <h4 className="font-bold text-sm text-zinc-100 line-clamp-1">
              {project.title}
            </h4>
            <p className="text-xs text-zinc-400">
              {project.model} • {project.aspectRatio}
            </p>
          </div>
        </div>

        {!isCompleted && !isFailed && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            leftIcon={<X className="w-3.5 h-3.5 text-red-400" />}
            className="text-xs text-red-400 hover:bg-red-950/40"
          >
            Cancel
          </Button>
        )}

        {isFailed && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleRetry}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Retry
          </Button>
        )}
      </div>

      {/* Progress Bar & Status Text */}
      {!isFailed && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-zinc-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              {stageMessage}
            </span>
            <span className="text-violet-400 font-mono font-bold">
              {project.progress}%
            </span>
          </div>

          <div className="w-full bg-zinc-950 rounded-full h-2.5 overflow-hidden border border-zinc-800">
            <div
              className="bg-gradient-to-r from-violet-600 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-300 shadow-md shadow-violet-500/50"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message Alert */}
      {isFailed && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-300">
          {project.errorMessage || "Simulated model cluster failure. Please click retry."}
        </div>
      )}

      {/* Action to view detail once finished */}
      {isCompleted && onViewDetails && (
        <div className="pt-2 flex justify-end">
          <Button size="sm" variant="primary" onClick={onViewDetails}>
            View Generated Output &rarr;
          </Button>
        </div>
      )}
    </div>
  );
};

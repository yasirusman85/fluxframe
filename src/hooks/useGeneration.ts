import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import type { CreateProjectInput, GenerationProject, GenerationType } from "../types/project";
import { TYPE_LABELS } from "../types/project";
import { useProjectStore } from "../store/project-store";
import { useCreditStore } from "../store/credit-store";
import { useUIStore } from "../store/ui-store";
import { cancelGeneration, retryGeneration, startGeneration } from "../lib/generation-runner";
import type { Pipeline } from "../lib/pipelines";

export interface GenerateInput extends CreateProjectInput {
  creditCost: number;
  /** Custom pipeline (Creative Apps); defaults to the one registered for `type`. */
  pipeline?: Pipeline;
}

export interface UseGenerationResult {
  /** Charges credits, creates the project and starts the pipeline. Returns null when blocked. */
  generate: (input: GenerateInput) => GenerationProject | null;
  cancel: (projectId: string) => void;
  retry: (projectId: string) => void;
  activeJobs: GenerationProject[];
  /** Active jobs of the given type (or all). */
  activeJob?: GenerationProject;
  isBusy: boolean;
  latestCompleted?: GenerationProject;
}

/**
 * Page-level API for the generation system. Pass a `type` to scope
 * `activeJob`/`latestCompleted` to one studio.
 */
export function useGeneration(type?: GenerationType): UseGenerationResult {
  const { projects, activeJobIds, createProject } = useProjectStore(
    useShallow((s) => ({ projects: s.projects, activeJobIds: s.activeJobIds, createProject: s.createProject })),
  );
  const spend = useCreditStore((s) => s.spend);
  const canAfford = useCreditStore((s) => s.canAfford);
  const openTopUp = useCreditStore((s) => s.openTopUp);
  const addToast = useUIStore((s) => s.addToast);

  const generate = useCallback(
    (input: GenerateInput): GenerationProject | null => {
      if (!input.prompt.trim() && !input.sourceAssetId && !input.audioAssetId) {
        addToast("Add a prompt or an input file first.", { type: "warning" });
        return null;
      }
      // Check the balance *before* creating anything. Creating the project first
      // and deleting it on failure would run the store's asset garbage collection
      // and destroy the keyframe or audio file the user just uploaded.
      if (input.creditCost > 0 && !canAfford(input.creditCost)) {
        addToast(`You need ${input.creditCost} credits for this generation.`, { type: "warning", title: "Not enough credits" });
        openTopUp();
        return null;
      }
      const { pipeline, ...projectInput } = input;
      const project = createProject(projectInput);
      // No await separates the check above from this spend, so the balance cannot
      // have moved in between.
      if (input.creditCost > 0) spend(input.creditCost, `${TYPE_LABELS[input.type]} · ${project.title}`, project.id);
      void startGeneration(project.id, pipeline);
      return project;
    },
    [addToast, canAfford, createProject, openTopUp, spend],
  );

  const activeJobs = projects.filter((p) => activeJobIds.includes(p.id) && (!type || p.type === type));
  const latestCompleted = projects.find((p) => p.status === "completed" && (!type || p.type === type));

  return {
    generate,
    cancel: cancelGeneration,
    retry: (id) => void retryGeneration(id),
    activeJobs,
    activeJob: activeJobs[0],
    isBusy: activeJobs.length > 0,
    latestCompleted,
  };
}

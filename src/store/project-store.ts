import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GenerationProject, CreateProjectInput } from "../types/project";
import { INITIAL_PROJECTS, generateVisualDataUrl } from "../lib/demo-assets";

export interface ProjectState {
  projects: GenerationProject[];
  activeProcessingId?: string;
  
  createProject: (input: CreateProjectInput) => string;
  updateProject: (id: string, patch: Partial<GenerationProject>) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => string;
  toggleFavorite: (id: string) => void;
  getProject: (id: string) => GenerationProject | undefined;
  cancelGeneration: (id: string) => void;
  retryGeneration: (id: string) => void;
  clearAllProjects: () => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: INITIAL_PROJECTS,
      activeProcessingId: undefined,

      createProject: (input: CreateProjectInput) => {
        const id = `proj-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const now = new Date().toISOString();

        // Default auto-title from prompt if short, or truncated
        let title = input.prompt.trim();
        if (title.length > 36) {
          title = title.substring(0, 36) + "...";
        }
        if (!title) {
          title = input.type === "image" ? "Untitled Image Generation" : "Untitled Video Generation";
        }

        const newProject: GenerationProject = {
          id,
          type: input.type,
          title,
          prompt: input.prompt,
          negativePrompt: input.negativePrompt,
          model: input.model,
          aspectRatio: input.aspectRatio,
          duration: input.duration,
          quality: input.quality || "standard",
          status: "queued",
          progress: 0,
          favorite: false,
          createdAt: now,
          updatedAt: now,
          seed: input.seed || Math.floor(Math.random() * 9000000) + 1000000,
          motionStrength: input.motionStrength,
          initialImageUrl: input.initialImageUrl,
        };

        set((state) => ({
          projects: [newProject, ...state.projects],
          activeProcessingId: id,
        }));

        return id;
      },

      updateProject: (id: string, patch: Partial<GenerationProject>) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...patch,
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
          // Clear active processing ID if finished or failed
          activeProcessingId:
            state.activeProcessingId === id &&
            (patch.status === "completed" || patch.status === "failed")
              ? undefined
              : state.activeProcessingId,
        }));
      },

      deleteProject: (id: string) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          activeProcessingId:
            state.activeProcessingId === id ? undefined : state.activeProcessingId,
        }));
      },

      duplicateProject: (id: string) => {
        const source = get().projects.find((p) => p.id === id);
        if (!source) return "";

        const newId = `proj-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const now = new Date().toISOString();

        const duplicated: GenerationProject = {
          ...source,
          id: newId,
          title: `${source.title} (Copy)`,
          createdAt: now,
          updatedAt: now,
          favorite: false,
        };

        set((state) => ({
          projects: [duplicated, ...state.projects],
        }));

        return newId;
      },

      toggleFavorite: (id: string) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, favorite: !p.favorite } : p
          ),
        }));
      },

      getProject: (id: string) => {
        return get().projects.find((p) => p.id === id);
      },

      cancelGeneration: (id: string) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: "failed",
                  errorMessage: "Generation cancelled by user",
                  progress: 0,
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
          activeProcessingId:
            state.activeProcessingId === id ? undefined : state.activeProcessingId,
        }));
      },

      retryGeneration: (id: string) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: "queued",
                  progress: 0,
                  errorMessage: undefined,
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
          activeProcessingId: id,
        }));
      },

      clearAllProjects: () => {
        set({ projects: [], activeProcessingId: undefined });
      },
    }),
    {
      name: "higgsfield-clone-projects-storage-v1",
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Fix any orphaned queued/processing state on app start/reload
        state.projects.forEach((p) => {
          if (p.status === "processing" || p.status === "queued") {
            // Check if generation completed before reload or complete it gracefully
            state.updateProject(p.id, {
              status: "completed",
              progress: 100,
              outputUrl: p.outputUrl || generateVisualDataUrl(p.title, p.type, p.aspectRatio, 0),
              thumbnailUrl: p.thumbnailUrl || generateVisualDataUrl(p.title, p.type, p.aspectRatio, 0),
            });
          }
        });
      },
    }
  )
);

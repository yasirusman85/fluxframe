import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "../src/store/project-store";

describe("Project Store", () => {
  beforeEach(() => {
    useProjectStore.getState().clearAllProjects();
  });

  it("creates and persists a generation project", () => {
    const store = useProjectStore.getState();
    const id = store.createProject({
      type: "image",
      prompt: "A cybernetic dragon in hyper-space",
      model: "flux-realism-v2",
      aspectRatio: "16:9",
      quality: "high",
    });

    const project = store.getProject(id);
    expect(project).toBeDefined();
    expect(project?.prompt).toBe("A cybernetic dragon in hyper-space");
    expect(project?.status).toBe("queued");
    expect(project?.progress).toBe(0);
    expect(useProjectStore.getState().projects).toHaveLength(1);
  });

  it("filters projects by media type", () => {
    const store = useProjectStore.getState();
    store.createProject({
      type: "image",
      prompt: "Cyberpunk cityscape",
      model: "flux-realism-v2",
      aspectRatio: "16:9",
    });
    store.createProject({
      type: "video",
      prompt: "Drone motion over ocean",
      model: "motion-v1-realism",
      aspectRatio: "16:9",
    });

    const allProjects = useProjectStore.getState().projects;
    expect(allProjects).toHaveLength(2);

    const imageProjects = allProjects.filter((p) => p.type === "image");
    expect(imageProjects).toHaveLength(1);
    expect(imageProjects[0].prompt).toBe("Cyberpunk cityscape");

    const videoProjects = allProjects.filter((p) => p.type === "video");
    expect(videoProjects).toHaveLength(1);
    expect(videoProjects[0].prompt).toBe("Drone motion over ocean");
  });

  it("toggles favorite state and deletes project", () => {
    const store = useProjectStore.getState();
    const id = store.createProject({
      type: "image",
      prompt: "Test favorite",
      model: "flux-realism-v2",
      aspectRatio: "1:1",
    });

    expect(useProjectStore.getState().getProject(id)?.favorite).toBe(false);
    useProjectStore.getState().toggleFavorite(id);
    expect(useProjectStore.getState().getProject(id)?.favorite).toBe(true);

    useProjectStore.getState().deleteProject(id);
    expect(useProjectStore.getState().getProject(id)).toBeUndefined();
  });
});

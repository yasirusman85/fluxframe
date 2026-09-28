import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_PROJECTS,
  selectActiveJobs,
  selectLatestCompleted,
  selectProjectsOfType,
  useProjectStore,
} from "../src/store/project-store";
import { deleteAsset } from "../src/lib/asset-store";
import { makeProject } from "./helpers/fixtures";

vi.mock("../src/lib/asset-store", () => ({ deleteAsset: vi.fn().mockResolvedValue(undefined) }));

const store = () => useProjectStore.getState();
const deleteAssetMock = vi.mocked(deleteAsset);

const imageInput = { type: "image" as const, prompt: "a lantern market at night, warm gouache", model: "flux-realism-v2", aspectRatio: "16:9" };
const cinemaInput = { type: "cinema" as const, prompt: "an orbiting hero shot", model: "kling-3-cinema", aspectRatio: "21:9" };

beforeEach(() => {
  useProjectStore.setState({ projects: [], activeJobIds: [] });
  deleteAssetMock.mockClear();
});

describe("createProject", () => {
  it("derives sensible defaults for an image", () => {
    const project = store().createProject(imageInput);

    expect(project.id).toMatch(/^proj_/);
    expect(project.title).toBe("A lantern market at night");
    expect(project.type).toBe("image");
    expect(project.mediaKind).toBe("image");
    expect(project.status).toBe("queued");
    expect(project.progress).toBe(0);
    expect(project.stageMessage).toBe("Queued");
    expect(project.quality).toBe("high");
    expect(project.favorite).toBe(false);
    expect(project.origin).toBe("studio");
    expect(project.creditCost).toBe(0);
    expect(typeof project.seed).toBe("number");
    expect(project.duration).toBeUndefined();
    expect(project.fps).toBeUndefined();
    expect(project.createdAt).toBe(project.updatedAt);
    expect(Number.isNaN(Date.parse(project.createdAt))).toBe(false);
    expect(store().projects[0]).toEqual(project);
  });

  it("marks cinema, video, lipsync and marketing as video media with a 5 s / 30 fps default", () => {
    for (const type of ["video", "cinema", "lipsync", "marketing"] as const) {
      const project = store().createProject({ ...cinemaInput, type });
      expect(project.mediaKind, type).toBe("video");
      expect(project.duration).toBe(5);
      expect(project.fps).toBe(30);
    }
  });

  it("honours an explicit title, seed, duration and quality", () => {
    const project = store().createProject({ ...cinemaInput, title: "  Hero orbit  ", seed: 777, duration: 10, fps: 24, quality: "draft", creditCost: 30 });
    expect(project.title).toBe("Hero orbit");
    expect(project.seed).toBe(777);
    expect(project.duration).toBe(10);
    expect(project.fps).toBe(24);
    expect(project.quality).toBe("draft");
    expect(project.creditCost).toBe(30);
  });

  it("falls back to a prompt-derived title when the title is blank", () => {
    expect(store().createProject({ ...imageInput, title: "   " }).title).toBe("A lantern market at night");
    expect(store().createProject({ ...imageInput, prompt: "" }).title).toBe("Untitled image");
    expect(store().createProject({ ...cinemaInput, prompt: "" }).title).toBe("Untitled clip");
  });

  it("drops a whitespace-only negative prompt", () => {
    expect(store().createProject({ ...imageInput, negativePrompt: "   " }).negativePrompt).toBeUndefined();
    expect(store().createProject({ ...imageInput, negativePrompt: " blurry " }).negativePrompt).toBe("blurry");
  });

  it("prepends new projects and caps the library at MAX_PROJECTS", () => {
    useProjectStore.setState({ projects: Array.from({ length: MAX_PROJECTS }, (_, i) => makeProject({ id: `proj_seed${i}` })) });
    const project = store().createProject(imageInput);
    expect(store().projects).toHaveLength(MAX_PROJECTS);
    expect(store().projects[0].id).toBe(project.id);
    expect(store().projects.some((p) => p.id === `proj_seed${MAX_PROJECTS - 1}`)).toBe(false);
  });

  it("carries through studio settings", () => {
    const project = store().createProject({ ...cinemaInput, sourceAssetId: "asset_src", audioAssetId: "asset_audio", motionStrength: 0.7, tags: ["hero"], origin: "canvas", parentId: "proj_parent" });
    expect(project.sourceAssetId).toBe("asset_src");
    expect(project.audioAssetId).toBe("asset_audio");
    expect(project.motionStrength).toBe(0.7);
    expect(project.tags).toEqual(["hero"]);
    expect(project.origin).toBe("canvas");
    expect(project.parentId).toBe("proj_parent");
  });
});

describe("updateProject", () => {
  it("merges the patch and bumps updatedAt", () => {
    const project = store().createProject(imageInput);
    useProjectStore.setState({ projects: [{ ...project, updatedAt: "2020-01-01T00:00:00.000Z" }] });

    store().updateProject(project.id, { status: "processing", progress: 42 });

    const updated = store().getProject(project.id)!;
    expect(updated.status).toBe("processing");
    expect(updated.progress).toBe(42);
    expect(updated.prompt).toBe(project.prompt);
    expect(Date.parse(updated.updatedAt)).toBeGreaterThan(Date.parse("2020-01-01T00:00:00.000Z"));
  });

  it("ignores unknown ids", () => {
    store().createProject(imageInput);
    const before = store().projects;
    store().updateProject("proj_nope", { status: "failed" });
    expect(store().projects).toEqual(before);
  });
});

describe("deleteProject", () => {
  it("removes the project and releases assets nothing else references", () => {
    const project = store().createProject(imageInput);
    store().updateProject(project.id, { outputAssetId: "asset_only", thumbnailAssetId: "asset_thumb" });

    store().deleteProject(project.id);

    expect(store().projects).toHaveLength(0);
    expect(deleteAssetMock).toHaveBeenCalledWith("asset_only");
    expect(deleteAssetMock).toHaveBeenCalledWith("asset_thumb");
  });

  it("keeps assets a duplicate still references", () => {
    const project = store().createProject(imageInput);
    store().updateProject(project.id, { outputAssetId: "asset_shared" });
    const copy = store().duplicateProject(project.id)!;
    deleteAssetMock.mockClear();

    store().deleteProject(project.id);

    expect(deleteAssetMock).not.toHaveBeenCalled();
    expect(store().projects.map((p) => p.id)).toEqual([copy.id]);

    store().deleteProject(copy.id);
    expect(deleteAssetMock).toHaveBeenCalledWith("asset_shared");
  });

  it("drops the id from the active job list", () => {
    const project = store().createProject(imageInput);
    store().setJobActive(project.id, true);
    store().deleteProject(project.id);
    expect(store().activeJobIds).toEqual([]);
  });

  it("deletes several projects at once", () => {
    const a = store().createProject(imageInput);
    const b = store().createProject(imageInput);
    const c = store().createProject(imageInput);
    store().deleteProjects([a.id, c.id]);
    expect(store().projects.map((p) => p.id)).toEqual([b.id]);
  });
});

describe("duplicateProject", () => {
  it("copies the project as a remix", () => {
    const project = store().createProject({ ...imageInput, tags: ["sample", "hero"] });
    store().updateProject(project.id, { favorite: true, status: "completed" });

    const copy = store().duplicateProject(project.id)!;

    expect(copy.id).not.toBe(project.id);
    expect(copy.title).toBe(`${project.title} (copy)`);
    expect(copy.origin).toBe("remix");
    expect(copy.parentId).toBe(project.id);
    expect(copy.favorite).toBe(false);
    expect(copy.tags).toEqual(["hero"]);
    expect(copy.prompt).toBe(project.prompt);
    expect(store().projects[0].id).toBe(copy.id);
    expect(store().projects).toHaveLength(2);
  });

  it("returns undefined for an unknown id", () => {
    expect(store().duplicateProject("proj_nope")).toBeUndefined();
  });
});

describe("renameProject", () => {
  it("trims the new title", () => {
    const project = store().createProject(imageInput);
    store().renameProject(project.id, "  Renamed shot  ");
    expect(store().getProject(project.id)!.title).toBe("Renamed shot");
  });

  it("ignores empty titles", () => {
    const project = store().createProject(imageInput);
    store().renameProject(project.id, "   ");
    store().renameProject(project.id, "");
    expect(store().getProject(project.id)!.title).toBe(project.title);
  });

  it("caps very long titles at 80 characters", () => {
    const project = store().createProject(imageInput);
    store().renameProject(project.id, "T".repeat(200));
    expect(store().getProject(project.id)!.title).toHaveLength(80);
  });
});

describe("toggleFavorite", () => {
  it("flips the flag", () => {
    const project = store().createProject(imageInput);
    expect(project.favorite).toBe(false);
    store().toggleFavorite(project.id);
    expect(store().getProject(project.id)!.favorite).toBe(true);
    store().toggleFavorite(project.id);
    expect(store().getProject(project.id)!.favorite).toBe(false);
  });
});

describe("setJobActive", () => {
  it("is idempotent when adding", () => {
    store().setJobActive("proj_1", true);
    store().setJobActive("proj_1", true);
    expect(store().activeJobIds).toEqual(["proj_1"]);
  });

  it("removes ids and tolerates unknown ones", () => {
    store().setJobActive("proj_1", true);
    store().setJobActive("proj_2", true);
    store().setJobActive("proj_1", false);
    store().setJobActive("proj_missing", false);
    expect(store().activeJobIds).toEqual(["proj_2"]);
  });
});

describe("markInterruptedJobs", () => {
  it("fails queued and processing jobs and returns the count", () => {
    useProjectStore.setState({
      projects: [
        makeProject({ id: "proj_q", status: "queued", progress: 0 }),
        makeProject({ id: "proj_p", status: "processing", progress: 55 }),
        makeProject({ id: "proj_done", status: "completed" }),
        makeProject({ id: "proj_cancelled", status: "cancelled" }),
      ],
      activeJobIds: ["proj_q", "proj_p"],
    });

    expect(store().markInterruptedJobs()).toBe(2);

    expect(store().getProject("proj_q")!.status).toBe("failed");
    expect(store().getProject("proj_p")!.status).toBe("failed");
    expect(store().getProject("proj_p")!.progress).toBe(0);
    expect(store().getProject("proj_p")!.errorMessage).toMatch(/reload/i);
    expect(store().getProject("proj_done")!.status).toBe("completed");
    expect(store().getProject("proj_cancelled")!.status).toBe("cancelled");
    expect(store().activeJobIds).toEqual([]);
  });

  it("returns zero when nothing was interrupted", () => {
    useProjectStore.setState({ projects: [makeProject({ status: "completed" })] });
    expect(store().markInterruptedJobs()).toBe(0);
  });
});

describe("clearAllProjects and resetToSamples", () => {
  it("empties the library and releases every asset", () => {
    const project = store().createProject(imageInput);
    store().updateProject(project.id, { outputAssetId: "asset_gone" });
    store().setJobActive(project.id, true);

    store().clearAllProjects();

    expect(store().projects).toEqual([]);
    expect(store().activeJobIds).toEqual([]);
    expect(deleteAssetMock).toHaveBeenCalledWith("asset_gone");
  });

  it("restores the six seeded samples", () => {
    store().createProject(imageInput);
    store().resetToSamples();

    const projects = store().projects;
    expect(projects).toHaveLength(6);
    expect(projects.every((p) => p.status === "completed")).toBe(true);
    expect(projects.every((p) => p.tags?.includes("sample"))).toBe(true);
    expect(new Set(projects.map((p) => p.id)).size).toBe(6);
  });
});

describe("selectors", () => {
  it("finds the latest completed project, optionally by type", () => {
    useProjectStore.setState({
      projects: [
        makeProject({ id: "proj_new_video", type: "video", status: "processing" }),
        makeProject({ id: "proj_new_image", type: "image", status: "completed" }),
        makeProject({ id: "proj_old_video", type: "video", status: "completed" }),
      ],
    });

    expect(selectLatestCompleted()(store())!.id).toBe("proj_new_image");
    expect(selectLatestCompleted("video")(store())!.id).toBe("proj_old_video");
    expect(selectLatestCompleted("lipsync")(store())).toBeUndefined();
  });

  it("maps active job ids back to projects", () => {
    useProjectStore.setState({
      projects: [makeProject({ id: "proj_a" }), makeProject({ id: "proj_b" }), makeProject({ id: "proj_c" })],
      activeJobIds: ["proj_c", "proj_a"],
    });
    expect(selectActiveJobs(store()).map((p) => p.id)).toEqual(["proj_a", "proj_c"]);
  });

  it("filters by type", () => {
    useProjectStore.setState({
      projects: [makeProject({ id: "proj_i", type: "image" }), makeProject({ id: "proj_v", type: "video" })],
    });
    expect(selectProjectsOfType("video")(store()).map((p) => p.id)).toEqual(["proj_v"]);
  });
});

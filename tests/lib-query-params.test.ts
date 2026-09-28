import { describe, expect, it } from "vitest";
import { buildStudioUrl, parseStudioParams, remixUrl } from "../src/lib/query-params";
import { STUDIO_ROUTES } from "../src/types/project";
import { makeCamera, makeLipsync, makeMarketing, makeProject } from "./helpers/fixtures";

const params = (query: string) => parseStudioParams(new URLSearchParams(query));

describe("parseStudioParams", () => {
  it("reads and trims every supported key", () => {
    const parsed = params(
      "prompt=%20a%20neon%20skyline%20&negative=%20blurry%20&model=flux-realism-v2&ratio=9:16&camera=orbit&product=Nimbus&template=ugc-review&tone=luxury&script=Hello&source=asset_1&remix=proj_1",
    );
    expect(parsed).toEqual({
      prompt: "a neon skyline",
      negative: "blurry",
      model: "flux-realism-v2",
      ratio: "9:16",
      duration: undefined,
      camera: "orbit",
      product: "Nimbus",
      template: "ugc-review",
      tone: "luxury",
      script: "Hello",
      source: "asset_1",
      remix: "proj_1",
    });
  });

  it("parses a numeric duration", () => {
    expect(params("duration=5").duration).toBe(5);
    expect(params("duration=10").duration).toBe(10);
    expect(params("duration=%203%20").duration).toBe(3);
  });

  it("ignores durations that are not usable numbers", () => {
    expect(params("duration=abc").duration).toBeUndefined();
    expect(params("duration=0").duration).toBeUndefined();
    expect(params("duration=-4").duration).toBeUndefined();
    expect(params("duration=").duration).toBeUndefined();
    expect(params("").duration).toBeUndefined();
  });

  it("turns blank values into undefined", () => {
    expect(params("prompt=%20%20&model=&ratio=%09").prompt).toBeUndefined();
    expect(params("prompt=%20%20&model=&ratio=%09").model).toBeUndefined();
    expect(params("prompt=%20%20&model=&ratio=%09").ratio).toBeUndefined();
  });

  it("returns an all-undefined shape for an empty search", () => {
    const parsed = params("");
    expect(Object.values(parsed).every((v) => v === undefined)).toBe(true);
  });
});

describe("buildStudioUrl", () => {
  it("returns the bare route when nothing is set", () => {
    expect(buildStudioUrl("/create/image", {})).toBe("/create/image");
    expect(buildStudioUrl("/create/image", { prompt: undefined, model: "" })).toBe("/create/image");
  });

  it("skips empty values but keeps meaningful ones", () => {
    const url = buildStudioUrl("/create/video", { prompt: "a cat", negative: "", duration: 5 });
    const search = new URL(url, "https://fluxframe.test").searchParams;
    expect(search.get("prompt")).toBe("a cat");
    expect(search.get("duration")).toBe("5");
    expect(search.has("negative")).toBe(false);
  });

  it("encodes values that need it", () => {
    const url = buildStudioUrl("/create/image", { prompt: "a dog & a cat, 100%" });
    expect(url).not.toContain(" ");
    expect(url).toContain("%26");
    expect(params(url.split("?")[1]).prompt).toBe("a dog & a cat, 100%");
  });

  it("keeps a zero-free numeric duration as a string", () => {
    expect(buildStudioUrl("/create/cinema", { duration: 10 })).toBe("/create/cinema?duration=10");
  });
});

describe("remixUrl", () => {
  it("round-trips camera, marketing and lipsync settings", () => {
    const project = makeProject({
      type: "cinema",
      mediaKind: "video",
      prompt: "a lantern market at night",
      negativePrompt: "blurry, text",
      model: "kling-3-cinema",
      aspectRatio: "21:9",
      duration: 10,
      sourceAssetId: "asset_source",
      cameraMotion: makeCamera({ preset: "orbit" }),
      marketing: makeMarketing({ productName: "Nimbus Runner", template: "ugc-review", tone: "luxury" }),
      lipsync: makeLipsync({ script: "Hello from FluxFrame." }),
    });

    const url = remixUrl(project);
    expect(url.startsWith(`${STUDIO_ROUTES.cinema}?`)).toBe(true);

    const parsed = params(url.split("?")[1]);
    expect(parsed).toEqual({
      prompt: project.prompt,
      negative: "blurry, text",
      model: "kling-3-cinema",
      ratio: "21:9",
      duration: 10,
      camera: "orbit",
      product: "Nimbus Runner",
      template: "ugc-review",
      tone: "luxury",
      script: "Hello from FluxFrame.",
      source: "asset_source",
      remix: project.id,
    });
  });

  it("falls back to the generated keyframe when there is no uploaded source", () => {
    const project = makeProject({ sourceAssetId: undefined, keyframeAssetId: "asset_keyframe" });
    expect(params(remixUrl(project).split("?")[1]).source).toBe("asset_keyframe");
  });

  it("omits settings the project does not carry", () => {
    const project = makeProject({ type: "image", negativePrompt: undefined, duration: undefined, sourceAssetId: undefined });
    const url = remixUrl(project);
    const search = new URL(url, "https://fluxframe.test").searchParams;
    expect(url.startsWith(STUDIO_ROUTES.image)).toBe(true);
    expect(search.has("negative")).toBe(false);
    expect(search.has("duration")).toBe(false);
    expect(search.has("camera")).toBe(false);
    expect(search.has("product")).toBe(false);
    expect(search.has("source")).toBe(false);
    expect(search.get("remix")).toBe(project.id);
  });

  it("routes each generation type to its own studio", () => {
    for (const type of ["image", "video", "cinema", "lipsync", "marketing"] as const) {
      expect(remixUrl(makeProject({ type })).startsWith(STUDIO_ROUTES[type])).toBe(true);
    }
  });
});

import { describe, expect, it } from "vitest";
import {
  AD_FORMATS,
  AD_TEMPLATES,
  ALL_MODELS,
  APERTURES,
  BRAND_TONES,
  CAMERA_PRESETS,
  CINEMA_MODELS,
  CREATIVE_APPS,
  DEFAULT_CAMERA,
  FOCAL_LENGTHS,
  IMAGE_MODELS,
  LIPSYNC_MODELS,
  PROMPT_ENHANCERS,
  SHOWCASE_CATEGORIES,
  SHOWCASE_PRESETS,
  SUBSCRIPTION_TIERS,
  VIDEO_DURATIONS,
  VIDEO_MODELS,
  cameraFromPreset,
  describeCamera,
  findModel,
  modelsForType,
  productNameFromUrl,
} from "../src/lib/catalog";
import { makeCamera } from "./helpers/fixtures";

describe("models", () => {
  it("has unique ids across every catalog", () => {
    const ids = ALL_MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ALL_MODELS).toHaveLength(IMAGE_MODELS.length + VIDEO_MODELS.length + CINEMA_MODELS.length + LIPSYNC_MODELS.length);
  });

  it("prices and attributes every model", () => {
    for (const model of ALL_MODELS) {
      expect(model.creditCost, model.id).toBeGreaterThan(0);
      expect(["pollinations", "motion-engine", "lipsync-engine"]).toContain(model.engine);
      expect(model.name.length).toBeGreaterThan(0);
      expect(model.description.length).toBeGreaterThan(0);
      expect(model.badge.length).toBeGreaterThan(0);
      expect(model.speed.length).toBeGreaterThan(0);
      expect(model.qualityLabel.length).toBeGreaterThan(0);
    }
  });

  it("gives every image model a prompt style suffix", () => {
    for (const model of IMAGE_MODELS) {
      expect(model.type).toBe("image");
      expect(model.engine).toBe("pollinations");
      expect(model.styleSuffix, model.id).toBeTruthy();
      expect(model.styleSuffix!.length).toBeGreaterThan(10);
    }
  });

  it("gives every render-engine model a look", () => {
    for (const model of [...VIDEO_MODELS, ...CINEMA_MODELS, ...LIPSYNC_MODELS]) {
      expect(model.engine, model.id).not.toBe("pollinations");
      expect(model.look, model.id).toBeDefined();
      expect(model.look!.grain).toBeGreaterThanOrEqual(0);
      expect(model.look!.vignette).toBeGreaterThanOrEqual(0);
      expect(typeof model.look!.letterbox).toBe("boolean");
    }
  });

  it("exposes exactly one popular model per catalog", () => {
    for (const list of [IMAGE_MODELS, VIDEO_MODELS, CINEMA_MODELS, LIPSYNC_MODELS]) {
      expect(list.filter((m) => m.isPopular)).toHaveLength(1);
    }
  });
});

describe("findModel / modelsForType", () => {
  it("finds a model by id", () => {
    expect(findModel("flux-realism-v2")?.name).toBe("Flux Realism v2");
    expect(findModel("kling-3-cinema")?.type).toBe("cinema");
  });

  it("returns undefined for an unknown id", () => {
    expect(findModel("does-not-exist")).toBeUndefined();
    expect(findModel("")).toBeUndefined();
  });

  it("maps each generation type to its catalog", () => {
    expect(modelsForType("image")).toBe(IMAGE_MODELS);
    expect(modelsForType("video")).toBe(VIDEO_MODELS);
    expect(modelsForType("cinema")).toBe(CINEMA_MODELS);
    expect(modelsForType("lipsync")).toBe(LIPSYNC_MODELS);
  });

  it("returns nothing for marketing, which has no model picker", () => {
    expect(modelsForType("marketing")).toEqual([]);
  });

  it("only lists models whose type matches", () => {
    for (const type of ["image", "video", "cinema", "lipsync"] as const) {
      for (const model of modelsForType(type)) expect(model.type).toBe(type);
    }
  });
});

describe("camera presets", () => {
  it("has unique ids and known categories", () => {
    const ids = CAMERA_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const preset of CAMERA_PRESETS) {
      expect(["Cinematic", "Dynamic", "Specialty"]).toContain(preset.category);
      expect(preset.description.length).toBeGreaterThan(0);
    }
  });

  it("points DEFAULT_CAMERA at a real preset with valid optics", () => {
    expect(CAMERA_PRESETS.some((p) => p.id === DEFAULT_CAMERA.preset)).toBe(true);
    expect(FOCAL_LENGTHS).toContain(DEFAULT_CAMERA.focalLength);
    expect(APERTURES).toContain(DEFAULT_CAMERA.aperture);
  });
});

describe("cameraFromPreset", () => {
  const orbit = CAMERA_PRESETS.find((p) => p.id === "orbit")!;

  it("copies every axis from the preset", () => {
    const camera = cameraFromPreset(orbit);
    expect(camera.preset).toBe("orbit");
    expect(camera.pan).toBe(orbit.pan);
    expect(camera.tilt).toBe(orbit.tilt);
    expect(camera.zoom).toBe(orbit.zoom);
    expect(camera.dolly).toBe(orbit.dolly);
    expect(camera.orbit).toBe(orbit.orbit);
    expect(camera.roll).toBe(orbit.roll);
  });

  it("keeps the focal length and aperture from the base settings", () => {
    const camera = cameraFromPreset(orbit, { focalLength: "85mm", aperture: "f/1.4", pan: 999 });
    expect(camera.focalLength).toBe("85mm");
    expect(camera.aperture).toBe("f/1.4");
    expect(camera.pan).toBe(orbit.pan);
  });

  it("defaults the optics when no base is given", () => {
    const camera = cameraFromPreset(orbit);
    expect(camera.focalLength).toBe("35mm");
    expect(camera.aperture).toBe("f/2.8");
  });
});

describe("describeCamera", () => {
  it("names the horizontal sweep direction", () => {
    expect(describeCamera(makeCamera({ pan: 45, orbit: 0, zoom: 0 }))).toContain("pan right");
    expect(describeCamera(makeCamera({ pan: -45, orbit: 0, zoom: 0 }))).toContain("pan left");
  });

  it("names orbiting moves", () => {
    expect(describeCamera(makeCamera({ orbit: 120 }))).toContain("orbit");
  });

  it("falls back to 'static shot' when nothing moves", () => {
    const still = makeCamera({ pan: 0, tilt: 0, zoom: 0, dolly: 0, orbit: 0, roll: 0 });
    expect(describeCamera(still)).toContain("static shot");
  });

  it("always names the lens and aperture", () => {
    expect(describeCamera(makeCamera({ focalLength: "85mm", aperture: "f/1.4" }))).toContain("85mm lens at f/1.4");
    expect(describeCamera(DEFAULT_CAMERA)).toContain("35mm lens at f/2.8");
  });

  it("describes tilt, zoom, dolly and roll", () => {
    const base = { pan: 0, tilt: 0, zoom: 0, dolly: 0, orbit: 0, roll: 0 };
    expect(describeCamera(makeCamera({ ...base, tilt: 35 }))).toContain("tilt up");
    expect(describeCamera(makeCamera({ ...base, tilt: -35 }))).toContain("tilt down");
    expect(describeCamera(makeCamera({ ...base, zoom: 45 }))).toContain("zoom in");
    expect(describeCamera(makeCamera({ ...base, zoom: -40 }))).toContain("zoom out");
    expect(describeCamera(makeCamera({ ...base, dolly: 60 }))).toContain("dolly in");
    expect(describeCamera(makeCamera({ ...base, dolly: -60 }))).toContain("dolly out");
    expect(describeCamera(makeCamera({ ...base, roll: 30 }))).toContain("dutch angle");
  });

  it("ignores axes inside the dead zone", () => {
    const nearly = makeCamera({ pan: 4, tilt: 4, zoom: 4, dolly: 4, orbit: 4, roll: 2 });
    expect(describeCamera(nearly)).toContain("static shot");
  });

  it("produces a usable description for every preset", () => {
    for (const preset of CAMERA_PRESETS) {
      const description = describeCamera(cameraFromPreset(preset));
      expect(description.length, preset.id).toBeGreaterThan(10);
      expect(description).toContain("lens at");
    }
  });
});

describe("productNameFromUrl", () => {
  it("reads a product slug and strips the year", () => {
    expect(productNameFromUrl("https://shop.example.com/products/aero-runner-2024")).toBe("Aero Runner");
  });

  it("title-cases multi-word slugs and normalises separators", () => {
    expect(productNameFromUrl("https://x.io/p/pro_max+ultra")).toBe("Pro Max Ultra");
    expect(productNameFromUrl("https://store.com/items/widget.html")).toBe("Widget");
  });

  it("falls back to the brand for bare domains", () => {
    expect(productNameFromUrl("nike.com")).toBe("Nike");
    expect(productNameFromUrl("www.acme.com/")).toBe("Acme");
    expect(productNameFromUrl("https://store.com/a")).toBe("Store");
  });

  it("returns an empty string for unusable input", () => {
    expect(productNameFromUrl("")).toBe("");
    expect(productNameFromUrl("not a url")).toBe("");
    expect(productNameFromUrl("https://::::")).toBe("");
  });
});

describe("showcase", () => {
  it("has unique ids", () => {
    const ids = SHOWCASE_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(SHOWCASE_PRESETS.length).toBeGreaterThanOrEqual(10);
  });

  it("only uses categories from SHOWCASE_CATEGORIES", () => {
    const categories = new Set(SHOWCASE_CATEGORIES);
    expect(SHOWCASE_CATEGORIES[0]).toBe("All");
    for (const preset of SHOWCASE_PRESETS) {
      expect(categories.has(preset.category), preset.id).toBe(true);
      expect(preset.category).not.toBe("All");
    }
  });

  it("points every preview at a jpg under the app base", () => {
    for (const preset of SHOWCASE_PRESETS) {
      expect(preset.previewUrl.endsWith(".jpg"), preset.id).toBe(true);
      expect(preset.previewUrl).toContain("showcase/");
    }
  });

  it("gives every preset a prompt, ratio and seed", () => {
    for (const preset of SHOWCASE_PRESETS) {
      expect(preset.prompt.length, preset.id).toBeGreaterThan(20);
      expect(preset.aspectRatio).toMatch(/^\d+:\d+$/);
      expect(preset.seed).toBeGreaterThan(0);
      expect(preset.title.length).toBeGreaterThan(0);
    }
  });

  it("names a real camera preset where one is set", () => {
    const presetIds = new Set(CAMERA_PRESETS.map((p) => p.id));
    for (const preset of SHOWCASE_PRESETS) {
      if (preset.cameraPreset) expect(presetIds.has(preset.cameraPreset), preset.id).toBe(true);
    }
  });
});

describe("CREATIVE_APPS", () => {
  it("has unique ids and priced, multi-field apps", () => {
    const ids = CREATIVE_APPS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const app of CREATIVE_APPS) {
      expect(app.creditCost, app.id).toBeGreaterThan(0);
      expect(app.steps).toBeGreaterThanOrEqual(1);
      expect(app.fields.length).toBeGreaterThan(0);
      expect(["image", "video"]).toContain(app.outputKind);
      expect(app.fields.some((f) => f.required)).toBe(true);
    }
  });

  it("gives every select field a non-empty option list", () => {
    const selects = CREATIVE_APPS.flatMap((app) => app.fields.filter((f) => f.type === "select").map((f) => ({ app: app.id, field: f })));
    expect(selects.length).toBeGreaterThan(0);
    for (const { app, field } of selects) {
      expect(field.options, `${app}.${field.key}`).toBeDefined();
      expect(field.options!.length).toBeGreaterThan(1);
      expect(new Set(field.options).size).toBe(field.options!.length);
    }
  });

  it("uses unique field keys within an app", () => {
    for (const app of CREATIVE_APPS) {
      const keys = app.fields.map((f) => f.key);
      expect(new Set(keys).size, app.id).toBe(keys.length);
    }
  });
});

describe("AD_TEMPLATES", () => {
  it("has unique ids and scenes that add up to a real runtime", () => {
    const ids = AD_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const template of AD_TEMPLATES) {
      const total = template.scenes.reduce((sum, scene) => sum + scene.durationMs, 0);
      expect(total, template.id).toBeGreaterThan(0);
      expect(total).toBeGreaterThanOrEqual(5000);
      expect(template.scenes.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("ends every template on a call to action", () => {
    for (const template of AD_TEMPLATES) {
      expect(template.scenes[template.scenes.length - 1].kind, template.id).toBe("cta");
      expect(template.scenes[0].kind).toBe("hook");
    }
  });

  it("uses a format the UI offers", () => {
    const ratios = new Set(AD_FORMATS.map((f) => f.ratio));
    for (const template of AD_TEMPLATES) expect(ratios.has(template.aspectRatio), template.id).toBe(true);
  });
});

describe("BRAND_TONES", () => {
  it("has unique ids and hex colours", () => {
    const ids = BRAND_TONES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const tone of BRAND_TONES) {
      expect(tone.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(tone.secondary).toMatch(/^#[0-9a-f]{6}$/i);
      expect(tone.cta.length).toBeGreaterThan(3);
      expect(tone.label.length).toBeGreaterThan(0);
    }
  });

  it("weaves the product name into every headline", () => {
    for (const tone of BRAND_TONES) {
      expect(tone.headline("Nimbus"), tone.id).toContain("Nimbus");
    }
    expect(BRAND_TONES.find((t) => t.id === "energetic")!.headline("Nimbus")).toBe("Meet Nimbus.");
    expect(BRAND_TONES.find((t) => t.id === "technical")!.headline("Nimbus")).toBe("Nimbus, engineered.");
  });

  it("writes product-independent support copy", () => {
    for (const tone of BRAND_TONES) {
      expect(tone.subheadline("Nimbus").length, tone.id).toBeGreaterThan(5);
      expect(tone.proof("Nimbus").length).toBeGreaterThan(5);
    }
  });
});

describe("plans, durations and enhancers", () => {
  it("offers three video durations", () => {
    expect([...VIDEO_DURATIONS]).toEqual([3, 5, 10]);
  });

  it("has unique plan ids with rising credit allowances", () => {
    const ids = SUBSCRIPTION_TIERS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (let i = 1; i < SUBSCRIPTION_TIERS.length; i++) {
      expect(SUBSCRIPTION_TIERS[i].creditsMonthly).toBeGreaterThan(SUBSCRIPTION_TIERS[i - 1].creditsMonthly);
    }
    for (const tier of SUBSCRIPTION_TIERS) expect(tier.features.length).toBeGreaterThan(2);
  });

  it("lists non-empty prompt enhancers", () => {
    const keys = Object.keys(PROMPT_ENHANCERS);
    expect(keys.length).toBeGreaterThan(2);
    for (const key of keys) expect(PROMPT_ENHANCERS[key].length).toBeGreaterThan(10);
  });

  it("offers a label for every ad format", () => {
    for (const format of AD_FORMATS) {
      expect(format.ratio).toMatch(/^\d+:\d+$/);
      expect(format.label.length).toBeGreaterThan(0);
    }
  });
});

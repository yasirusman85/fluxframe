import { describe, expect, it } from "vitest";
import { CREATIVE_APPS, IMAGE_MODELS, type CreativeApp } from "../src/lib/catalog";
import { appTitle, buildAppPrompt, createAppPlan, validateAppValues } from "../src/lib/apps";
import { imagePipeline } from "../src/lib/pipelines/image";

const app = (id: string): CreativeApp => {
  const found = CREATIVE_APPS.find((a) => a.id === id);
  if (!found) throw new Error(`missing app ${id}`);
  return found;
};

describe("createAppPlan", () => {
  it("builds the Style Snap prompt, model and ratio", () => {
    const plan = createAppPlan(app("style-snap"), { subject: "tall man with curly hair", style: "Techwear", setting: "Tokyo crosswalk at dusk" });
    const suffix = IMAGE_MODELS.find((m) => m.id === "flux-realism-v2")?.styleSuffix;
    expect(plan.project.prompt).toBe(`full-body editorial fashion photograph of tall man with curly hair wearing a Techwear outfit, Tokyo crosswalk at dusk, ${suffix}`);
    expect(plan.project.model).toBe("flux-realism-v2");
    expect(plan.project.aspectRatio).toBe("3:4");
    expect(plan.project.type).toBe("image");
    expect(plan.project.creditCost).toBe(10);
    expect(plan.project.origin).toBe("app");
    expect(plan.project.title).toBe("Style Snap · Techwear");
    expect(plan.project.tags).toContain("style-snap");
    expect(plan.pipeline).toBe(imagePipeline);
  });

  it("omits the optional setting when empty", () => {
    const plan = createAppPlan(app("style-snap"), { subject: "a skater", style: "Y2K" });
    expect(plan.project.prompt).toMatch(/^full-body editorial fashion photograph of a skater wearing a Y2K outfit, photorealistic/);
  });

  it("plans a video with an orbit camera for LogoMotion", () => {
    const plan = createAppPlan(app("logomotion"), { brand: "Northwind", material: "Liquid chrome", vibe: "" });
    expect(plan.project.type).toBe("video");
    expect(plan.project.aspectRatio).toBe("1:1");
    expect(plan.project.duration).toBe(5);
    expect(plan.project.cameraMotion?.preset).toBe("orbit");
    expect(plan.project.prompt).toBe('logo mark for a brand called "Northwind", Liquid chrome, centred on dark background, symmetrical, high detail');
    expect(plan.project.creditCost).toBe(15);
    expect(plan.pipeline).not.toBe(imagePipeline);
  });

  it("uses a custom pipeline and 16:9 for the Storyboarder", () => {
    const plan = createAppPlan(app("storyboard"), { logline: "A lighthouse keeper finds a message in a bottle", style: "Noir" });
    expect(plan.project.type).toBe("image");
    expect(plan.project.aspectRatio).toBe("16:9");
    expect(plan.project.creditCost).toBe(20);
    expect(plan.pipeline).not.toBe(imagePipeline);
    expect(typeof plan.pipeline).toBe("function");
  });

  it("throws on missing required values", () => {
    expect(() => createAppPlan(app("style-snap"), { style: "Techwear" })).toThrow(/Subject is required/);
  });

  it("rejects unknown apps", () => {
    expect(() => buildAppPrompt({ ...app("style-snap"), id: "nope" }, {})).toThrow(/Unknown creative app/);
  });
});

describe("validateAppValues", () => {
  it("flags missing required fields only", () => {
    const errors = validateAppValues(app("style-snap"), {});
    expect(errors).toHaveProperty("subject");
    expect(errors).toHaveProperty("style");
    expect(errors).not.toHaveProperty("setting");
    expect(errors.subject).toBe("Subject is required.");
  });

  it("accepts complete values and rejects unknown select options", () => {
    expect(validateAppValues(app("style-snap"), { subject: "someone", style: "Techwear" })).toEqual({});
    expect(validateAppValues(app("style-snap"), { subject: "someone", style: "Not a style" })).toHaveProperty("style");
    expect(validateAppValues(app("style-snap"), { subject: "   ", style: "Techwear" })).toHaveProperty("subject");
  });
});

describe("appTitle", () => {
  it("derives a short title from the main field", () => {
    expect(appTitle(app("logomotion"), { brand: "Northwind" })).toBe("LogoMotion · Northwind");
    expect(appTitle(app("storyboard"), { logline: "a lighthouse keeper discovers a message in a bottle during a storm at night" })).toMatch(/^Shots Storyboarder · A lighthouse keeper/);
    expect(appTitle(app("style-snap"), {})).toBe("Style Snap");
  });
});

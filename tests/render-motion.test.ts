import { describe, expect, it } from "vitest";
import type { CameraMotionSettings } from "../src/types/project";
import { cameraForMotion, computeCameraTransform, parseFocal, speedRamp } from "../src/lib/render/motion";

const W = 1280;
const H = 720;

const camera = (overrides: Partial<CameraMotionSettings> = {}): CameraMotionSettings => ({
  pan: 0,
  tilt: 0,
  zoom: 0,
  dolly: 0,
  orbit: 0,
  roll: 0,
  focalLength: "35mm",
  aperture: "f/2.8",
  ...overrides,
});

const still = { handheld: 0 };

describe("computeCameraTransform", () => {
  it("is the identity for a static camera at the start of the clip", () => {
    const t = computeCameraTransform(camera(), 0, 0, W, H, still);
    expect(t.scale).toBeCloseTo(1, 6);
    expect(t.tx).toBeCloseTo(0, 6);
    expect(t.ty).toBeCloseTo(0, 6);
    expect(t.rotation).toBeCloseTo(0, 6);
  });

  it("zooms in monotonically over the clip", () => {
    const cam = camera({ zoom: 100 });
    let previous = computeCameraTransform(cam, 0, 0, W, H, still).scale;
    expect(previous).toBeCloseTo(1, 6);
    for (let i = 1; i <= 50; i++) {
      const scale = computeCameraTransform(cam, i / 50, 0, W, H, still).scale;
      expect(scale).toBeGreaterThanOrEqual(previous);
      previous = scale;
    }
    expect(previous).toBeGreaterThan(1.3);
  });

  it("pulls back from a zoomed-in start to an unscaled end", () => {
    const cam = camera({ zoom: -60 });
    const start = computeCameraTransform(cam, 0, 0, W, H, still);
    const end = computeCameraTransform(cam, 1, 0, W, H, still);
    expect(start.scale).toBeGreaterThan(1);
    expect(end.scale).toBeCloseTo(1, 6);
    // Extra overscan covers the zoomed-out end so no canvas edge shows.
    expect(start.overscan).toBeGreaterThan(computeCameraTransform(camera(), 0, 0, W, H, still).overscan);
  });

  it("pans right by moving the image from right to left", () => {
    const cam = camera({ pan: 45 });
    const start = computeCameraTransform(cam, 0, 0, W, H, still);
    const end = computeCameraTransform(cam, 1, 0, W, H, still);
    expect(start.tx).toBeGreaterThan(0);
    expect(end.tx).toBeLessThan(0);
    expect(Math.abs(start.tx)).toBeCloseTo(Math.abs(end.tx), 6);
  });

  it("always overscans by at least 25%", () => {
    const cases = [camera(), camera({ pan: 90, tilt: -90 }), camera({ orbit: 180 }), camera({ roll: 45 }), camera({ focalLength: "18mm" }), camera({ focalLength: "135mm" })];
    for (const cam of cases) {
      for (const p of [0, 0.5, 1]) expect(computeCameraTransform(cam, p, 0, W, H, still).overscan).toBeGreaterThanOrEqual(1.25);
    }
  });

  it("scales travel with motion strength", () => {
    const cam = camera({ zoom: 50 });
    const gentle = computeCameraTransform(cam, 1, 0, W, H, { ...still, motionStrength: 2 }).scale;
    const strong = computeCameraTransform(cam, 1, 0, W, H, { ...still, motionStrength: 10 }).scale;
    expect(strong - 1).toBeGreaterThan(gentle - 1);
  });

  it("adds handheld micro-motion only when enabled", () => {
    const cam = camera();
    const steady = computeCameraTransform(cam, 0.5, 1234, W, H, { handheld: 0 });
    const shaky = computeCameraTransform(cam, 0.5, 1234, W, H, { handheld: 1 });
    expect(steady.tx).toBeCloseTo(0, 6);
    expect(Math.abs(shaky.tx) + Math.abs(shaky.ty)).toBeGreaterThan(0);
    expect(Math.abs(shaky.tx)).toBeLessThan(10);
  });
});

describe("speedRamp", () => {
  it("maps the endpoints and stays monotonic", () => {
    expect(speedRamp(0)).toBeCloseTo(0, 9);
    expect(speedRamp(1)).toBeCloseTo(1, 9);
    let previous = -1;
    for (let i = 0; i <= 200; i++) {
      const value = speedRamp(i / 200);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
      previous = value;
    }
  });
});

describe("helpers", () => {
  it("parses focal lengths with a 35mm fallback", () => {
    expect(parseFocal("85mm")).toBe(85);
    expect(parseFocal("18mm")).toBe(18);
    expect(parseFocal("wide")).toBe(35);
  });

  it("cameraForMotion('static') has no motion on any axis", () => {
    const cam = cameraForMotion("static");
    expect(cam.pan).toBe(0);
    expect(cam.tilt).toBe(0);
    expect(cam.zoom).toBe(0);
    expect(cam.dolly).toBe(0);
    expect(cam.orbit).toBe(0);
    expect(cam.roll).toBe(0);
  });

  it("cameraForMotion returns distinct moves for the ad scenes", () => {
    expect(cameraForMotion("push").zoom).toBeGreaterThan(0);
    expect(cameraForMotion("pull").zoom).toBeLessThan(0);
    expect(cameraForMotion("pan").pan).not.toBe(0);
    expect(cameraForMotion("orbit").orbit).not.toBe(0);
  });
});

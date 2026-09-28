/**
 * Shared factories for the unit-test suite.
 *
 * Everything here is deterministic: ids and timestamps come from a counter
 * rather than Date.now()/Math.random() so assertions never depend on wall
 * clock or ordering luck.
 */
import type {
  CameraMotionSettings,
  GenerationProject,
  LipSyncSettings,
  MarketingSettings,
} from "../../src/types/project";

let seq = 0;

/** Resets the fixture counter (handy in `beforeEach` when ids are asserted). */
export function resetFixtures(): void {
  seq = 0;
}

export function makeProject(overrides: Partial<GenerationProject> = {}): GenerationProject {
  seq += 1;
  const created = new Date(Date.UTC(2026, 0, 1, 12, 0, 0) - seq * 60_000).toISOString();
  return {
    id: `proj_fixture${seq}`,
    type: "image",
    mediaKind: "image",
    title: `Fixture project ${seq}`,
    prompt: "a neon skyline at dusk",
    model: "flux-realism-v2",
    aspectRatio: "16:9",
    width: 1024,
    height: 576,
    quality: "high",
    status: "completed",
    progress: 100,
    favorite: false,
    createdAt: created,
    updatedAt: created,
    completedAt: created,
    seed: 1234 + seq,
    creditCost: 5,
    outputMimeType: "image/jpeg",
    providerSource: "pollinations",
    origin: "studio",
    ...overrides,
  };
}

export function makeCamera(overrides: Partial<CameraMotionSettings> = {}): CameraMotionSettings {
  return {
    preset: "orbit",
    pan: 20,
    tilt: 0,
    zoom: 15,
    dolly: 0,
    orbit: 120,
    roll: 0,
    focalLength: "50mm",
    aperture: "f/1.4",
    ...overrides,
  };
}

export function makeMarketing(overrides: Partial<MarketingSettings> = {}): MarketingSettings {
  return {
    template: "ugc-review",
    tone: "energetic",
    format: "9:16",
    productName: "Nimbus Runner",
    productUrl: "https://shop.example.com/products/nimbus-runner",
    headline: "Meet Nimbus Runner.",
    subheadline: "Built for people who move fast.",
    cta: "Get yours today",
    accent: "#10b981",
    secondary: "#22d3ee",
    ...overrides,
  };
}

export function makeLipsync(overrides: Partial<LipSyncSettings> = {}): LipSyncSettings {
  return {
    mode: "script",
    script: "Hello from FluxFrame.",
    expression: 60,
    amplitude: 70,
    captions: true,
    ...overrides,
  };
}

export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

/** A promise whose settlement the test controls. */
export function deferred<T = void>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Lets pending microtasks (and any 0ms timers) run. */
export function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export interface FakeAudioOptions {
  durationSec?: number;
  sampleRate?: number;
  /** Length of each alternating burst / silence block, in seconds. */
  burstSec?: number;
  amplitude?: number;
}

/**
 * A hand-built object with just the `AudioBuffer` surface `computeEnvelope`
 * touches — happy-dom has no Web Audio implementation. The waveform is an
 * alternating square burst / silence pattern so the envelope is predictable.
 */
export function makeAudioBuffer(options: FakeAudioOptions = {}): AudioBuffer {
  const durationSec = options.durationSec ?? 2;
  const sampleRate = options.sampleRate ?? 8000;
  const burstSec = options.burstSec ?? 0.5;
  const amplitude = options.amplitude ?? 1;
  const length = Math.round(durationSec * sampleRate);
  const data = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const inBurst = Math.floor(i / sampleRate / burstSec) % 2 === 0;
    if (inBurst) data[i] = Math.floor(i / 8) % 2 === 0 ? amplitude : -amplitude;
  }
  const buffer = {
    duration: durationSec,
    sampleRate,
    numberOfChannels: 1,
    length,
    getChannelData: () => data,
  };
  return buffer as unknown as AudioBuffer;
}

/** A minimal `File` stand-in for validators that only read name/type/size. */
export function fakeFile(name: string, type: string, size: number): File {
  return { name, type, size } as unknown as File;
}

/** A Response carrying an image blob, for fetch stubs. */
export function imageResponse(status = 200, contentType = "image/jpeg", bytes = 256): Response {
  const blob = new Blob([new Uint8Array(bytes)], { type: contentType });
  return new Response(blob, { status, headers: { "content-type": contentType } });
}

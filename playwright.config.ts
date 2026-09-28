import { defineConfig, devices } from "@playwright/test";
import type { PlaywrightTestProject } from "@playwright/test";

/**
 * Playwright configuration for FluxFrame.
 *
 * Projects
 *  - chromium  desktop 1360x860; runs every spec except `*.mobile.spec.ts` and `e2e/demo/`
 *  - mobile    Pixel 7 emulation on Chromium; runs `*.mobile.spec.ts` only
 *  - demo      only when `DEMO=1`; 1440x900 with video always on (used by `npm run demo:record`)
 *
 * The Vite dev server (or `vite preview` on CI, after `npm run build`) is started on
 * http://127.0.0.1:4173 automatically. `npx playwright test --list` never starts it.
 */
const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const isCI = Boolean(process.env.CI);
const isDemo = process.env.DEMO === "1";

/** Autoplay without gestures (video players) and fake camera/mic (no permission prompts). */
const CHROMIUM_ARGS = [
  "--autoplay-policy=no-user-gesture-required",
  "--use-fake-ui-for-media-stream",
  "--use-fake-device-for-media-stream",
];

const MOBILE_SPECS = /\.mobile\.spec\.ts$/;
const DEMO_SPECS = /[\\/]e2e[\\/]demo[\\/].*\.spec\.ts$/;

const demoProject: PlaywrightTestProject = {
  name: "demo",
  testMatch: DEMO_SPECS,
  retries: 0,
  fullyParallel: false,
  use: {
    browserName: "chromium",
    channel: "chromium",
    viewport: { width: 1440, height: 900 },
    video: { mode: "on", size: { width: 1440, height: 900 } },
  },
};

export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // Demo recordings are captured sequentially on a single worker.
  workers: isDemo ? 1 : isCI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    // "retain-on-failure" records a trace and a video for every test and deletes
    // them again on success. Under parallel workers that record-then-delete churn
    // races with context teardown and throws ENOENT from the trace writer, which
    // surfaces as flaky failures with no assertion error. Capturing on retry
    // instead removes the churn and still yields diagnostics for any real failure
    // (CI retries twice; locally, re-run with `--trace on`).
    trace: "on-first-retry",
    video: "on-first-retry",
    screenshot: "only-on-failure",
    viewport: { width: 1360, height: 860 },
    colorScheme: "dark",
    permissions: [],
    ignoreHTTPSErrors: true,
    launchOptions: { args: CHROMIUM_ARGS },
  },
  projects: [
    {
      name: "chromium",
      testIgnore: [MOBILE_SPECS, DEMO_SPECS],
      // The "chromium" channel is the full Chromium build in new-headless mode, which has
      // the same canvas/MediaRecorder behaviour as headed Chrome (the studios render video).
      use: { browserName: "chromium", channel: "chromium" },
    },
    {
      name: "mobile",
      testMatch: MOBILE_SPECS,
      testIgnore: DEMO_SPECS,
      use: { ...devices["Pixel 7"], browserName: "chromium", channel: "chromium" },
    },
    ...(isDemo ? [demoProject] : []),
  ],
  webServer: {
    // `--host 127.0.0.1` keeps the server on the same loopback address as `baseURL`
    // regardless of how Node resolves "localhost" on the machine.
    command: isCI
      ? `npm run preview -- --host 127.0.0.1 --port ${PORT} --strictPort`
      : `npm run dev -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});

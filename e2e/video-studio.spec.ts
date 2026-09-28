import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { FIXTURES, checkA11y, gotoApp, mockPollinations, resetStorage, uploadToDropzone, waitForJobComplete } from "./helpers";

const PROMPT = "A lone climber on a granite ridge at first light, clouds drifting through the valley below";

/** Clips render in real time, so every spec uses the shortest duration (3 s). */
const RENDER_TIMEOUT_MS = 90_000;

const outputCanvas = (page: Page) => page.getByTestId("output-canvas");
const outputVideo = (page: Page) => outputCanvas(page).getByTestId("output-video");
const queuePanel = (page: Page) => outputCanvas(page).getByTestId("queue-panel");

/** Waits until the rendered <video> reports a real duration and returns it (seconds). */
async function clipDuration(video: Locator): Promise<number> {
  await expect
    .poll(
      async () => {
        const value = await video.evaluate((element) => (element as HTMLVideoElement).duration);
        return Number.isFinite(value) && value > 0 ? value : null;
      },
      { timeout: 20_000, message: "The rendered clip never reported a finite duration" },
    )
    .not.toBeNull();
  return video.evaluate((element) => (element as HTMLVideoElement).duration);
}

/** Uploads the keyframe fixture and waits for its preview to appear in the dropzone. */
async function uploadKeyframe(page: Page): Promise<void> {
  await uploadToDropzone(page, "keyframe-dropzone", FIXTURES.keyframe);
  await expect(page.getByTestId("keyframe-dropzone").locator("img")).toBeVisible();
}

test.describe("Video Studio", () => {
  test("renders a real clip from a prompt through the motion engine", async ({ page }) => {
    test.setTimeout(120_000);
    await resetStorage(page);
    const mock = await mockPollinations(page);
    await gotoApp(page, "/create/video");

    await page.getByTestId("prompt-input").fill(PROMPT);
    await page.getByTestId("duration-3").click();
    await page.getByTestId("ratio-16:9").click();
    await expect(page.getByTestId("duration-3")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("ratio-16:9")).toHaveAttribute("aria-pressed", "true");

    await page.getByTestId("generate-button").click();
    await expect(queuePanel(page)).toBeVisible();
    await waitForJobComplete(page, RENDER_TIMEOUT_MS);

    const video = outputVideo(page);
    await expect(video).toBeVisible();
    await expect(video).toHaveAttribute("src", /^blob:/);

    // A real 3 s file: MediaRecorder timing drifts a little, so allow 2–5 s.
    const duration = await clipDuration(video);
    expect(duration).toBeGreaterThanOrEqual(2);
    expect(duration).toBeLessThanOrEqual(5);

    await expect(outputCanvas(page).getByTestId("provider-badge")).toHaveAttribute("data-provider", "motion-engine");
    // Exactly one keyframe request; the clip itself is rendered in the browser.
    expect(mock.requests).toHaveLength(1);
  });

  test("animates an uploaded keyframe without calling the image endpoint", async ({ page }) => {
    test.setTimeout(120_000);
    await resetStorage(page);
    const mock = await mockPollinations(page);
    await gotoApp(page, "/create/video");

    await expect(page.getByTestId("generate-button")).toBeDisabled();
    await uploadKeyframe(page);
    // A keyframe alone is enough — no prompt required.
    await expect(page.getByTestId("prompt-input")).toHaveValue("");
    await expect(page.getByTestId("generate-button")).toBeEnabled();

    await page.getByTestId("duration-3").click();
    await page.getByTestId("generate-button").click();
    await expect(queuePanel(page)).toBeVisible();
    await waitForJobComplete(page, RENDER_TIMEOUT_MS);

    await expect(outputVideo(page)).toBeVisible();
    expect(mock.requests).toHaveLength(0);
  });

  test("downloads the rendered clip as a real video file", async ({ page }) => {
    test.setTimeout(120_000);
    await resetStorage(page);
    await mockPollinations(page);
    await gotoApp(page, "/create/video");

    await uploadKeyframe(page);
    await page.getByTestId("duration-3").click();
    await page.getByTestId("generate-button").click();
    await waitForJobComplete(page, RENDER_TIMEOUT_MS);
    await expect(outputVideo(page)).toBeVisible();

    const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("download-button").click()]);
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.(webm|mp4)$/);
    expect(filename).toMatch(/^fluxframe-/);
  });

  test("prefills prompt, engine, ratio, duration and camera from the query string", async ({ page }) => {
    await resetStorage(page);
    await mockPollinations(page);
    await gotoApp(page, "/create/video?prompt=Drone%20over%20dunes&model=anime-flux-motion&ratio=9:16&duration=10&camera=crane-up");

    await expect(page.getByTestId("prompt-input")).toHaveValue("Drone over dunes");
    await expect(page.getByTestId("model-selector-trigger")).toContainText("Anime Flux Motion");
    await expect(page.getByTestId("ratio-9:16")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("duration-10")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("camera-preset-crane-up")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("generate-button")).toContainText("15 credits");
  });

  test("has no critical or serious accessibility violations", async ({ page }) => {
    await resetStorage(page);
    await mockPollinations(page);
    await gotoApp(page, "/create/video");
    await expect(page.getByTestId("keyframe-dropzone")).toBeVisible();
    await checkA11y(page);
  });
});

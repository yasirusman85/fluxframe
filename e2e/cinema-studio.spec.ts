import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { checkA11y, gotoApp, mockPollinations, resetStorage, waitForJobComplete } from "./helpers";

const PROMPT = "Rain-slick neon street, a vintage coupé drifting through the corner, reflections streaking across the asphalt";

/** Clips render in real time, so every spec uses the shortest duration (3 s). */
const RENDER_TIMEOUT_MS = 90_000;

const outputCanvas = (page: Page) => page.getByTestId("output-canvas");
const outputVideo = (page: Page) => outputCanvas(page).getByTestId("output-video");
const queuePanel = (page: Page) => outputCanvas(page).getByTestId("queue-panel");

/** Digits of the header credits pill ("1,000 credits" → 1000). */
async function readCredits(page: Page): Promise<number> {
  const pill = page.getByTestId("credits-pill");
  await expect(pill).toContainText(/\d/);
  return Number((await pill.innerText()).replace(/[^\d]/g, ""));
}

/** Credit cost shown on the generate button ("Generate · 30 credits" → 30). */
async function readCost(page: Page): Promise<number> {
  const label = await page.getByTestId("generate-button").innerText();
  return Number(label.replace(/[^\d]/g, ""));
}

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

test.describe("Cinema Studio", () => {
  test("camera presets, axis sliders and lens optics drive the shot sheet", async ({ page }) => {
    await resetStorage(page);
    await mockPollinations(page);
    await gotoApp(page, "/create/cinema");

    await page.getByTestId("camera-preset-orbit").click();
    await expect(page.getByTestId("camera-preset-orbit")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("camera-slider-orbit")).toHaveValue("120");

    // Touching an axis makes the move custom, so the preset chip releases.
    await page.getByTestId("camera-slider-pan").fill("30");
    await expect(page.getByTestId("camera-slider-pan")).toHaveValue("30");
    await expect(page.getByTestId("camera-preset-orbit")).not.toHaveAttribute("aria-pressed", "true");

    await page.getByTestId("focal-85mm").click();
    await page.getByTestId("aperture-1.4").click();
    await expect(page.getByTestId("focal-85mm")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("aperture-1.4")).toHaveAttribute("aria-pressed", "true");

    const shotSheet = page.getByTestId("shot-sheet");
    await expect(shotSheet).toContainText("orbit");
    await expect(shotSheet).toContainText("85mm");
  });

  test("prefills prompt, camera preset, ratio, duration and engine from the query string", async ({ page }) => {
    await resetStorage(page);
    await mockPollinations(page);
    await gotoApp(page, "/create/cinema?prompt=Test%20shot&camera=fpv-dive&ratio=21:9&duration=3&model=google-veo-3");

    await expect(page.getByTestId("prompt-input")).toHaveValue("Test shot");
    await expect(page.getByTestId("camera-preset-fpv-dive")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("ratio-21:9")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("duration-3")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("model-selector-trigger")).toContainText("Veo 3.1 Pro");
  });

  test("renders a real 21:9 sequence with the chosen camera move", async ({ page }) => {
    test.setTimeout(120_000);
    await resetStorage(page);
    await mockPollinations(page);
    await gotoApp(page, "/create/cinema");

    await page.getByTestId("prompt-input").fill(PROMPT);
    await page.getByTestId("ratio-21:9").click();
    await page.getByTestId("duration-3").click();
    await page.getByTestId("camera-preset-tracking").click();

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
  });

  test("cancelling a running job stops it and keeps the credits it already charged", async ({ page }) => {
    test.setTimeout(120_000);
    await resetStorage(page);
    // A slow keyframe response keeps the job in flight long enough to cancel it.
    await mockPollinations(page, { delayMs: 4000 });
    await gotoApp(page, "/create/cinema");

    const creditsBefore = await readCredits(page);
    const cost = await readCost(page);
    expect(cost).toBeGreaterThan(0);

    await page.getByTestId("prompt-input").fill(PROMPT);
    await page.getByTestId("duration-3").click();
    await page.getByTestId("generate-button").click();

    const panel = queuePanel(page);
    await expect(panel).toHaveAttribute("data-status", "processing");
    const creditsWhileRunning = await readCredits(page);
    expect(creditsWhileRunning).toBe(creditsBefore - cost);

    await panel.getByTestId("queue-cancel").click();
    await expect(panel).toHaveAttribute("data-status", "cancelled");
    await expect(panel.getByTestId("queue-retry")).toBeVisible();

    // Cancelling does not refund — only failures do.
    expect(await readCredits(page)).toBe(creditsWhileRunning);
  });

  test("has no critical or serious accessibility violations", async ({ page }) => {
    await resetStorage(page);
    await mockPollinations(page);
    await gotoApp(page, "/create/cinema");
    await expect(page.getByTestId("shot-sheet")).toBeVisible();
    await checkA11y(page);
  });
});

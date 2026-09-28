import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { FIXTURES, checkA11y, gotoApp, mockPollinations, resetStorage, uploadToDropzone, waitForJobComplete } from "./helpers";

/**
 * LipSync clips are recorded by MediaRecorder in real time (a 5 s clip takes 5 s),
 * so the rendering specs get a generous timeout.
 */
const RENDER_TIMEOUT = 150_000;

/** Two short sentences: long enough for a >2 s clip, short enough to render quickly. */
const SCRIPT = "FluxFrame renders this portrait in your browser. No servers, no uploads.";

const outputBadge = (page: Page) => page.getByTestId("output-canvas").getByTestId("provider-badge");

/** `<video>.duration` in seconds, or 0 while the browser has not read the metadata yet. */
async function outputDuration(page: Page): Promise<number> {
  return page.getByTestId("output-video").evaluate((el) => {
    const { duration } = el as HTMLVideoElement;
    return Number.isFinite(duration) ? duration : 0;
  });
}

test.describe("LipSync Studio", () => {
  test("script mode renders a talking portrait from an uploaded portrait", async ({ page }) => {
    test.setTimeout(RENDER_TIMEOUT);
    await resetStorage(page);
    const mock = await mockPollinations(page);
    await gotoApp(page, "/create/lipsync");

    await uploadToDropzone(page, "portrait-dropzone", FIXTURES.portrait);
    await expect(page.getByTestId("portrait-dropzone").locator("img")).toBeVisible();

    // Calibrate the mouth line (the fixture's mouth sits slightly above the default).
    const mouthY = page.getByTestId("mouth-y-slider");
    await mouthY.fill("0.6");
    await expect(mouthY).toHaveValue("0.6");

    await page.getByTestId("script-input").fill(SCRIPT);
    await expect(page.getByTestId("generate-button")).toContainText("credits");

    await page.getByTestId("generate-button").click();
    await expect(page.getByTestId("queue-panel")).toBeVisible();
    await waitForJobComplete(page, 120_000);

    const video = page.getByTestId("output-video");
    await expect(video).toBeVisible();
    await expect.poll(() => outputDuration(page), { timeout: 20_000, message: "the recorded clip should report a real duration" }).toBeGreaterThanOrEqual(2);
    expect(await video.evaluate((el) => Number.isFinite((el as HTMLVideoElement).duration))).toBe(true);
    await expect(outputBadge(page)).toHaveAttribute("data-provider", "lipsync-engine");

    // The portrait came from the upload, so nothing had to be generated.
    expect(mock.requests).toHaveLength(0);
  });

  test("audio mode uses the uploaded track and generates the missing portrait", async ({ page }) => {
    test.setTimeout(RENDER_TIMEOUT);
    await resetStorage(page);
    const mock = await mockPollinations(page);
    await gotoApp(page, "/create/lipsync");

    await page.getByTestId("lipsync-mode-audio").click();
    await expect(page.getByTestId("audio-dropzone")).toBeVisible();
    await expect(page.getByTestId("generate-button")).toBeDisabled();

    await uploadToDropzone(page, "audio-dropzone", FIXTURES.speech);
    // The fixture is a 3 s WAV, decoded in the browser before it is stored.
    await expect(page.getByText("0:03", { exact: true })).toBeVisible();

    await page.getByTestId("generate-button").click();
    await waitForJobComplete(page, 120_000);

    await expect(outputBadge(page)).toHaveAttribute("data-provider", "lipsync-engine");
    // Chromium exposes no reliable way to inspect the audio track of a blob-backed <video>,
    // so we assert the clip length matches the uploaded audio instead.
    await expect.poll(() => outputDuration(page), { timeout: 20_000 }).toBeGreaterThanOrEqual(2.5);

    // No portrait was uploaded → exactly one Pollinations image for the generated portrait.
    expect(mock.requests).toHaveLength(1);
  });

  test("dragging the mouth marker moves both calibration sliders", async ({ page }) => {
    await resetStorage(page);
    await mockPollinations(page);
    await gotoApp(page, "/create/lipsync");

    await uploadToDropzone(page, "portrait-dropzone", FIXTURES.portrait);
    const calibrator = page.getByTestId("mouth-calibrator");
    await expect(calibrator).toBeVisible();
    const box = await calibrator.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Press at 30% / 75%, drag to 40% / 60%, release.
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.75);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.6);
    await page.mouse.up();

    expect(Number(await page.getByTestId("mouth-x-slider").inputValue())).toBeCloseTo(0.4, 1);
    expect(Number(await page.getByTestId("mouth-y-slider").inputValue())).toBeCloseTo(0.6, 1);
  });

  test("the voice preview needs speech synthesis and a script", async ({ page }) => {
    await resetStorage(page);
    await mockPollinations(page);
    await gotoApp(page, "/create/lipsync");

    const speechSupported = await page.evaluate(() => "speechSynthesis" in window);
    const preview = page.getByTestId("speak-preview");

    await expect(preview).toBeDisabled();
    await page.getByTestId("script-input").fill("Hello from FluxFrame.");
    if (speechSupported) await expect(preview).toBeEnabled();
    else await expect(preview).toBeDisabled();

    await page.getByTestId("script-input").fill("   ");
    await expect(preview).toBeDisabled();
  });

  test("prefills the script from the query string", async ({ page }) => {
    await resetStorage(page);
    await mockPollinations(page);
    await gotoApp(page, "/create/lipsync?script=Welcome%20to%20FluxFrame.&ratio=9:16");

    await expect(page.getByTestId("script-input")).toHaveValue("Welcome to FluxFrame.");
    await expect(page.getByTestId("ratio-9:16")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("generate-button")).toBeEnabled();
  });

  test("has no critical or serious accessibility violations", async ({ page }) => {
    await resetStorage(page);
    await mockPollinations(page);
    await gotoApp(page, "/create/lipsync");
    await checkA11y(page);

    await page.getByTestId("lipsync-mode-audio").click();
    await expect(page.getByTestId("audio-dropzone")).toBeVisible();
    await checkA11y(page);
  });
});

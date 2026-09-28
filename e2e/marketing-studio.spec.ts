import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { FIXTURES, checkA11y, gotoApp, mockPollinations, resetStorage, uploadToDropzone, waitForJobComplete } from "./helpers";

/** Ads are recorded by MediaRecorder in real time (~9 s of video per template). */
const RENDER_TIMEOUT = 150_000;

const PRODUCT_URL = "https://shop.example.com/products/aurora-desk-lamp-2024";
const PRODUCT_NAME = "Aurora Desk Lamp";

const outputBadge = (page: Page) => page.getByTestId("output-canvas").getByTestId("provider-badge");

/** `<video>.duration` in seconds, or 0 while the browser has not read the metadata yet. */
async function outputDuration(page: Page): Promise<number> {
  return page.getByTestId("output-video").evaluate((el) => {
    const { duration } = el as HTMLVideoElement;
    return Number.isFinite(duration) ? duration : 0;
  });
}

test.describe("Marketing Studio", () => {
  test("reads the product name from a store URL slug", async ({ page }) => {
    await resetStorage(page);
    await mockPollinations(page);
    await gotoApp(page, "/create/marketing");

    await expect(page.getByTestId("generate-button")).toBeDisabled();
    await page.getByTestId("product-url-input").fill(PRODUCT_URL);

    await expect(page.getByTestId("product-name-input")).toHaveValue(PRODUCT_NAME);
    await expect(page.getByTestId("generate-button")).toBeEnabled();
    // The auto-filled copy follows the name.
    await expect(page.getByTestId("ad-headline-input")).toHaveValue(`Meet ${PRODUCT_NAME}.`);
  });

  test("tone drives the copy but hand-written fields survive a tone switch", async ({ page }) => {
    await resetStorage(page);
    await mockPollinations(page);
    await gotoApp(page, "/create/marketing");

    await page.getByTestId("product-name-input").fill(PRODUCT_NAME);
    await page.getByTestId("ad-tone-luxury").click();
    await expect(page.getByTestId("ad-tone-luxury")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("ad-cta-input")).toHaveValue("Discover the collection");

    const headline = page.getByTestId("ad-headline-input");
    await headline.fill("Light that knows when to stop");
    await page.getByTestId("ad-tone-urgent").click();

    // The edited headline is kept; every untouched field follows the new tone.
    await expect(headline).toHaveValue("Light that knows when to stop");
    await expect(page.getByTestId("ad-cta-input")).toHaveValue("Claim the deal");

    // "Reset copy" forgets the manual edit.
    await page.getByRole("button", { name: "Reset copy" }).click();
    await expect(headline).toHaveValue(`${PRODUCT_NAME} — 40% off`);
  });

  test("picking a template switches to the format it was designed for", async ({ page }) => {
    await resetStorage(page);
    await mockPollinations(page);
    await gotoApp(page, "/create/marketing");

    await expect(page.getByTestId("ad-format-9:16")).toHaveAttribute("aria-pressed", "true");

    await page.getByTestId("ad-template-spotlight-360").click();
    await expect(page.getByTestId("ad-template-spotlight-360")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("ad-format-16:9")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("ad-format-9:16")).toHaveAttribute("aria-pressed", "false");

    // The storyboard follows the template (4 scenes for the spotlight).
    await expect(page.getByTestId("ad-storyboard").getByRole("listitem").filter({ hasText: "Call to action" })).toHaveCount(1);
  });

  test("renders a multi-scene ad from an uploaded packshot", async ({ page }) => {
    test.setTimeout(RENDER_TIMEOUT);
    await resetStorage(page);
    const mock = await mockPollinations(page);
    await gotoApp(page, "/create/marketing");

    await page.getByTestId("product-name-input").fill(PRODUCT_NAME);
    await uploadToDropzone(page, "packshot-dropzone", FIXTURES.packshot);
    await expect(page.getByTestId("packshot-dropzone").locator("img")).toBeVisible();

    await page.getByTestId("ad-template-unboxing-reveal").click();
    await expect(page.getByTestId("generate-button")).toContainText("25 credits");

    await page.getByTestId("generate-button").click();
    await expect(page.getByTestId("queue-panel")).toBeVisible();
    await waitForJobComplete(page, 120_000);

    await expect(outputBadge(page)).toHaveAttribute("data-provider", "ad-engine");
    // Cinematic Reveal is 3 scenes / 9 s of video.
    await expect.poll(() => outputDuration(page), { timeout: 20_000, message: "the recorded ad should be about 9 s long" }).toBeGreaterThan(7);
    expect(await outputDuration(page)).toBeLessThan(11);

    // The packshot came from the upload, so nothing had to be generated.
    expect(mock.requests).toHaveLength(0);
  });

  test("generates a packshot when none is uploaded", async ({ page }) => {
    test.setTimeout(RENDER_TIMEOUT);
    await resetStorage(page);
    const mock = await mockPollinations(page);
    await gotoApp(page, "/create/marketing");

    await page.getByTestId("product-name-input").fill(PRODUCT_NAME);
    await page.getByTestId("ad-template-unboxing-reveal").click();
    await page.getByTestId("generate-button").click();
    await waitForJobComplete(page, 120_000);

    await expect(outputBadge(page)).toHaveAttribute("data-provider", "ad-engine");
    expect(mock.requests).toHaveLength(1);
    expect(decodeURIComponent(mock.requests[0])).toContain(PRODUCT_NAME);
  });

  test("has no critical or serious accessibility violations", async ({ page }) => {
    await resetStorage(page);
    await mockPollinations(page);
    await gotoApp(page, "/create/marketing");
    await page.getByTestId("product-name-input").fill(PRODUCT_NAME);
    await checkA11y(page);
  });
});

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { checkA11y, gotoApp, mockPollinations, resetStorage, waitForJobComplete } from "./helpers";

const PROMPT = "A red fox crossing a frozen lake at dawn, low sun, long shadows";

/** Digits of the header credits pill ("1,000 credits" → 1000). */
async function readCredits(page: Page): Promise<number> {
  const pill = page.getByTestId("credits-pill");
  await expect(pill).toContainText(/\d/);
  return Number((await pill.innerText()).replace(/[^\d]/g, ""));
}

async function readCost(page: Page): Promise<number> {
  const label = await page.getByTestId("generate-button").innerText();
  return Number(label.replace(/[^\d]/g, ""));
}

const outputBadge = (page: Page) => page.getByTestId("output-canvas").getByTestId("provider-badge");

test.describe("Image Studio", () => {
  test("generates a real image through Pollinations", async ({ page }) => {
    test.setTimeout(60_000);
    await resetStorage(page);
    const mock = await mockPollinations(page, { delayMs: 1200 });
    await gotoApp(page, "/create/image");

    const creditsBefore = await readCredits(page);
    await page.getByTestId("prompt-input").fill(PROMPT);
    await page.getByTestId("ratio-1:1").click();
    await page.getByTestId("quality-high").click();
    await expect(page.getByTestId("ratio-1:1")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("quality-high")).toHaveAttribute("aria-pressed", "true");
    const cost = await readCost(page);
    expect(cost).toBeGreaterThan(0);

    await page.getByTestId("generate-button").click();
    await expect(page.getByTestId("queue-panel")).toBeVisible();
    await waitForJobComplete(page);

    const output = page.getByTestId("output-image");
    await expect(output).toBeVisible();
    await expect(output).toHaveAttribute("src", /^blob:/);
    await expect.poll(() => output.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(outputBadge(page)).toHaveAttribute("data-provider", "pollinations");

    await expect.poll(() => readCredits(page)).toBe(creditsBefore - cost);

    expect(mock.requests.length).toBeGreaterThanOrEqual(1);
    const request = mock.requests[mock.requests.length - 1];
    expect(request).toContain("width=1024&height=1024");
    expect(decodeURIComponent(request)).toContain("A red fox crossing a frozen lake");
  });

  test("Ctrl/Cmd+Enter in the prompt starts a generation", async ({ page }) => {
    test.setTimeout(60_000);
    await resetStorage(page);
    await mockPollinations(page, { delayMs: 1200 });
    await gotoApp(page, "/create/image");

    const input = page.getByTestId("prompt-input");
    await input.fill(PROMPT);
    await input.press("ControlOrMeta+Enter");
    await expect(page.getByTestId("queue-panel")).toBeVisible();
    await waitForJobComplete(page);
    await expect(page.getByTestId("output-image")).toHaveAttribute("src", /^blob:/);
  });

  test("keeps Generate disabled until there is a prompt", async ({ page }) => {
    await resetStorage(page);
    await mockPollinations(page);
    await gotoApp(page, "/create/image");

    const button = page.getByTestId("generate-button");
    await expect(button).toBeDisabled();
    await page.getByTestId("prompt-input").fill("x");
    await expect(button).toBeEnabled();
    await page.getByTestId("prompt-input").fill("   ");
    await expect(button).toBeDisabled();
  });

  test("recovers from a 403 rate limit by waiting and retrying", async ({ page }) => {
    test.setTimeout(90_000);
    await resetStorage(page);
    const mock = await mockPollinations(page, { failTimes: 1, status: 403 });
    await gotoApp(page, "/create/image");

    await page.getByTestId("prompt-input").fill(PROMPT);
    await page.getByTestId("generate-button").click();
    await expect(page.getByTestId("queue-panel")).toBeVisible();
    // The client backs off for the 15 s anonymous window before the second attempt.
    await waitForJobComplete(page, 80_000);

    await expect(outputBadge(page)).toHaveAttribute("data-provider", "pollinations");
    await expect(page.getByTestId("output-image")).toHaveAttribute("src", /^blob:/);
    expect(mock.requests).toHaveLength(2);
  });

  test("falls back to the procedural renderer when the endpoint keeps failing", async ({ page }) => {
    test.setTimeout(60_000);
    await resetStorage(page);
    const mock = await mockPollinations(page, { failTimes: 10, status: 500 });
    await gotoApp(page, "/create/image");

    await page.getByTestId("prompt-input").fill(PROMPT);
    await page.getByTestId("generate-button").click();
    await waitForJobComplete(page, 50_000);

    await expect(outputBadge(page)).toHaveAttribute("data-provider", "procedural");
    await expect(page.getByTestId("output-image")).toBeVisible();
    expect(mock.requests.length).toBeGreaterThanOrEqual(1);
  });

  test("downloads the generated image as a real .jpg file", async ({ page }) => {
    test.setTimeout(60_000);
    await resetStorage(page);
    await mockPollinations(page);
    await gotoApp(page, "/create/image");

    await page.getByTestId("prompt-input").fill(PROMPT);
    await page.getByTestId("generate-button").click();
    await waitForJobComplete(page);
    await expect(page.getByTestId("output-image")).toHaveAttribute("src", /^blob:/);

    const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("download-button").click()]);
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.jpg$/);
    expect(filename).toMatch(/^fluxframe-/);
  });

  test("prefills prompt, ratio and model from the query string", async ({ page }) => {
    await resetStorage(page);
    await mockPollinations(page);
    await gotoApp(page, "/create/image?prompt=Hello%20world&ratio=9:16&model=studio-cinema-xl");

    await expect(page.getByTestId("prompt-input")).toHaveValue("Hello world");
    await expect(page.getByTestId("ratio-9:16")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("model-selector-trigger")).toContainText("Studio Cinema XL");
    await expect(page.getByTestId("generate-button")).toContainText("8 credits");
  });

  test("ignores unknown model and ratio parameters", async ({ page }) => {
    await resetStorage(page);
    await mockPollinations(page);
    await gotoApp(page, "/create/image?prompt=Hi&ratio=5:7&model=does-not-exist");

    await expect(page.getByTestId("prompt-input")).toHaveValue("Hi");
    await expect(page.getByTestId("ratio-16:9")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("model-selector-trigger")).toContainText("Flux Realism v2");
  });

  test("advanced panel exposes negative prompt and seed", async ({ page }) => {
    await resetStorage(page);
    await mockPollinations(page);
    await gotoApp(page, "/create/image");

    const toggle = page.getByTestId("advanced-toggle");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId("negative-prompt-input")).toBeVisible();

    const seed = page.getByTestId("seed-input");
    await expect(seed).toHaveAttribute("placeholder", "Random");
    await page.getByRole("button", { name: "Randomize seed" }).click();
    await expect(seed).toHaveValue(/^\d+$/);
  });

  test("has no critical or serious accessibility violations", async ({ page }) => {
    await resetStorage(page);
    await mockPollinations(page);
    await gotoApp(page, "/create/image");
    await page.getByTestId("advanced-toggle").click();
    await expect(page.getByTestId("seed-input")).toBeVisible();
    await checkA11y(page);
  });
});

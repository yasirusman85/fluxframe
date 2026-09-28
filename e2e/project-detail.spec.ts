import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { checkA11y, expectToast, gotoApp, mockPollinations, resetStorage } from "./helpers";

/**
 * These specs run against the six sample projects the store seeds into empty
 * storage (src/lib/samples.ts): ids are `sample-<showcase id>`, the first two
 * ("Obsidian Valkyrie", "Neo-Tokyo Detective") are favorites and every sample
 * output is a static `/showcase/*.jpg`.
 */
const VALKYRIE = "/projects/sample-valkyrie";
const SAMPLE_COUNT = 6;

/**
 * The page root mounts with `animate-fade-in` (180 ms). Axe blends every
 * foreground colour with the background using the *current* ancestor opacity,
 * so scanning mid-fade reports false-positive contrast violations. Wait for the
 * finite entry animations (never for spinners/shimmers, which loop forever).
 */
async function settleAnimations(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const entry = document.getAnimations().filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity);
        void Promise.all(entry.map((animation) => animation.finished.catch(() => undefined))).then(() => resolve());
        setTimeout(resolve, 1_000);
      }),
  );
}

async function scanA11y(page: Page): Promise<void> {
  await settleAnimations(page);
  await checkA11y(page);
}

test.beforeEach(async ({ page }) => {
  await resetStorage(page);
  await mockPollinations(page);
});

test.describe("Project detail", () => {
  test("opens from a library card and shows the project", async ({ page }) => {
    await gotoApp(page, "/projects");

    const card = page.getByTestId("media-card").filter({ hasText: "Obsidian Valkyrie" }).first();
    await card.getByRole("link", { name: /Open Obsidian Valkyrie/i }).click();

    await expect(page).toHaveURL(/\/projects\/sample-valkyrie$/);
    await expect(page.getByTestId("project-title")).toHaveText("Obsidian Valkyrie");
    await expect(page.getByTestId("project-status")).toHaveText("Completed");
    await expect(page.getByTestId("project-prompt")).toContainText("cybernetic");
    await expect(page.getByTestId("project-image")).toBeVisible();
  });

  test("renames inline and keeps the new title after a reload", async ({ page }) => {
    await gotoApp(page, VALKYRIE);

    await page.getByTestId("project-rename").click();
    const input = page.getByTestId("project-rename-input");
    await expect(input).toBeFocused();
    await input.fill("Valkyrie v2");
    await input.press("Enter");

    await expect(page.getByTestId("project-title")).toHaveText("Valkyrie v2");

    await page.reload();
    await expect(page.getByTestId("project-title")).toHaveText("Valkyrie v2");
  });

  test("Escape cancels a rename", async ({ page }) => {
    await gotoApp(page, VALKYRIE);

    await page.getByTestId("project-rename").click();
    const input = page.getByTestId("project-rename-input");
    await input.fill("Discard me");
    await input.press("Escape");

    await expect(page.getByTestId("project-title")).toHaveText("Obsidian Valkyrie");
  });

  test("toggles the favorite, from the button and from the keyboard", async ({ page }) => {
    await gotoApp(page, VALKYRIE);

    const favorite = page.getByTestId("project-favorite");
    await expect(favorite).toHaveAttribute("aria-pressed", "true");

    await favorite.click();
    await expect(favorite).toHaveAttribute("aria-pressed", "false");

    // "f" is a page shortcut (ignored while typing).
    await page.keyboard.press("f");
    await expect(favorite).toHaveAttribute("aria-pressed", "true");
  });

  test("copies a share link and reports it in a toast", async ({ page }) => {
    await gotoApp(page, VALKYRIE);

    await page.getByTestId("project-share").click();
    await expectToast(page, /Link copied|Copy this link/i);
  });

  test("opens the project back in its studio with the prompt prefilled", async ({ page }) => {
    await gotoApp(page, VALKYRIE);

    await page.getByTestId("project-remix").click();

    await expect(page).toHaveURL(/\/create\/image\?/);
    await expect(page.getByTestId("prompt-input")).toHaveValue(/cybernetic warrior/i);
  });

  test("downloads the output as a real file", async ({ page }) => {
    test.setTimeout(45_000);
    await gotoApp(page, VALKYRIE);

    // The sample output is a same-origin /showcase/*.jpg: it normally downloads as a
    // blob, but a blocked fetch falls back to opening the file in a new tab.
    const download = page.waitForEvent("download", { timeout: 20_000 }).catch(() => null);
    const popup = page.waitForEvent("popup", { timeout: 20_000 }).catch(() => null);

    await page.getByTestId("project-download").click();

    const result = await Promise.race([
      download.then((event) => (event ? { kind: "download" as const, name: event.suggestedFilename() } : null)),
      popup.then((event) => (event ? { kind: "popup" as const, name: event.url() } : null)),
    ]);

    expect(result, "expected a download event or a popup").not.toBeNull();
    if (result?.kind === "download") expect(result.name).toMatch(/^fluxframe-.*\.jpg$/);
    else expect(result?.name).toMatch(/valkyrie\.jpg$/);
  });

  test("deletes the project after a confirmation and returns to the library", async ({ page }) => {
    await gotoApp(page, "/projects/sample-celestial-dragon");
    await expect(page.getByTestId("project-title")).toHaveText("Celestial Dragon");

    await page.getByTestId("project-delete").click();
    await page.getByTestId("project-delete-confirm").click();

    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByTestId("media-card")).toHaveCount(SAMPLE_COUNT - 1);
    await expect(page.getByTestId("media-card").filter({ hasText: "Celestial Dragon" })).toHaveCount(0);
  });

  test("shows an empty state for an unknown project id", async ({ page }) => {
    await gotoApp(page, "/projects/nope");

    await expect(page.getByTestId("project-not-found")).toBeVisible();
    await page.getByTestId("project-not-found-back").click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByTestId("media-card")).toHaveCount(SAMPLE_COUNT);
  });

  test("has no critical or serious accessibility violations", async ({ page }) => {
    await gotoApp(page, VALKYRIE);
    await expect(page.getByTestId("project-image")).toBeVisible();
    await scanA11y(page);
  });
});

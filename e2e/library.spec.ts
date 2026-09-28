import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { checkA11y, gotoApp, mockPollinations, resetStorage } from "./helpers";

/**
 * With empty storage the project store seeds `SAMPLE_PROJECTS` (src/lib/samples.ts):
 * six completed image projects, of which the first two are favorites.
 */
const SAMPLE_COUNT = 6;
const FAVORITE_COUNT = 2;
/** Alphabetically first sample title — used by the "Title A–Z" sort assertion. */
const FIRST_BY_TITLE = "Celestial Dragon";

const cards = (page: Page) => page.getByTestId("media-card");
const rows = (page: Page) => page.getByTestId("library-row");

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

async function openLibrary(page: Page, path = "/projects"): Promise<void> {
  await resetStorage(page);
  await mockPollinations(page);
  await gotoApp(page, path);
  await expect(page.getByRole("heading", { name: "Library", level: 1 })).toBeVisible();
}

test.describe("Project library", () => {
  test("lists every sample project with live counts", async ({ page }) => {
    await openLibrary(page);

    await expect(cards(page)).toHaveCount(SAMPLE_COUNT);
    await expect(page.getByTestId("library-filter-all")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("library-filter-all")).toContainText(String(SAMPLE_COUNT));
    await expect(page.getByTestId("library-filter-favorites")).toContainText(String(FAVORITE_COUNT));
  });

  test("filters to favorites and writes the filter to the URL", async ({ page }) => {
    await openLibrary(page);

    await page.getByTestId("library-filter-favorites").click();
    await expect(cards(page)).toHaveCount(FAVORITE_COUNT);
    await expect(page).toHaveURL(/\?filter=favorites/);

    // Back to "All" clears the parameter again.
    await page.getByTestId("library-filter-all").click();
    await expect(cards(page)).toHaveCount(SAMPLE_COUNT);
    await expect(page).not.toHaveURL(/filter=/);
  });

  test("preselects the tab from a ?filter deep link", async ({ page }) => {
    await openLibrary(page, "/projects?filter=favorites");

    await expect(page.getByTestId("library-filter-favorites")).toHaveAttribute("aria-selected", "true");
    await expect(cards(page)).toHaveCount(FAVORITE_COUNT);
  });

  test("searches across titles and prompts", async ({ page }) => {
    await openLibrary(page);

    await page.getByTestId("library-search").fill("dragon");
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText(FIRST_BY_TITLE);

    await page.getByTestId("library-search").fill("nothing-matches-this-query");
    await expect(page.getByTestId("library-empty")).toContainText("Nothing matches");

    await page.getByTestId("library-clear-filters").click();
    await expect(cards(page)).toHaveCount(SAMPLE_COUNT);
    await expect(page.getByTestId("library-search")).toHaveValue("");
  });

  test("sorts by title", async ({ page }) => {
    await openLibrary(page);

    await page.getByTestId("library-sort").selectOption("title");
    await expect(cards(page).first()).toContainText(FIRST_BY_TITLE);
  });

  test("remembers the list view across a reload", async ({ page }) => {
    await openLibrary(page);

    await page.getByTestId("library-view-list").click();
    await expect(page.getByTestId("library-view-list")).toHaveAttribute("aria-pressed", "true");
    await expect(rows(page)).toHaveCount(SAMPLE_COUNT);
    await expect(cards(page)).toHaveCount(0);

    await page.reload();

    await expect(page.getByTestId("library-view-list")).toHaveAttribute("aria-pressed", "true");
    await expect(rows(page)).toHaveCount(SAMPLE_COUNT);
  });

  test("bulk-deletes the selected projects after a confirmation", async ({ page }) => {
    await openLibrary(page);

    await page.getByTestId("library-select-toggle").click();
    const checkboxes = page.getByTestId("media-card-select");
    await expect(checkboxes).toHaveCount(SAMPLE_COUNT);
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await expect(page.getByTestId("library-selected-count")).toHaveText("2 selected");

    await page.getByTestId("library-bulk-delete").click();
    await page.getByTestId("library-bulk-delete-confirm").click();

    await expect(cards(page)).toHaveCount(SAMPLE_COUNT - 2);
    await expect(page.getByTestId("library-bulk-delete")).toHaveCount(0);
  });

  test("toggles a favorite straight from a card", async ({ page }) => {
    await openLibrary(page);

    const card = cards(page).filter({ hasText: "Obsidian Valkyrie" }).first();
    const favorite = card.getByTestId("media-card-favorite");

    await expect(favorite).toHaveAttribute("aria-pressed", "true");
    await favorite.click();
    await expect(favorite).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByTestId("library-filter-favorites")).toContainText(String(FAVORITE_COUNT - 1));

    await favorite.click();
    await expect(favorite).toHaveAttribute("aria-pressed", "true");
  });

  test("clears the library and restores the samples", async ({ page }) => {
    await openLibrary(page);

    await page.getByTestId("library-more").click();
    await page.getByTestId("library-clear").click();
    await page.getByTestId("library-clear-confirm").click();

    await expect(page.getByTestId("library-empty")).toBeVisible();
    await expect(page.getByTestId("library-empty")).toContainText("No projects yet");
    await expect(cards(page)).toHaveCount(0);

    await page.getByTestId("library-more").click();
    await page.getByTestId("library-restore-samples").click();

    await expect(cards(page)).toHaveCount(SAMPLE_COUNT);
    await expect(page.getByTestId("library-empty")).toHaveCount(0);
  });

  test("has no critical or serious accessibility violations", async ({ page }) => {
    await openLibrary(page);
    await expect(cards(page)).toHaveCount(SAMPLE_COUNT);
    await scanA11y(page);
  });
});

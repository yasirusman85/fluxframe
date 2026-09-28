import { expect, test } from "@playwright/test";
import { checkA11y, gotoApp, mockPollinations, resetStorage } from "./helpers";

test.describe("Creative Apps", () => {
  test("lists apps, filters by category and validates before running", async ({ page }) => {
    await resetStorage(page);
    const { requests } = await mockPollinations(page);
    await gotoApp(page, "/apps");

    const cards = page.getByTestId(/^app-card-/);
    await expect(cards).toHaveCount(5);

    await page.getByTestId("app-filter-Fashion").click();
    await expect(cards).toHaveCount(2);
    await page.getByTestId("app-filter-All").click();
    await expect(cards).toHaveCount(5);

    await page.getByTestId("app-card-style-snap").click();
    const modal = page.getByTestId("app-run-modal");
    await expect(modal).toBeVisible();
    await expect(modal.getByTestId("app-field-subject")).toBeVisible();

    // Required field left empty: inline error, nothing sent.
    await modal.getByTestId("app-run").click();
    await expect(modal.getByTestId("app-field-subject")).toHaveAttribute("aria-invalid", "true");
    await expect(modal.getByTestId("queue-panel")).toHaveCount(0);
    expect(requests.length).toBe(0);
  });

  test("runs Style Snap and opens the result in the library", async ({ page }) => {
    test.setTimeout(120_000);
    await resetStorage(page);
    const { requests } = await mockPollinations(page);
    await gotoApp(page, "/apps");

    await page.getByTestId("app-card-style-snap").click();
    const modal = page.getByTestId("app-run-modal");
    await modal.getByTestId("app-field-subject").fill("tall man with curly hair and glasses");
    await modal.getByTestId("app-run").click();

    // With the endpoint mocked a single-step app can finish before this assertion
    // runs, so accept either the in-flight queue panel or the finished output.
    const output = modal.getByTestId("app-output");
    await expect(modal.getByTestId("queue-panel").or(output).first()).toBeVisible();
    await expect(output).toBeVisible({ timeout: 60_000 });
    await expect(output).toHaveJSProperty("tagName", "IMG");
    expect(requests.length).toBe(1);

    await modal.getByTestId("app-open-project").click();
    await expect(page).toHaveURL(/\/projects\/[^/?#]+/);
    await expect(page.getByTestId("project-title")).toHaveText(/^Style Snap/);
  });

  test("runs the four-shot storyboard app", async ({ page }) => {
    test.setTimeout(150_000);
    await resetStorage(page);
    const { requests } = await mockPollinations(page);
    await gotoApp(page, "/apps");

    await page.getByTestId("app-card-storyboard").click();
    const modal = page.getByTestId("app-run-modal");
    await modal.getByTestId("app-field-logline").fill("A lighthouse keeper discovers a message in a bottle during a storm");
    await modal.getByTestId("app-run").click();

    await expect(modal.getByTestId("app-output")).toBeVisible({ timeout: 120_000 });
    expect(requests.length).toBe(4);
  });

  test("has no serious accessibility violations", async ({ page }) => {
    await resetStorage(page);
    await mockPollinations(page);
    await gotoApp(page, "/apps");
    await expect(page.getByTestId("app-card-style-snap")).toBeVisible();
    await checkA11y(page);
  });
});

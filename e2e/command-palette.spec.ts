import { expect, test } from "@playwright/test";
import { checkA11y, gotoApp, mockPollinations, resetStorage } from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetStorage(page);
  await mockPollinations(page);
  await gotoApp(page);
});

// "Meta+k"/"Control+k" press the physical K key with the modifier held (key === "k").
test("Meta+K opens the palette and the keyboard navigates to Cinema Studio", async ({ page }) => {
  await page.keyboard.press("Meta+k");
  const palette = page.getByTestId("command-palette");
  await expect(palette).toBeVisible();

  await page.getByTestId("command-palette-input").fill("cinema");
  const items = page.getByTestId("command-palette-item");
  await expect(items.first()).toContainText(/cinema/i);

  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/create\/cinema$/);
  await expect(palette).toBeHidden();
  await expect(page.getByTestId("header-breadcrumb")).toContainText("Cinema Studio");
});

test("Control+K opens the palette with the input focused and Escape closes it", async ({ page }) => {
  await page.keyboard.press("Control+k");
  const palette = page.getByTestId("command-palette");
  await expect(palette).toBeVisible();
  await expect(page.getByTestId("command-palette-input")).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(palette).toBeHidden();
});

test("the header trigger opens an accessible palette", async ({ page }) => {
  await page.getByTestId("command-palette-trigger").click();
  const palette = page.getByTestId("command-palette");
  await expect(palette).toBeVisible();
  await expect(page.getByTestId("command-palette-item").first()).toBeVisible();

  await checkA11y(page);

  await page.keyboard.press("Escape");
  await expect(palette).toBeHidden();
});

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { checkA11y, gotoApp, mockPollinations, resetStorage } from "./helpers";

async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth);
}

test.beforeEach(async ({ page }) => {
  await resetStorage(page);
  await mockPollinations(page);
  await gotoApp(page);
});

test("the sidebar is an off-canvas drawer that closes after navigating", async ({ page }) => {
  const sidebar = page.getByTestId("sidebar");
  const toggle = page.getByTestId("mobile-nav-toggle");

  await expect(toggle).toBeVisible();
  await expect(sidebar).not.toBeInViewport();

  await toggle.click();
  await expect(sidebar).toBeVisible();
  await expect(sidebar).toBeInViewport();

  await sidebar.getByTestId("nav-link-image").click();
  await expect(page).toHaveURL(/\/create\/image$/);
  await expect(page.getByTestId("header-breadcrumb")).toContainText("Image Studio");
  await expect(sidebar).not.toBeInViewport();

  expect(await hasHorizontalScroll(page), "studio page must not scroll horizontally").toBe(false);
});

test("the explore page fits the viewport width", async ({ page }) => {
  expect(await hasHorizontalScroll(page), "explore page must not scroll horizontally").toBe(false);
});

test("the explore page has no critical or serious accessibility violations on a phone", async ({ page }) => {
  await checkA11y(page);
});

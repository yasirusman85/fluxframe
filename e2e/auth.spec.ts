import { expect, test } from "@playwright/test";
import { STORAGE_KEYS, resetStorage } from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetStorage(page);
  await page.goto("/");
  await page.evaluate((authKey) => window.localStorage.removeItem(authKey), STORAGE_KEYS.auth);
  await page.reload();
});

test("signs up, persists the session and logs out", async ({ page }) => {
  await page.getByTestId("landing-signup").click();
  const modal = page.getByTestId("auth-modal");
  await expect(modal).toBeVisible();
  await modal.getByTestId("auth-name").fill("Ada Lovelace");
  await modal.getByTestId("auth-email").fill("ada@example.com");
  await modal.getByTestId("auth-password").fill("analytical-engine");
  await modal.getByTestId("auth-submit").click();
  await expect(modal).toBeHidden();
  await expect(page.getByTestId("auth-logout")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("auth-logout")).toBeVisible();
  await page.getByTestId("auth-logout").click();
  await expect(page.getByTestId("landing-login")).toBeVisible();
});

test("protects studio routes and returns after login", async ({ page }) => {
  await page.goto("/create/image");
  await expect(page).toHaveURL(/\/$/);
  const modal = page.getByTestId("auth-modal");
  await expect(modal).toBeVisible();
  await modal.getByTestId("auth-email").fill("missing@example.com");
  await modal.getByTestId("auth-password").fill("wrong-password");
  await modal.getByTestId("auth-submit").click();
  await expect(modal.getByRole("alert")).toContainText("Incorrect email or password");
});

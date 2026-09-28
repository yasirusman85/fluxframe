import { expect, test } from "@playwright/test";
import { checkA11y, expectToast, gotoApp, mockPollinations, resetStorage } from "./helpers";

const parseCredits = (text: string) => Number(text.replace(/[^\d]/g, ""));

test.describe("Account", () => {
  test.beforeEach(async ({ page }) => {
    await resetStorage(page);
    await mockPollinations(page);
  });

  test("profile edits persist after a reload", async ({ page }) => {
    await gotoApp(page, "/account");
    await expect(page.getByTestId("account-tab-profile")).toHaveAttribute("aria-selected", "true");

    await page.getByTestId("profile-name-input").fill("Ada Lovelace");
    await page.getByTestId("profile-handle-input").fill("ada_lovelace");
    await page.getByTestId("profile-save").click();
    await expectToast(page, /Profile saved/);

    await page.reload();
    await expect(page.getByTestId("profile-name-input")).toHaveValue("Ada Lovelace");
    await expect(page.getByTestId("profile-handle-input")).toHaveValue("ada_lovelace");
  });

  test("rejects an invalid handle", async ({ page }) => {
    await gotoApp(page, "/account");
    await page.getByTestId("profile-handle-input").fill("Not Valid!");
    await expect(page.getByTestId("profile-handle-input")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByTestId("profile-save")).toBeDisabled();
  });

  test("switching plans grants credits and records history", async ({ page }) => {
    await gotoApp(page, "/account");
    await page.getByTestId("account-tab-plans").click();
    await expect(page).toHaveURL(/tab=plans/);

    const pill = page.getByTestId("credits-pill");
    await expect(pill).toBeVisible();
    const before = parseCredits(await pill.innerText());

    await page.getByTestId("plan-select-pro").click();
    await expect(page.getByTestId("plan-card-pro")).toContainText("Current plan");
    await expect(page.getByTestId("plan-select-pro")).toBeDisabled();
    await expect.poll(async () => parseCredits(await pill.innerText())).toBe(before + 1500);

    await page.getByTestId("account-tab-history").click();
    await expect(page.getByTestId("credit-history-row").filter({ hasText: "Cinema Pro" })).toBeVisible();
  });

  test("creates, reveals and revokes a local API key", async ({ page }) => {
    await gotoApp(page, "/account");
    await page.getByTestId("account-tab-api").click();

    await page.getByTestId("apikey-name-input").fill("CI key");
    await page.getByTestId("apikey-create").click();

    const reveal = page.getByTestId("apikey-reveal");
    await expect(reveal).toBeVisible();
    await expect(reveal.getByTestId("apikey-value")).toHaveText(/^ff_live_/);
    await reveal.getByTestId("apikey-reveal-close").click();
    await expect(reveal).toBeHidden();

    const row = page.getByTestId("apikey-row").first();
    await expect(row).toContainText("CI key");
    await expect(row).toContainText("…");

    await row.getByTestId("apikey-revoke").click();
    await expect(row.getByTestId("apikey-revoke")).toBeDisabled();
    await expect(row.getByTestId("apikey-revoke")).toHaveText("Revoked");
  });

  test("preference toggles persist after a reload", async ({ page }) => {
    await gotoApp(page, "/account");
    await page.getByTestId("account-tab-preferences").click();

    const toggle = page.getByTestId("pref-confirm-deletes");
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");

    await page.reload();
    await expect(page.getByTestId("account-tab-preferences")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("pref-confirm-deletes")).toHaveAttribute("aria-checked", "false");
  });

  test("shows storage usage and exports project metadata", async ({ page }) => {
    await gotoApp(page, "/account?tab=storage");
    await expect(page.getByTestId("account-tab-storage")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("storage-usage")).toBeVisible();

    const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("storage-export").click()]);
    expect(download.suggestedFilename()).toBe("fluxframe-projects.json");
  });

  test("has no serious accessibility violations on any tab", async ({ page }) => {
    await gotoApp(page, "/account");
    await checkA11y(page);
    for (const tab of ["plans", "history", "api", "preferences", "storage"] as const) {
      await page.getByTestId(`account-tab-${tab}`).click();
      await expect(page.getByTestId(`account-tab-${tab}`)).toHaveAttribute("aria-selected", "true");
      await checkA11y(page);
    }
  });
});

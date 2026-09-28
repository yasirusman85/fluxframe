import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { checkA11y, expectToast, gotoApp, mockPollinations, resetStorage, setCredits } from "./helpers";

const SEED_BALANCE = 3;

/** Parses the number shown in the credits pill ("3", "1,250", "1.2k"). */
function parseCredits(text: string): number {
  const match = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*([kK])?/);
  if (!match) return Number.NaN;
  return Number(match[1]) * (match[2] ? 1000 : 1);
}

async function creditsShown(page: Page): Promise<number> {
  return parseCredits(await page.getByTestId("credits-pill").innerText());
}

test.beforeEach(async ({ page }) => {
  await resetStorage(page);
  await setCredits(page, SEED_BALANCE);
  await mockPollinations(page);
  await gotoApp(page, "/create/image");
});

test("generating without enough credits opens the top-up modal and a refill restores the balance", async ({ page }) => {
  await expect.poll(() => creditsShown(page)).toBe(SEED_BALANCE);

  await page.getByTestId("prompt-input").fill("A lighthouse on a basalt cliff at dawn, cinematic");
  const generate = page.getByTestId("generate-button");
  await expect(generate).toBeEnabled();
  await generate.click();

  const modal = page.getByTestId("topup-modal");
  await expect(modal).toBeVisible();
  await expectToast(page, /credits/i, "warning");
  await checkA11y(page);

  await page.getByTestId("topup-refill").click();
  await expect.poll(() => creditsShown(page)).toBeGreaterThan(SEED_BALANCE);

  // The balance is persisted, so it survives a reload.
  await page.reload();
  await gotoApp(page, "/create/image");
  await expect.poll(() => creditsShown(page)).toBeGreaterThan(SEED_BALANCE);
});

test("the credits pill opens the top-up modal", async ({ page }) => {
  await page.getByTestId("credits-pill").click();
  const modal = page.getByTestId("topup-modal");
  await expect(modal).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();
});

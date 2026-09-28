import { expect, test } from "@playwright/test";
import { checkA11y, gotoApp, mockPollinations, resetStorage } from "./helpers";

const PROMPT = "Lone astronaut walking through neon rain, slow dolly in";
const STUDIO_TYPES = ["cinema", "image", "video", "marketing", "lipsync"] as const;

test.describe("Explore page", () => {
  test.beforeEach(async ({ page }) => {
    await resetStorage(page);
    await mockPollinations(page);
    await gotoApp(page, "/");
  });

  test("renders the hero, composer and studio cards", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Direct cinematic AI video and imagery");
    await expect(page.getByTestId("hero-composer-input")).toBeVisible();
    await expect(page.getByTestId("hero-composer-studio")).toHaveValue("cinema");
    await expect(page.getByTestId("hero-composer-submit")).toBeVisible();
    for (const type of STUDIO_TYPES) {
      await expect(page.getByTestId(`engine-card-${type}`)).toBeVisible();
    }
  });

  test("composer opens the Cinema studio with the prompt prefilled", async ({ page }) => {
    await page.getByTestId("hero-composer-input").fill(PROMPT);
    await page.getByTestId("hero-composer-submit").click();

    await expect(page).toHaveURL(/\/create\/cinema\?/);
    expect(page.url()).toContain("prompt=Lone+astronaut+walking");
    const params = new URL(page.url()).searchParams;
    expect(params.get("prompt")).toBe(PROMPT);
    expect(params.get("ratio")).toBe("16:9");
    await expect(page.getByTestId("prompt-input")).toHaveValue(PROMPT);
  });

  test("Enter submits the composer, Shift+Enter does not", async ({ page }) => {
    const input = page.getByTestId("hero-composer-input");
    await input.fill("Volcanic island flyby");
    await input.press("Shift+Enter");
    await expect(page).not.toHaveURL(/\/create\//);
    await input.press("Enter");
    await expect(page).toHaveURL(/\/create\/cinema\?prompt=Volcanic\+island\+flyby/);
  });

  test("studio select changes the target route", async ({ page }) => {
    await page.getByTestId("hero-composer-studio").selectOption("image");
    await page.getByTestId("hero-composer-input").fill("Ceramic mug on wet slate");
    await page.getByTestId("hero-composer-submit").click();

    await expect(page).toHaveURL(/\/create\/image\?/);
    await expect(page.getByTestId("prompt-input")).toHaveValue("Ceramic mug on wet slate");
  });

  test("an empty prompt simply opens the studio", async ({ page }) => {
    await page.getByTestId("hero-composer-submit").click();
    await expect(page).toHaveURL(/\/create\/cinema/);
    expect(new URL(page.url()).searchParams.has("prompt")).toBe(false);
  });

  test("showcase category filter narrows the grid", async ({ page }) => {
    await page.getByTestId("showcase-filter-Sci-Fi").click();
    await expect(page.getByTestId("showcase-card-valkyrie")).toBeVisible();
    await expect(page.getByTestId("showcase-card-hyperjump")).toBeVisible();
    await expect(page.getByTestId("showcase-card-perfume")).toBeHidden();

    await page.getByTestId("showcase-filter-All").click();
    await expect(page.getByTestId("showcase-card-perfume")).toBeVisible();
  });

  test("remixing a showcase preset deep-links into the Image studio", async ({ page }) => {
    const card = page.getByTestId("showcase-card-noir-detective");
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await page.getByTestId("showcase-remix-noir-detective").click();

    await expect(page).toHaveURL(/\/create\/image\?/);
    const params = new URL(page.url()).searchParams;
    expect(params.get("model")).toBe("studio-cinema-xl");
    expect(params.get("ratio")).toBe("16:9");
    await expect(page.getByTestId("prompt-input")).toHaveValue(/Moody noir detective/);
  });

  test("clicking a showcase card also remixes it", async ({ page }) => {
    await page.getByTestId("showcase-card-glass-spire").click();
    await expect(page).toHaveURL(/\/create\/image\?/);
    await expect(page.getByTestId("prompt-input")).toHaveValue(/Futuristic skyscraper/);
  });

  test("showcase images load from the bundled stills", async ({ page }) => {
    const image = page.locator('[data-testid^="showcase-card-"] img').first();
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveAttribute("src", /showcase\/valkyrie\.jpg$/);
    await expect.poll(() => image.evaluate((el) => (el as HTMLImageElement).naturalWidth), { timeout: 15_000 }).toBeGreaterThan(0);
  });

  test("shows recent generations from the library", async ({ page }) => {
    const cards = page.getByTestId("recent-project-card");
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(8);
    await expect(page.getByRole("link", { name: /View library/ })).toHaveAttribute("href", /\/projects$/);
  });

  test("stacks without horizontal overflow on a phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoApp(page, "/");
    await expect(page.getByTestId("hero-composer-input")).toBeVisible();
    const overflows = await page.evaluate(() => {
      const candidates = [document.documentElement, document.body, ...Array.from(document.querySelectorAll("main"))];
      return candidates.some((el) => el.scrollWidth > el.clientWidth + 1);
    });
    expect(overflows).toBe(false);
  });

  test("has no critical or serious accessibility violations", async ({ page }) => {
    await checkA11y(page);
  });
});

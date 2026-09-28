import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { checkA11y, gotoApp, mockPollinations, resetStorage } from "./helpers";

interface NavLink {
  id: string;
  path: string;
  title: string | RegExp;
  /** Query-string fragment the link is expected to carry. */
  search?: string;
}

/** Sidebar links → route path + breadcrumb title (docs/SPEC.md "Routes"). */
const NAV_LINKS: NavLink[] = [
  { id: "explore", path: "/", title: "Explore" },
  { id: "image", path: "/create/image", title: "Image Studio" },
  { id: "video", path: "/create/video", title: "Video Studio" },
  { id: "cinema", path: "/create/cinema", title: "Cinema Studio" },
  { id: "lipsync", path: "/create/lipsync", title: "LipSync Studio" },
  { id: "marketing", path: "/create/marketing", title: "Marketing Studio" },
  { id: "canvas", path: "/canvas", title: "Node Canvas" },
  { id: "apps", path: "/apps", title: "Creative Apps" },
  { id: "projects", path: "/projects", title: "Library" },
  { id: "favorites", path: "/projects", title: /Library|Favorites/, search: "filter=favorites" },
  { id: "account", path: "/account", title: /Account/ },
];

async function expectPath(page: Page, path: string): Promise<void> {
  await expect.poll(() => new URL(page.url()).pathname, { message: `URL path should be ${path}` }).toBe(path);
}

test.beforeEach(async ({ page }) => {
  await resetStorage(page);
  await mockPollinations(page);
  await gotoApp(page);
});

test("boots on Explore with the app shell in place", async ({ page }) => {
  await expect(page.getByTestId("sidebar")).toBeVisible();
  await expect(page.getByTestId("header-breadcrumb")).toContainText("Explore");
  await expect(page).toHaveTitle(/FluxFrame/);
  await expect(page.getByTestId("credits-pill")).toBeVisible();
  await expect(page.getByTestId("command-palette-trigger")).toBeVisible();
  await expect(page.getByTestId("create-button")).toBeVisible();
});

test("every sidebar link navigates and updates the breadcrumb", async ({ page }) => {
  for (const link of NAV_LINKS) {
    await test.step(`nav-link-${link.id} → ${link.path}`, async () => {
      await page.getByTestId(`nav-link-${link.id}`).click();
      await expectPath(page, link.path);
      if (link.search) await expect(page).toHaveURL(new RegExp(link.search));
      await expect(page.getByTestId("header-breadcrumb")).toContainText(link.title);
      await expect(page).toHaveTitle(/FluxFrame/);
    });
  }
});

test("deep links straight into a studio", async ({ page }) => {
  await gotoApp(page, "/create/cinema");
  await expect(page.getByTestId("header-breadcrumb")).toContainText("Cinema Studio");
  await expect(page).toHaveTitle(/Cinema Studio/);
  await expect(page.getByTestId("prompt-input")).toBeVisible();
  await expect(page.getByTestId("generate-button")).toBeVisible();
});

test("unknown routes show a not-found page with a way back home", async ({ page }) => {
  await page.goto("/does-not-exist");
  await expect(page.getByText(/not found|404/i).first()).toBeVisible();

  // Prefer the page's own link over the sidebar's Explore entry.
  const main = page.locator("main");
  const scope = (await main.count()) > 0 ? main : page;
  const homeLink = scope.getByRole("link", { name: /home|explore|back/i }).first();
  await expect(homeLink).toBeVisible();
  await homeLink.click();

  await expectPath(page, "/");
  await expect(page.getByTestId("header-breadcrumb")).toContainText("Explore");
});

test("explore page has no critical or serious accessibility violations", async ({ page }) => {
  await checkA11y(page);
});

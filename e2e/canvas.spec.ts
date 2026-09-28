import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { checkA11y, gotoApp, mockPollinations, resetStorage } from "./helpers";

/** Prompt typed into the freshly added node — proves the rewired edge is the one that runs. */
const REWIRED_PROMPT = "A lone astronaut on a wind-swept orange dune at golden hour";

/** Every button in the two toolbar clusters. */
const TOOLBAR_BUTTONS = [
  "canvas-add-prompt",
  "canvas-add-text",
  "canvas-add-image",
  "canvas-add-motion",
  "canvas-run-all",
  "canvas-load-template",
  "canvas-clear",
  "canvas-zoom-out",
  "canvas-zoom-in",
  "canvas-zoom-reset",
  "canvas-fit",
] as const;

const nodesOfType = (page: Page, type: string): Locator => page.locator(`[data-testid="canvas-node"][data-node-type="${type}"]`);

/** Drags from one port to another the way a person would: press, move in steps, release. */
async function dragPort(page: Page, from: Locator, to: Locator): Promise<void> {
  const source = await from.boundingBox();
  const target = await to.boundingBox();
  if (!source || !target) throw new Error("A port has no bounding box — is the node off-screen?");
  const start = { x: source.x + source.width / 2, y: source.y + source.height / 2 };
  const end = { x: target.x + target.width / 2, y: target.y + target.height / 2 };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move((start.x + end.x) / 2, (start.y + end.y) / 2, { steps: 3 });
  await page.mouse.move(end.x, end.y, { steps: 3 });
  await page.mouse.up();
}

test.describe("Node Canvas", () => {
  test.beforeEach(async ({ page }) => {
    await resetStorage(page);
    await mockPollinations(page);
    await gotoApp(page, "/canvas");
    await page.getByTestId("canvas-root").scrollIntoViewIfNeeded();
  });

  test("rewires the starter graph and runs prompt → image → motion", async ({ page }) => {
    test.setTimeout(150_000);

    const nodes = page.getByTestId("canvas-node");
    const edges = page.getByTestId("canvas-edge");
    await expect(nodes).toHaveCount(3);
    await expect(edges).toHaveCount(2);

    // A second prompt node, wired into the image node in place of the starter prompt.
    await page.getByTestId("canvas-add-prompt").click();
    await expect(nodes).toHaveCount(4);
    await expect(nodesOfType(page, "prompt")).toHaveCount(2);

    const newPrompt = nodesOfType(page, "prompt").nth(1);
    const imageNode = nodesOfType(page, "image").first();
    const motionNode = nodesOfType(page, "motion").first();

    await dragPort(page, newPrompt.getByTestId("node-port-out"), imageNode.getByTestId("node-port-in"));
    // An image node keeps a single incoming edge, so the new one replaced the old.
    await expect(edges).toHaveCount(2);

    await newPrompt.getByTestId("node-prompt-input").fill(REWIRED_PROMPT);
    await expect(newPrompt.getByTestId("node-prompt-input")).toHaveValue(REWIRED_PROMPT);

    await imageNode.getByTestId("node-run").click();
    const outputImage = imageNode.getByTestId("node-output-image");
    await expect(outputImage).toBeVisible({ timeout: 45_000 });
    await expect(outputImage).toHaveAttribute("src", /^blob:/);

    await page.getByTestId("canvas-run-all").click();
    const outputVideo = motionNode.getByTestId("node-output-video");
    await expect(outputVideo).toBeVisible({ timeout: 90_000 });
    await expect(outputVideo).toHaveAttribute("src", /^blob:/);

    // Nodes, edges and the viewport live in localStorage.
    await page.reload();
    await expect(page.getByTestId("canvas-root")).toBeVisible();
    await expect(page.getByTestId("canvas-node")).toHaveCount(4);
    await expect(page.getByTestId("canvas-edge")).toHaveCount(2);
    await expect(nodesOfType(page, "prompt").nth(1).getByTestId("node-prompt-input")).toHaveValue(REWIRED_PROMPT);
  });

  test("zooms, clears and stays accessible", async ({ page }) => {
    for (const testId of TOOLBAR_BUTTONS) {
      await expect(page.getByTestId(testId)).toHaveAccessibleName(/\S/);
    }

    const zoomLabel = page.getByTestId("canvas-zoom-label");
    await expect(zoomLabel).toHaveText("100%");
    await page.getByTestId("canvas-zoom-in").click();
    await expect(zoomLabel).not.toHaveText("100%");
    await page.getByTestId("canvas-zoom-reset").click();
    await expect(zoomLabel).toHaveText("100%");

    await checkA11y(page);

    page.on("dialog", (dialog) => void dialog.accept());
    await page.getByTestId("canvas-clear").click();
    await expect(page.getByTestId("canvas-node")).toHaveCount(0);
    await expect(page.getByTestId("canvas-empty")).toBeVisible();
    await expect(page.getByTestId("canvas-run-all")).toBeDisabled();

    // The empty state puts the starter workflow back.
    await page.getByTestId("canvas-empty").getByRole("button", { name: "Load starter workflow" }).click();
    await expect(page.getByTestId("canvas-node")).toHaveCount(3);
  });

  test("adds, selects and deletes nodes from the toolbar", async ({ page }) => {
    const nodes = page.getByTestId("canvas-node");
    await expect(nodes).toHaveCount(3);

    await page.getByTestId("canvas-add-text").click();
    await expect(nodesOfType(page, "text")).toHaveCount(1);
    await expect(nodes).toHaveCount(4);

    const textNode = nodesOfType(page, "text").first();
    await textNode.getByTestId("node-text-input").fill("shot on 35mm film, muted palette");
    await expect(textNode.getByTestId("node-text-input")).toHaveValue("shot on 35mm film, muted palette");

    await textNode.getByTestId("node-delete").click();
    await expect(nodesOfType(page, "text")).toHaveCount(0);
    await expect(nodes).toHaveCount(3);
    await expect(page.getByTestId("canvas-edge")).toHaveCount(2);
  });
});

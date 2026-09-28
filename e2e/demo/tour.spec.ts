/**
 * Narrated demo tour.
 *
 * This is not an assertion suite — it is the b-roll for the demo video and the
 * source of every screenshot in `README.md`. It drives the whole product in one
 * pass, slowly enough that a human can talk over the recording, following
 * `docs/DEMO-SCRIPT.md` scene for scene.
 *
 *   npm run demo:record        DEMO=1                  → demo/walkthrough.webm
 *   npm run demo:screenshots   DEMO=1 SCREENSHOTS=1    → docs/screenshots/*.png
 *   DEMO_LIVE=1 npm run demo:record                    → real Pollinations endpoint
 *
 * Only the `demo` Playwright project (enabled by `DEMO=1`) matches this file:
 * 1440x900, `video: { mode: "on" }`, one worker, no retries.
 *
 * Conventions used here:
 *  - every beat is a `test.step`, so the HTML report reads like the script;
 *  - `pause()` between beats gives the narrator room — nothing depends on it;
 *  - `need()` wraps every locator so a renamed or missing control fails with a
 *    sentence the integrator can act on instead of hanging until the timeout.
 */
import { promises as fs } from "node:fs";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { FIXTURES, gotoApp, mockPollinations, resetStorage, uploadToDropzone, waitForJobComplete } from "../helpers";

// ---- configuration ---------------------------------------------------------------------------

/** `DEMO_LIVE=1` skips the mock so the recording hits the real endpoint (~1 request / 15 s). */
const LIVE = process.env.DEMO_LIVE === "1";
/** `SCREENSHOTS=1` also refreshes the README stills. */
const SCREENSHOTS = process.env.SCREENSHOTS === "1";

const SCREENSHOT_DIR = "docs/screenshots";
const DEMO_DIR = "demo";
const WALKTHROUGH_PATH = `${DEMO_DIR}/walkthrough.webm`;

/** Default beat length. Long enough to narrate over, short enough to stay under 15 min. */
const BEAT_MS = 1_600;
const LONG_BEAT_MS = 2_500;
/** Generations are slower against the live endpoint, which serialises on a 15 s window. */
const JOB_TIMEOUT_MS = LIVE ? 180_000 : 90_000;
/** Same keystroke cadence everywhere so typing looks human in the recording. */
const TYPE_DELAY = { delay: 25 };

const IMAGE_PROMPT =
  "A red fox stepping onto a frozen lake at dawn, low winter sun, long blue shadows, breath in the air";
const CINEMA_PROMPT = "Abandoned observatory dome opening onto a star field, volumetric light, slow orbit";
const LIPSYNC_PROMPT = "Studio portrait of a presenter in a charcoal jacket, soft key light";
const PRODUCT_URL = "https://shop.example.com/products/aurora-trail-runner";
const CANVAS_PROMPT = "Basalt sea stack at blue hour, long exposure surf, moody sky";

// ---- narration helpers -----------------------------------------------------------------------

/** A deliberate gap for the voice-over. Never used to wait for the app. */
async function pause(page: Page, ms: number = BEAT_MS): Promise<void> {
  await page.waitForTimeout(ms);
}

/**
 * Asserts a control is on screen before the tour touches it. The message is the
 * point: a missing `data-testid` should read as "this feature is not wired up",
 * not as an anonymous 15 s timeout.
 */
async function need(locator: Locator, what: string, timeoutMs = 15_000): Promise<Locator> {
  await expect(locator, `Demo tour: ${what} was not visible — check the data-testid against docs/SPEC.md`).toBeVisible({
    timeout: timeoutMs,
  });
  return locator;
}

/** Types into a field character by character so the recording shows the prompt being written. */
async function typeInto(page: Page, testId: string, text: string, what: string): Promise<void> {
  const field = await need(page.getByTestId(testId), what);
  await field.click();
  await field.fill("");
  await page.keyboard.type(text, TYPE_DELAY);
}

/** Clicks a control by test id, with a readable failure when it is absent. */
async function clickTestId(page: Page, testId: string, what: string): Promise<void> {
  const target = await need(page.getByTestId(testId), what);
  await target.scrollIntoViewIfNeeded();
  await target.click();
}

/** Range inputs animate nicely under the arrow keys — and `fill()` does not work on them. */
async function nudgeSlider(page: Page, testId: string, key: "ArrowLeft" | "ArrowRight", presses: number, what: string): Promise<void> {
  const slider = await need(page.getByTestId(testId), what);
  await slider.scrollIntoViewIfNeeded();
  await slider.focus();
  for (let i = 0; i < presses; i += 1) {
    await slider.press(key);
    await page.waitForTimeout(90);
  }
}

/** Slow scroll for b-roll. */
async function scrollDown(page: Page, steps: number, deltaY = 520): Promise<void> {
  for (let i = 0; i < steps; i += 1) {
    await page.mouse.wheel(0, deltaY);
    await page.waitForTimeout(650);
  }
}

/** README stills. Names are consumed by `README.md` — see docs/screenshots/README.md. */
async function shot(page: Page, name: string): Promise<void> {
  if (!SCREENSHOTS) return;
  // Studio pages are taller than the viewport and the beats end scrolled down,
  // which would crop the output column out of the still.
  await page.evaluate(() => document.querySelector("main")?.scrollTo({ top: 0 }));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png` });
}

/** Runs a studio generation and waits for its output, with demo-friendly pacing. */
async function generateAndWait(page: Page, what: string): Promise<void> {
  const button = await need(page.getByTestId("generate-button"), `${what}: the Generate button`);
  await expect(button, `Demo tour: ${what}: Generate stayed disabled — the form was not valid`).toBeEnabled();
  await button.click();
  await need(page.getByTestId("queue-panel"), `${what}: the queue panel with live progress`);
  await pause(page, LONG_BEAT_MS);
  await waitForJobComplete(page, JOB_TIMEOUT_MS);
}

const outputImage = (page: Page): Locator => page.getByTestId("output-canvas").getByTestId("output-image");
const outputVideo = (page: Page): Locator => page.getByTestId("output-canvas").getByTestId("output-video");

// ---- the tour --------------------------------------------------------------------------------

test("FluxFrame walkthrough", async ({ page }) => {
  test.setTimeout(15 * 60_000);

  await resetStorage(page);
  // Live mode is the honest take (real endpoint, real waits); the mock keeps the
  // default recording deterministic and offline-safe.
  if (!LIVE) await mockPollinations(page, { delayMs: 900 });

  await test.step("Explore — hero, showcase, remix", async () => {
    await gotoApp(page, "/");
    await need(page.getByTestId("hero-composer-input"), "the Explore hero composer");
    await pause(page, LONG_BEAT_MS);
    await shot(page, "01-explore");

    // Studios strip → "How it works" → showcase.
    await scrollDown(page, 4);
    await pause(page);

    await clickTestId(page, "showcase-filter-Cinematic", "the showcase category filter 'Cinematic'");
    await pause(page, LONG_BEAT_MS);

    // Every card carries the settings that made it; Remix restores all of them.
    const card = await need(page.getByTestId("showcase-card-noir-detective"), "the 'Neo-Tokyo Detective' showcase card");
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await pause(page, 1_200);
    await clickTestId(page, "showcase-remix-noir-detective", "the Remix action on the showcase card");

    await expect(page, "Demo tour: remixing an image preset must deep-link into /create/image").toHaveURL(/\/create\/image/);
    await need(page.getByTestId("prompt-input"), "the Image Studio prompt box (prefilled by remix)");
    await pause(page, LONG_BEAT_MS);
  });

  await test.step("Image Studio — prompt, engine, real generation", async () => {
    await typeInto(page, "prompt-input", IMAGE_PROMPT, "the Image Studio prompt box");
    await pause(page, 1_200);

    await clickTestId(page, "ratio-16:9", "the 16:9 aspect-ratio button");
    await clickTestId(page, "quality-high", "the High quality option");
    await pause(page);

    await generateAndWait(page, "Image Studio");
    await need(outputImage(page), "the generated image in the output canvas");
    await need(page.getByTestId("output-canvas").getByTestId("provider-badge"), "the provider badge on the output");
    await pause(page, LONG_BEAT_MS);
    await shot(page, "02-image-studio");
  });

  await test.step("Cinema Studio — keyframe, camera, rendered .webm", async () => {
    await gotoApp(page, "/create/cinema");
    await typeInto(page, "prompt-input", CINEMA_PROMPT, "the Cinema Studio prompt box");

    // Mocked runs upload a keyframe so the beat is purely about the camera and
    // costs no image request. Live runs let the studio generate its own keyframe,
    // so the captured stills show real AI imagery instead of the test fixture.
    if (!LIVE) {
      await uploadToDropzone(page, "keyframe-dropzone", FIXTURES.keyframe);
      await pause(page);
    }

    await clickTestId(page, "camera-preset-orbit", "the 'Hero Orbit' camera preset");
    await pause(page, LONG_BEAT_MS); // the live preview loop picks up the new move
    await clickTestId(page, "duration-3", "the 3-second duration option");
    await pause(page);

    await generateAndWait(page, "Cinema Studio");

    const video = await need(outputVideo(page), "the rendered .webm in the video player");
    await video.evaluate((element) => {
      const media = element as HTMLVideoElement;
      media.muted = true;
      media.currentTime = 0;
      void media.play();
    });
    await pause(page, 4_000); // let the clip actually play on camera
    await shot(page, "03-cinema-studio");
  });

  await test.step("LipSync Studio — portrait, calibration, uploaded audio", async () => {
    await gotoApp(page, "/create/lipsync");
    // LipSync has no generic prompt box: the portrait description feeds the
    // generated portrait, and the spoken line lives in `script-input`.
    await typeInto(page, "portrait-prompt-input", LIPSYNC_PROMPT, "the LipSync portrait description");

    await uploadToDropzone(page, "portrait-dropzone", FIXTURES.portrait);
    await pause(page);

    // No face detection: the jaw pivot is placed by hand, on purpose.
    await nudgeSlider(page, "mouth-y-slider", "ArrowRight", 4, "the mouth-Y calibration slider");
    await nudgeSlider(page, "mouth-x-slider", "ArrowLeft", 2, "the mouth-X calibration slider");
    await pause(page);

    await clickTestId(page, "lipsync-mode-audio", "the Audio mode tab");
    await uploadToDropzone(page, "audio-dropzone", FIXTURES.speech);
    await pause(page, LONG_BEAT_MS);

    await generateAndWait(page, "LipSync Studio");
    await need(outputVideo(page), "the talking-portrait clip");
    await pause(page, LONG_BEAT_MS);
    await shot(page, "04-lipsync-studio");
  });

  await test.step("Marketing Studio — product URL, template, ad render", async () => {
    await gotoApp(page, "/create/marketing");
    await typeInto(page, "product-url-input", PRODUCT_URL, "the product URL field");
    await pause(page, 1_200); // the product name is parsed from the slug

    await clickTestId(page, "ad-template-ugc-review", "the 'UGC Product Review' template");
    await pause(page);
    await clickTestId(page, "ad-tone-luxury", "the 'Luxury & Minimal' brand tone");
    await pause(page, LONG_BEAT_MS); // headline / sub-headline / proof / CTA redraft

    // Live runs generate the packshot so the ad shows a real product still.
    if (!LIVE) await uploadToDropzone(page, "packshot-dropzone", FIXTURES.packshot);
    await pause(page);

    await generateAndWait(page, "Marketing Studio");
    await need(outputVideo(page), "the rendered ad clip");
    await pause(page, LONG_BEAT_MS);
    await shot(page, "05-marketing-studio");
  });

  await test.step("Node Canvas — run the graph", async () => {
    await gotoApp(page, "/canvas");
    await need(page.getByTestId("canvas-root"), "the node canvas surface");

    const nodes = page.getByTestId("canvas-node");
    await expect(
      nodes.first(),
      "Demo tour: the node canvas must open with a starter graph (prompt → image → motion) for Run all to have something to do",
    ).toBeVisible({ timeout: 15_000 });

    const promptNode = page.getByTestId("node-prompt-input").first();
    if (await promptNode.isVisible().catch(() => false)) {
      await promptNode.click();
      await promptNode.fill("");
      await page.keyboard.type(CANVAS_PROMPT, TYPE_DELAY);
      await pause(page);
    }

    await clickTestId(page, "canvas-run-all", "the 'Run all' button");
    await need(page.getByTestId("node-output-video").first(), "the motion node's rendered clip", JOB_TIMEOUT_MS);
    await pause(page, LONG_BEAT_MS);
    await shot(page, "06-canvas");
  });

  await test.step("Library — filter, detail, remix", async () => {
    await gotoApp(page, "/projects");
    await need(page.getByTestId("library-search"), "the library search box");
    await pause(page);

    await clickTestId(page, "library-filter-cinema", "the 'Cinema' library filter");
    await pause(page, LONG_BEAT_MS);
    await shot(page, "07-library");

    const card = await need(page.getByTestId("media-card").first(), "a project card in the library");
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await pause(page, 1_200);
    // The card's <Link> covers the thumbnail, not the footer, so a click on the
    // card's geometric centre can land on non-interactive text.
    await card.getByRole("link").first().click();

    await expect(page, "Demo tour: clicking a library card must open /projects/:id").toHaveURL(/\/projects\/[^/?#]+/);
    await need(page.getByTestId("project-title"), "the project detail heading");
    await pause(page, LONG_BEAT_MS);
    await shot(page, "08-project-detail");

    await clickTestId(page, "project-remix", "the Remix action on the detail page");
    await expect(page, "Demo tour: Remix must deep-link back into the originating studio").toHaveURL(/\/create\//);
    await need(page.getByTestId("prompt-input"), "the studio prompt box restored by remix");
    await pause(page, LONG_BEAT_MS);
  });

  await test.step("Account — credits, plans, storage", async () => {
    await gotoApp(page, "/account");
    await need(page.getByTestId("credits-pill"), "the credits pill in the header");
    await pause(page);

    await clickTestId(page, "account-tab-plans", "the Plans tab");
    await need(page.getByTestId("plan-card-pro"), "the 'Cinema Pro' plan card");
    await pause(page, LONG_BEAT_MS);
    await shot(page, "09-account");

    await clickTestId(page, "account-tab-storage", "the Storage tab");
    await need(page.getByTestId("storage-usage"), "the IndexedDB storage read-out");
    await pause(page, LONG_BEAT_MS);
  });

  await test.step("Command palette — ⌘K", async () => {
    await page.keyboard.press("ControlOrMeta+k");
    await need(page.getByTestId("command-palette"), "the command palette");
    await page.keyboard.type("cinema", TYPE_DELAY);
    await need(page.getByTestId("command-palette-item").first(), "a command palette result for 'cinema'");
    await pause(page, LONG_BEAT_MS);
    await shot(page, "10-command-palette");

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("command-palette"), "Demo tour: Escape must close the command palette").toBeHidden();
  });

  await test.step("Mobile — off-canvas navigation", async () => {
    await page.setViewportSize({ width: 412, height: 915 });
    await gotoApp(page, "/");
    await pause(page);

    await clickTestId(page, "mobile-nav-toggle", "the mobile navigation toggle");
    await need(page.getByTestId("sidebar"), "the off-canvas navigation drawer");
    await pause(page, LONG_BEAT_MS);
    await shot(page, "11-mobile");
  });

  await test.step("Wrap — back to Explore", async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoApp(page, "/");
    await need(page.getByTestId("hero-composer-input"), "the Explore hero composer");
    await pause(page, LONG_BEAT_MS);
  });

  // The recording is only flushed once the page is closed.
  await page.close();
  try {
    await fs.mkdir(DEMO_DIR, { recursive: true });
    await page.video()?.saveAs(WALKTHROUGH_PATH);
    console.log(`[demo] walkthrough recording saved to ${WALKTHROUGH_PATH}`);
  } catch (error) {
    // Never fail the tour over the copy step — the raw video still exists in test-results/.
    console.warn(`[demo] could not save ${WALKTHROUGH_PATH}: ${String(error)}`);
  }
});

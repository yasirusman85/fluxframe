# Docs agent — handover and verification checklist

## What I own

| File | State |
| --- | --- |
| `docs/DEMO-SCRIPT.md` | New. 11 scenes, timestamped, 8:50 as written. |
| `e2e/demo/tour.spec.ts` | New. One test, `npm run demo:record` / `npm run demo:screenshots`. Type-checks (`npx tsc -p tsconfig.e2e.json --noEmit`) and lints (`npx eslint e2e/demo`) clean. **Never executed** — I was asked not to run Playwright while `src/` is in flux. |
| `docs/screenshots/README.md` | New. How the PNGs are produced, the naming table, why they are committed. |
| `docs/agent-notes/docs.md` | This file. |
| `README.md`, `CAPTURE-TEST.md`, `docs/ARCHITECTURE.md` | Pre-existing. Two small corrections, listed under "Edits I made to existing docs". |

## Edits I made to existing docs

1. `README.md` (Image Studio bullet): the quoted queue-panel message was `"waiting 12 s for the next slot…"`; the string the client actually emits is `Public endpoint is rate-limited — waiting 12s for the next slot` (`src/lib/pollinations.ts`). Changed the quote to `"waiting 12s for the next slot"`.
2. `docs/ARCHITECTURE.md` (persistence table): added the missing `fluxframe-library-view` key (plain `localStorage`, not Zustand persist — `src/features/projects/library-utils.ts`). The table read as an exhaustive list and was missing it.

Nothing else in those three files was touched.

---

## Checklist for the integrator

Legend: **[v]** I verified it against the code as it stands; **[ ]** you must verify it after the pages land.

### Scripts and commands

- [v] `package.json` defines `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `test:watch`, `e2e`, `e2e:ui`, `e2e:report`, `demo:record`, `demo:screenshots`. Every script named in `README.md`, `CAPTURE-TEST.md`, `docs/DEMO-SCRIPT.md` and `docs/screenshots/README.md` exists.
- [v] `demo:record` = `DEMO=1 playwright test --project=demo`; `demo:screenshots` adds `SCREENSHOTS=1`. The tour reads both env vars plus `DEMO_LIVE`.
- [v] `npm run typecheck` (`tsc -b --noEmit`) really does cover the E2E suite — `tsconfig.json` references `tsconfig.e2e.json`. Note the consequence: **a type error in `e2e/` also breaks `npm run build`.**
- [ ] Run `npm run demo:record` once end to end. Fix whatever the tour's failure messages name (they are written to be actionable) and re-run.
- [ ] Run `npm run demo:screenshots`, then eyeball all 11 PNGs before committing (no error toasts, no empty states, no half-finished jobs in frame).
- [ ] Confirm `npm run e2e` does **not** pick up the tour (it must not: `chromium` and `mobile` both `testIgnore` `e2e/demo/`, and the `demo` project only exists when `DEMO=1`).

### Routes

- [v] `src/app/routes.ts` matches the route list in `docs/SPEC.md` and the "Feature tour" headings in `README.md`: `/`, `/create/image`, `/create/video`, `/create/cinema`, `/create/lipsync`, `/create/marketing`, `/canvas`, `/apps`, `/projects`, `/projects?filter=favorites`, `/projects/:projectId`, `/account`, `*`.
- [v] The demo script only names those routes.
- [ ] Breadcrumb titles still equal the SPEC titles once the shell agent's Header lands (`navigation.spec.ts` asserts this).

### Keyboard shortcuts

- [v] `⌘K` / `Ctrl+K` opens the command palette (`e2e/command-palette.spec.ts`; the tour uses `ControlOrMeta+k`).
- [v] `⌘↵` / `Ctrl+Enter` generates from the prompt box — implemented and asserted for Image Studio.
- [ ] Confirm `⌘↵` works in **every** studio, not just Image Studio — `README.md` scopes the claim to Image Studio, the demo script narrates it there too, so if a studio is missing it that is fine; if you widen the claim, verify it.
- [v] `Esc` closes the palette, the top-up modal and the lightbox (asserted in the palette and credits specs).
- [v] Arrow keys drive sliders — every `Slider` is a native `<input type="range">`, which is why the tour nudges the mouth-calibration sliders with `ArrowLeft`/`ArrowRight` instead of `fill()` (Playwright cannot `fill()` a range input).
- [ ] `README.md` also claims arrow keys drive the before/after compare (`ImageCompare`). Verify.

### Storage keys

- [v] `fluxframe-projects-v2` (v2), `fluxframe-credits-v2` (v2), `fluxframe-ui-v1`, `fluxframe-account-v1`, `fluxframe-canvas-v1`, `fluxframe-library-view`, IndexedDB database `fluxframe`. These match `docs/ARCHITECTURE.md` (after my edit) and `e2e/helpers.ts` `STORAGE_KEYS` / `IDB_NAME`.
- [ ] If any page agent adds a new `localStorage` key, add it to the ARCHITECTURE table **and** to `resetStorage`'s expectations — the tour relies on `resetStorage` giving a clean library for the screenshots.

### Test counts

- [v] No doc currently states a test count, so there is nothing to keep in sync. For reference, at the time of writing: **42 unit tests across 6 files** in `tests/`, **46 Playwright tests across 8 spec files** in `e2e/` (excluding the demo tour, which is 1 test in its own project).
- [ ] If you add a count to `README.md` or `CAPTURE-TEST.md`, take it from a real run (`npm run test`, `npx playwright test --list`) after all page agents have landed their specs — the numbers above will be stale.

### Deployed URL and CI

- [ ] **Could not verify (no network):** that <https://yasirusman85.github.io/fluxframe/> is live and serves the current build. The URL is consistent everywhere it appears (README badge + link, `CAPTURE-TEST.md`, `deploy.yml` comment) and matches the git remote `https://github.com/yasirusman85/fluxframe`.
- [v] `deploy.yml` builds with `VITE_BASE=/fluxframe/` and copies `dist/index.html` to `dist/404.html`; `vite.config.ts` reads `process.env.VITE_BASE ?? "/"`; `public/_redirects` exists for Cloudflare. The README's deployment paragraph is accurate.
- [ ] **Could not verify:** the two CI badges are green. Check Actions after pushing — `ci.yml` runs lint → typecheck → test → build → `playwright install` → e2e and uploads the HTML report artifact, which the demo script's scene 10 shows on screen.
- [ ] `README.md` says the demo script is "an eight-minute script"; the script's own stated runtime is 8:50. Align the wording if you trim the cut.

### Screenshot filenames

- [v] The 11 `shot(page, "…")` names in `e2e/demo/tour.spec.ts` exactly match the 11 `docs/screenshots/*.png` paths referenced by `README.md` (`01-explore` is referenced twice — header image and the Explore section). The mapping table in `docs/screenshots/README.md` lists both sides.
- [ ] `docs/screenshots/` is currently **empty** — every image in the README is a broken link until `npm run demo:screenshots` has been run and the PNGs committed. This is the single most visible "looks incomplete" risk in the repo.

---

## Things that will fail the tour until the new pages land

I wrote `e2e/demo/tour.spec.ts` against `docs/SPEC.md` only — the video, cinema, lipsync, marketing, canvas and projects pages did not exist while I worked, so none of the following has ever been exercised. Each is guarded with a `need(...)` message naming the control, so a mismatch fails in a few seconds with a readable sentence rather than hanging.

Test ids the tour depends on, by page:

- **Shell**: `sidebar`, `mobile-nav-toggle`, `credits-pill`, `command-palette`, `command-palette-item`.
- **Explore**: `hero-composer-input`, `showcase-filter-Cinematic`, `showcase-card-noir-detective`, `showcase-remix-noir-detective`.
- **Studios (shared)**: `prompt-input`, `generate-button`, `queue-panel`, `output-canvas`, `output-image`, `output-video`, `provider-badge`, `ratio-16:9`, `quality-high`.
- **Cinema**: `keyframe-dropzone` (+ `-input`), `camera-preset-orbit`, `duration-3`.
- **LipSync**: `portrait-dropzone`, `audio-dropzone`, `mouth-x-slider`, `mouth-y-slider`, `lipsync-mode-audio`.
- **Marketing**: `product-url-input`, `ad-template-ugc-review`, `ad-tone-luxury`, `packshot-dropzone`.
- **Canvas**: `canvas-root`, `canvas-node`, `node-prompt-input`, `canvas-run-all`, `node-output-video`.
- **Library / detail**: `library-search`, `library-filter-cinema`, `media-card`, `project-title`, `project-remix`.
- **Account**: `account-tab-plans`, `plan-card-pro`, `account-tab-storage`, `storage-usage`.

Behavioural assumptions the tour makes — please confirm or tell me to change them:

1. **`node-output-video` is not in the SPEC test-id list.** I used it because it was specified for this tour, but the canvas agent must actually emit it on the motion node. If the canvas names it something else, that one line changes.
2. **The node canvas opens with a starter graph.** The tour clicks `canvas-run-all` and expects at least one `canvas-node` to already exist; it fails with an explicit message if the canvas boots empty. If the canvas starts blank by design, either seed `fluxframe-canvas-v1` in the tour or add `canvas-add-prompt` / `canvas-add-image` / `canvas-add-motion` clicks plus edge creation (dragging ports is the fragile part — a seeded graph is the better demo anyway).
3. **Clicking a `media-card` navigates to `/projects/:id`** and **`project-remix` navigates to a `/create/*` route**. Both are asserted with `toHaveURL`.
4. **A cinema project exists by the time the Library beat runs**, so `library-filter-cinema` is not an empty state. It is generated earlier in the same tour; if the cinema beat is ever reordered or removed, change the filter.
5. **`lipsync-mode-audio` can be clicked before the audio upload** and the audio dropzone is visible in that mode.
6. **The marketing page accepts a packshot upload.** The tour uploads `FIXTURES.packshot` so the ad renders without a Pollinations round trip — this is what keeps `DEMO_LIVE=1` inside the anonymous rate limit (only the Image Studio beat and the canvas image node hit the endpoint).
7. **Viewport churn is intentional**: the mobile beat drops the viewport to 412×915 and the wrap beat restores 1440×900. The recorded video stays 1440×900 (set by the `demo` project), so the phone beat is pillarboxed in the b-roll. That reads fine; do not "fix" it by removing the restore, or the final frames are phone-sized.
8. **`page.video()?.saveAs("demo/walkthrough.webm")`** runs after `page.close()` inside a try/catch and only logs on failure. Paths are relative to the repo root, which is where the npm scripts run Playwright from. `.gitignore` already excludes `demo/*.webm`.

## Claims in the docs I verified from source (no action needed)

Recorded here so nobody re-derives them: six image engines and their credit costs (5–12), eleven camera presets, six focal lengths (18–135 mm), five apertures (f/1.4–f/16), durations 3/5/10 s at 30 fps, six aspect ratios, five creative apps, four ad templates (9.0–11.0 s total scene duration), four brand tones, three ad formats, flat 25-credit marketing cost, 1,000 starting credits, Cinema Pro granting 1,500, max 400 stored projects, last 200 credit transactions, 15 MB / 2048 px image uploads, 25 MB / first 60 s audio, 640 px thumbnails, video long edge 1280 snapped to multiples of 16, 6 Mbit/s encode, the codec preference order ending in MP4, the 15 s rate-limit window, 3 attempts and the 60 s timeout.

One wording nit I left alone: `README.md` says the showcase is "filterable by ten categories". `SHOWCASE_CATEGORIES` has ten entries, but one of them is "All" — so it is nine categories plus an All tab. Change it to "nine categories" if you want to be literal.

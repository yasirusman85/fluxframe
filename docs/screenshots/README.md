# README screenshots

Every image in this folder is generated, not hand-captured. They are produced by the Playwright demo tour (`e2e/demo/tour.spec.ts`) so the README always shows the product as it actually renders, at one consistent size, with a clean library and the same seeded fixtures.

## How to regenerate them

```bash
npm ci
npx playwright install chromium   # once
npm run demo:screenshots          # DEMO=1 SCREENSHOTS=1 playwright test --project=demo
```

That runs the tour once (a few minutes — it renders real video) and overwrites every PNG below. The same command also produces `demo/walkthrough.webm`, the b-roll for the demo video; `npm run demo:record` is the identical run without the screenshot step.

Details that matter for consistent output:

- The `demo` Playwright project exists only when `DEMO=1`, and pins the viewport to **1440×900** with `colorScheme: "dark"` (`playwright.config.ts`).
- The tour calls `resetStorage()` first, so every shot is taken against a clean `localStorage` and a freshly deleted `fluxframe` IndexedDB database.
- Pollinations is mocked by default, so image outputs are the bundled fixture and the shots are deterministic. Pass `DEMO_LIVE=1` to shoot against the real endpoint instead (slower: ~1 request / 15 s, and the images will differ every run).
- `11-mobile.png` is taken after the tour switches the viewport to **412×915** and opens the off-canvas navigation drawer.

## Naming convention

`NN-page-name.png`, zero-padded, in the order the tour visits the pages. The numbers are the tour's beat order, not the README's; keeping them stable means a new shot is added at the end rather than renumbering the existing set. The names are written in one place — the `shot(page, "…")` calls in `e2e/demo/tour.spec.ts` — and consumed by `README.md`, so both must be updated together.

| File | Beat in the tour | Where the README uses it |
| --- | --- | --- |
| `01-explore.png` | Explore, hero above the fold | Header image and **Feature tour → Explore `/`** |
| `02-image-studio.png` | Image Studio with a completed generation | **Image Studio `/create/image`** |
| `03-cinema-studio.png` | Cinema Studio with the rendered clip playing | **Video Studio & Cinema Studio** |
| `04-lipsync-studio.png` | LipSync after an audio-driven render | **LipSync Studio `/create/lipsync`** |
| `05-marketing-studio.png` | Marketing Studio with the finished ad | **Marketing Studio `/create/marketing`** |
| `06-canvas.png` | Node canvas after **Run all** | **Node Canvas `/canvas`** |
| `07-library.png` | Library, filtered | **Library `/projects`** |
| `08-project-detail.png` | A project detail page | **project detail `/projects/:id`** |
| `09-account.png` | Account → Plans tab | **Account `/account`** |
| `10-command-palette.png` | Command palette searching "cinema" | **Command palette & keyboard** |
| `11-mobile.png` | 412×915 with the nav drawer open | **Mobile** |

## They are committed

The PNGs are checked into the repository — GitHub renders the README from the default branch, and a reviewer reading it on github.com must see the screenshots without cloning or running anything. Only the demo video is ignored (`.gitignore` excludes `demo/*.webm` and `demo/*.mp4`, which are tens of megabytes and are uploaded to the submission instead).

When you regenerate them, review the diff before committing: an unexpectedly empty state, a visible error toast or a stale job in a shot is a bug report, not a screenshot.

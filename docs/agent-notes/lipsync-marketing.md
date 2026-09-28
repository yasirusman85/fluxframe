# LipSync + Marketing studios — implementation notes

Owned files:

```
src/features/lipsync-studio/LipSyncStudioPage.tsx   (named + default export)
src/features/lipsync-studio/lipsync-form.ts         (pure: defaults, prefill, generate payload)
src/features/marketing-studio/MarketingStudioPage.tsx (named + default export)
src/features/marketing-studio/ad-form.ts            (pure: template/tone/copy, storyboard, payload)
e2e/lipsync-studio.spec.ts
e2e/marketing-studio.spec.ts
```

Both pages follow `features/image-studio/ImageStudioPage.tsx`: two columns on `lg`
(controls 5/12, output 7/12), all form logic in a pure sibling module, a 3-job queue cap
("Queue full"), a balance hint under the primary button, `⌘/Ctrl+Enter` to generate,
`OutputCanvas` + a "Recent" row of `MediaCard`s + a link into the filtered library, and a
single `parseStudioParams` prefill on mount.

## What the pages send to the engines

Verified field by field against `lib/pipelines/lipsync.ts`, `lib/render/lipsync.ts`,
`lib/pipelines/ad.ts` and `lib/render/ad.ts`.

### LipSync (`buildLipsyncRequest`)

| field | read by |
| --- | --- |
| `sourceAssetId` | `resolveSourceImage` — uploaded portrait, else a portrait is generated |
| `prompt` | `portraitPrompt(project.prompt)` **when no portrait is uploaded** |
| `audioAssetId` | selects the audio branch (`decodeAudio` → `computeEnvelope` → muxed tracks) |
| `lipsync.script` | `envelopeFromScript` (script branch) |
| `lipsync.expression` / `.amplitude` / `.mouthX` / `.mouthY` / `.captions` / `.visualizer` | `renderLipsyncVideo` |
| `model` | `findModel(...)?.look` (grain/vignette/tint/handheld) |
| `aspectRatio` | `videoDimensionsFor` |

Notes and small mismatches found:

1. **`prompt` must describe a face when nothing is uploaded.** The pipeline feeds
   `project.prompt` straight into `portraitPrompt()`, so `lipsyncPrompt()` returns the
   portrait-description field (or `DEFAULT_PORTRAIT_DESCRIPTION`) in that case, and only
   falls back to the script/description once a portrait exists.
2. **`LipSyncSettings.mode`, `.voice` and `.audioFileName` are never read by the pipeline.**
   They are UI/remix metadata (mode restores the tab, voice drives "Play with voice",
   the file name titles the project). Harmless, but do not add engine behaviour to them.
3. **Captions only work in script mode.** `drawCaptions` needs `envelope.words`, which only
   `envelopeFromScript` produces, so the page hides the switch in audio mode and forces
   `captions: false` in the payload rather than sending a promise the renderer cannot keep.
4. **Two constants are duplicated on purpose** in `lipsync-form.ts`:
   `DEFAULT_MOUTH_X/Y` (= `DEFAULT_MOUTH` in `render/lipsync.ts`) and `SCRIPT_CAP_SECONDS`
   (= `MAX_SCRIPT_SECONDS` in `pipelines/lipsync.ts`). Importing either module from the page
   would pull the canvas recorder (and `fix-webm-duration`) into the studio chunk, defeating
   the lazy pipeline import. **If those values change, change them here too.**
5. Script mode exports **silent** video — the page says so in plain words and offers
   "Play with voice" (`play-with-voice`), which starts the rendered `output-video` and
   `speakText()` together. Audio mode is the voiced path.

### Marketing (`buildAdRequest`)

| field | read by |
| --- | --- |
| `sourceAssetId` | `resolveSourceImage` — uploaded packshot, else generated from `marketing.productName` |
| `marketing.template` | `AD_TEMPLATES[...].scenes` (scene kinds, durations, motions) |
| `marketing.format` | `videoDimensionsFor` (falls back to `project.aspectRatio`; the page sets both) |
| `marketing.accent` / `.secondary` | background glows, chips, CTA pill, progress bar |
| `.headline` `.subheadline` `.cta` `.proof` `.features` `.productName` `.productUrl` | `sceneBlocks` per scene kind |
| `creditCost` | fixed 25 (SPEC) |

Notes and small mismatches found:

1. **`marketing.tone` reaches the project but not the renderer** — only the colours it
   produced (`accent`, `secondary`) are drawn. It is still stored so `remixUrl` can
   round-trip the tone back into the studio.
2. **`duration` is supplied and then overwritten.** `adPipeline` returns
   `Math.round(durationMs / 100) / 10`, so the page's `Math.round(totalSceneMs / 1000)` only
   labels the job while it is queued. That is deliberate — the queue panel and library card
   would otherwise show the store's default 5 s.
3. **`ad-form.ts#featureLines` mirrors `render/ad.ts#featurePhrases`** (explicit lines first,
   otherwise the subheadline/headline split on punctuation, max 3) so the storyboard shows
   exactly the chips that will be drawn. Keep the two in sync.
4. `model: "ad-engine"` is not in `ALL_MODELS`; `findModel` returns `undefined`, which is fine
   because `adPipeline` never calls it and `media/project-meta.ts#modelLabel` already maps the
   id to "Ad engine".
5. The storyboard reproduces the renderer's fallbacks (`"Introducing"`, `"Loved by thousands"`,
   `"Learn more"`), so an empty copy field previews the same text the clip will show.

## Page-specific behaviour worth knowing

- **Mouth calibration.** The draggable crosshair is an absolutely positioned overlay on the
  portrait preview; it is `aria-hidden` because it only duplicates `mouth-x-slider` /
  `mouth-y-slider`, which remain the keyboard/AT path. Pointer positions are clamped to
  0..1 and rounded to the sliders' 0.01 step. The overlay deliberately has no `z-index` so
  the Dropzone's `z-10` "Remove" button stays clickable above it.
- **Auto-filled ad copy.** `AdForm.touched` is a `ReadonlySet<AdCopyField>`; changing the
  tone or the product name re-derives every field *not* in that set (`applyAutoCopy`).
  Typing in a field adds it to the set, "Reset copy" empties it. A store URL fills the
  product name only until the name is typed by hand (`nameTouched`).
- **Object URLs** for uploads are revoked when the file is replaced or cleared, not in an
  effect cleanup: `<React.StrictMode>` runs effect cleanups once on mount in dev, which
  would revoke a URL that is still on screen.
- **9:16 output** is wrapped in `max-w-[360px]` so the empty/processing stage does not become
  a 1000 px tall column; the completed video is already capped by `OutputCanvas`.

## Shared code

Nothing outstanding. Three shared-component problems showed up while these pages were
built and were **fixed by their owners during the same session** — recorded here in case
they regress:

- `Dropzone` used `role="button"` around the hidden file input, which axe reported as
  `nested-interactive` (serious) + `label` (critical). It is now a real `<label>` + input.
- Hint/description text across `components/ui`, `components/generation` and
  `components/media` was `zinc-500`, which measures ~3.8:1 on `surface-1`/`surface-2` and
  fails WCAG AA. It is now `zinc-400` (~7.4:1). **Keep meaningful text at zinc-400 or
  lighter on these panels.**
- `checkA11y` now calls `settleAnimations` first. Without it, a panel still playing its
  0.18 s `animate-fade-in` is sampled mid-fade and reports contrast violations — that made
  the LipSync audio-tab check flaky.

One suggestion for `e2e/helpers.ts` (owned by the e2e agent, not applied here):
`waitForJobComplete` reports `pending` until it times out when a job is interrupted by a
page reload — the queue panel disappears and no output ever arrives. Detecting the
project's "Interrupted by a page reload" failed state would turn a 120 s timeout into an
instant, clear failure.

## E2E

`npx playwright test e2e/lipsync-studio.spec.ts e2e/marketing-studio.spec.ts` — 11 tests,
all green (`--workers=1`, chromium).

- Rendering is **real time** (MediaRecorder): the LipSync script clip is ~7 s, the ad
  templates are 9–9.5 s. Rendering tests use `test.setTimeout(150_000)` and
  `waitForJobComplete(page, 120_000)`; the whole file still runs in about a minute.
- Request counting is the cheap proof of the source path: an uploaded portrait/packshot
  means `mock.requests.length === 0`, no upload means exactly one Pollinations image.
- Chromium exposes no reliable way to inspect the audio track of a blob-backed `<video>`,
  so the audio-mode test asserts the clip length matches the 3 s fixture instead.
- **When running these locally, do not edit source files at the same time.** A Vite HMR
  full reload during a render marks the job "Interrupted by a page reload" and the wait
  helper then times out. Every timeout seen while writing these specs had that cause and
  passed on a stable tree.

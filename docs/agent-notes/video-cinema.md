# Video + Cinema studios — notes, contracts and change requests

Files owned by this agent: `src/features/video-studio/{VideoStudioPage.tsx,prefill.ts}`,
`src/features/cinema-studio/{CinemaStudioPage.tsx,prefill.ts}`,
`e2e/{video-studio,cinema-studio}.spec.ts`. Both pages export named **and** default
(`router.tsx` lazy-imports the named export).

## What the pages do

- Both drive `pipelines/motion.ts`: prompt → AI keyframe (Pollinations) → in-browser
  camera-motion render, or uploaded keyframe → render. The one-line "How this clip is made"
  note under the generate button always states which of the two will run, so the page never
  over-promises.
- `generate({ type, prompt, model, aspectRatio, duration, motionStrength, cameraMotion,
  sourceAssetId, creditCost, title })`. `title` is `"Keyframe animation"` when the prompt is
  empty (keyframe-only run) and `undefined` otherwise, so the store derives it from the prompt.
- Generate is enabled with **a prompt or a keyframe** (not both), disabled at 3 active jobs of
  that type ("Queue full"), and shows `Generate · {cost} credits` from `model.creditCost`.
- `motionStrength` is **1..10**, the scale `render/motion.ts` expects (`k = strength / 6`), not a
  percentage. `ProjectDetailsPanel` currently renders it as `{motionStrength}%` — cosmetic
  mismatch, worth changing to `x/10` (projects agent's file).
- Keyframe state lives in the form as `{ sourceAssetId, sourceUrl, sourceName }`:
  `storeUploadedImage(file)` inside `Dropzone.onFile` (errors propagate so the Dropzone renders
  them inline), `sourceUrl` gives an instant preview, and a deep-linked `?source=<assetId>` is
  resolved with `useAssetUrl`. `onClear` clears all three.
- After a job is cancelled or fails it leaves `activeJobs`, so both pages remember `lastJobId`
  and keep feeding that project to `OutputCanvas.activeJob` until it completes. Without this the
  queue panel (with its reason and Retry) vanishes the instant a job is cancelled.
- `OutputCanvas.onRemix` re-loads the form in place via `formFromProject` (prompt, engine, ratio,
  duration, motion strength, camera) and reuses `sourceAssetId ?? keyframeAssetId` as the source,
  matching what `remixUrl()` puts in the query string.

## prefill.ts (pure, per studio)

`formFromParams(parseStudioParams(search))` validates every deep-linkable value and silently
falls back to defaults: model must be in that studio's list, ratio in `VIDEO_RATIO_IDS`
(16:9, 9:16, 1:1, 4:3) / `CINEMA_RATIO_IDS` (16:9, 21:9, 9:16, 1:1), duration in `VIDEO_DURATIONS`,
`camera` in `CAMERA_PRESETS` (→ `cameraFromPreset`, keeping the current lens optics).
Defaults: first model of the list, 16:9, 5 s, motion strength 6, `DEFAULT_CAMERA`.
`cinema-studio/prefill.ts` also exports `describeLook(model)` — the shot sheet's engine line
("Letterboxed 2.39:1", "Speed-ramped", "Light leaks", "Film grain", "Clean, minimal grain",
"Handheld"), derived from `model.look` so the copy cannot drift from the renderer.
The two prefill modules deliberately stay self-contained (no cross-feature import); the shared
part is three ~3-line validators.

## E2E

- `e2e/video-studio.spec.ts` (5) and `e2e/cinema-studio.spec.ts` (5). Setup order per spec:
  `resetStorage` → `mockPollinations` → `gotoApp`. Video renders in real time, so every
  rendering test uses `duration-3` and `test.setTimeout(120_000)`; a 3 s clip completes in ~5 s
  headless, well inside the 90 s `waitForJobComplete` budget.
- Covered: text→video (one Pollinations request, `provider-badge[data-provider=motion-engine]`,
  `<video>.duration` finite and 2–5 s), keyframe upload (preview `img`, empty prompt still
  generates, **zero** Pollinations requests), real `.webm`/`.mp4` download, query-param prefill,
  camera preset → slider → custom-move release → focal/aperture → shot sheet, cancel (panel goes
  `data-status="cancelled"` and the credits pill does **not** change — cancel never refunds,
  only failures do), and axe.
- Locators are scoped to `output-canvas` (`queue-panel`, `provider-badge`, `output-video`) so the
  header's jobs dropdown and the Recent row can never cause a strict-mode violation.
- **Status: 8/10 pass.** The two `checkA11y` tests fail on pre-existing shared-component
  violations (see below) — `e2e/image-studio.spec.ts`'s a11y test fails the same way today.
- Caveat when running locally while other agents write files: Vite HMR reloads the page, the
  store's `markInterruptedJobs()` kills the in-flight render and `waitForJobComplete` then times
  out. Re-run when the tree is quiet; CI uses `vite preview`, so it cannot happen there.

## Change requests for shared code (integrator)

axe (`wcag2a`+`wcag2aa`, critical/serious) on `/create/video` and `/create/cinema`. None of these
are in files this agent owns; all of them also affect other studios.

1. **`src/components/ui/Dropzone.tsx` — `label` (critical):** the hidden `<input type="file">`
   has no accessible name. Add `aria-label={label}` to the input (it is `sr-only`, not
   `aria-hidden`, so axe sees it).
2. **`src/components/ui/Dropzone.tsx` — `nested-interactive` (serious):** the same input lives
   inside the drop area, which has `role="button"`. Move the `<input>` out of the `role="button"`
   element (sibling inside the wrapper `div`, still triggered through `inputRef`).
3. **`color-contrast` (serious), all `text-zinc-500` / `text-zinc-600` body text on
   `bg-surface-1` (#0f0f12) / `bg-surface-2` (#141418):** zinc-500 = 3.9:1 and zinc-600 = 2.5:1,
   both below the 4.5:1 AA threshold for text under 18 px. `text-zinc-400` measures 7.5:1 and
   fixes every node. Affected: `ModelSelector` (description, speed, "via Pollinations" line),
   `SegmentedControl` (option `description`), `EmptyState` (description), `Input`/`Textarea`
   (`hint`, character counter), `Card`'s `SectionTitle` (`hint`), `Slider` (`hint`),
   `Dropzone` (`hint`), `CameraMotionControl` (`GroupLabel`, active-preset name, and the
   `text-zinc-600` category labels), `OutputCanvas`/`QueuePanel`/`MediaCard` meta lines.
   Suggested: one pass replacing `text-zinc-500` → `text-zinc-400` and `text-zinc-600` →
   `text-zinc-400` for real text in `src/components/ui/*` and `src/components/generation/*`
   (decorative dividers/icons can stay).

These two pages avoid the problem in their own markup: every hint is rendered as
`text-[11px] text-zinc-400` instead of passing `hint`/`SectionTitle hint` into the kit.

## For the LipSync / Marketing agents

The keyframe pattern here (`{assetId, url, name}` in form state, `useAssetUrl` for `?source=`,
`onFile` letting `storeUploadedImage` errors reach the Dropzone) transfers directly to
`portrait-dropzone` / `packshot-dropzone`; the Dropzone a11y fixes above apply to those pages too.

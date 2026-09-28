# unit-tests agent — notes for the integrator

Owned files (nothing under `src/` was modified):

```
tests/helpers/fixtures.ts
tests/lib-format.test.ts        tests/lib-aspect.test.ts      tests/lib-ids-async.test.ts
tests/lib-pollinations.test.ts  tests/lib-procedural.test.ts  tests/lib-audio.test.ts
tests/lib-query-params.test.ts  tests/lib-download.test.ts    tests/lib-catalog.test.ts
tests/store-project.test.ts     tests/store-credit.test.ts    tests/store-ui.test.ts
tests/store-account.test.ts     tests/generation-runner.test.ts
```

**315 tests / 868 assertions across 14 files.** Verified with:

```
npx vitest run tests/lib-*.test.ts tests/store-*.test.ts tests/generation-runner.test.ts   # 316 passed (315 mine)
npx eslint tests/lib-*.test.ts tests/store-*.test.ts tests/generation-runner.test.ts tests/helpers   # clean
npx vitest run                                                                             # 414 passed, 23 files
```

`src/test-setup.ts` needed no changes: happy-dom already provides `URL.createObjectURL` /
`revokeObjectURL`, `AbortSignal.any`, `File`, `Response`, `crypto.randomUUID` and
`requestAnimationFrame`. It has **no** `indexedDB`, `AudioContext`/`OfflineAudioContext` or
`speechSynthesis`, so the tests exercise the in-memory asset fallback, hand-build an
`AudioBuffer` for `computeEnvelope`, and assert the "speech unsupported" branches.

## What is covered

| File | Covers |
| --- | --- |
| `lib-format` | `formatDuration` (0 / 65 / NaN / Infinity / negative / fractional), `formatBytes` (0, 1023 B, 1.0 KB, 1.5 KB, 10 KB, MB, GB, the GB cap), `timeAgo` with an explicit `now` (just now → m → h → d → localised date, future clamp), `formatDateTime` year + time, `slugify` (unicode folding, emoji, symbol stripping, length cap, `"untitled"` fallback), `titleFromPrompt` (first clause on `,.;:\n`, capitalisation, word-boundary cap, hard slice, fallbacks), `pluralize` incl. irregular plurals |
| `lib-aspect` | `parseRatio` + fallbacks, `dimensionsFor` (long edge landscape/portrait, multiples of 16 for every ratio × 4 long edges, ratio fidelity, 64px floor, invalid → 16:9), `videoDimensionsFor` (1280 long edge), `cssAspect`, `ASPECT_RATIOS` unique ids / labels / `value` matching the id |
| `lib-ids-async` | `createId` prefix + 1000 unique ids, `hashString` determinism / sensitivity / uint32 range / 200-way spread, `randomSeed` range, `sleep` (fake timers, mid-sleep abort, pre-aborted), `anySignal` native **and** polyfill branch (`AbortSignal.any` removed with `Object.defineProperty`, restored with `delete`), `withTimeout` (result, timeout abort, caller abort), `throwIfAborted`, `isAbortError` for DOMException-like values, `nextFrame` |
| `lib-pollinations` | `sanitizePrompt`, `buildImageUrl` (path encoding, all query params, default model, `negative_prompt` only when supplied), `generateImage`: success (`attempts === 1`, blob, contentType, `onStatus`), fetch init (`mode: "cors"` + signal), 403→200 (`attempts === 2`, `getRateLimitRemainingMs() > 0`, rate-limit status message), 429, `not-image` (wrong content type **and** sub-64-byte body), HTTP 500 with retries, transport failure → `network`, pre-aborted signal rejects without fetching, **serialisation** via deferred promises, chain survives a failure. `sleep` is mocked (other `async` exports kept real) and `_resetPollinationsState()` runs in `beforeEach` |
| `lib-procedural` | Determinism per numeric/string seed and per title, divergence across seeds, `<svg>` shape, XML escaping of `<>&"'` in title and label, 60-char title truncation, ratio/long-edge dimensions, `proceduralDataUrl` prefix + round-trip decode, `proceduralBlob` type/size/content |
| `lib-audio` | `envelopeFromScript` (0..1 values, frame count, determinism, longer text → longer, wpm scaling, monotonic non-overlapping word timings, `.`/`,` pauses, 1.5 s floor, empty script), `estimateSpeechDurationMs`, `envelopeAt` clamping, `wordAt`, `computeEnvelope` against a fake `AudioBuffer` (alternating bursts/silence → peaks > 0.85 in bursts, < 0.15 in silence, `ceil(duration*fps)` frames, `maxSeconds` clamp, ≥ 1 frame), `validateAudioFile` (MIME, extensions, images/text rejected, 25 MB boundary), `isSpeechSupported`/`isAudioSupported` booleans, `speakText` handle when unsupported, `listVoices` |
| `lib-query-params` | `parseStudioParams` (all keys, trimming, numeric duration, invalid/zero/negative/missing duration, blanks → `undefined`), `buildStudioUrl` (bare route, skips empty, encodes + round-trips), `remixUrl` (full camera/marketing/lipsync round-trip, `sourceAssetId ?? keyframeAssetId`, omitted keys, one route per type) |
| `lib-download` | `extensionForMime` table + subtype/`bin` fallbacks, `filenameForProject` (slug + 6-char id suffix + extension, explicit MIME wins, `untitled`/`bin`), `downloadBlob` (`URL.createObjectURL` args, anchor `download`/`rel`, in-document at click, removed after, revoke fires at 10 s on fake timers), `downloadProject` (stored asset preferred over URL and no fetch, missing asset → CORS fetch, data URL, failed fetch → `window.open`, non-OK response → `window.open`, no output → throws) |
| `lib-catalog` | Unique model ids, `creditCost > 0` + valid `engine` + copy for every model, image models have a `styleSuffix`, render models have a `look`, one popular model per catalog, `findModel`/`modelsForType` (incl. `marketing` → `[]`), camera preset ids/categories, `DEFAULT_CAMERA` points at a real preset with valid optics, `cameraFromPreset` (axes copied, focal/aperture from the base, defaults), `describeCamera` (pan right/left, tilt, zoom, dolly, orbit, dutch angle, `static shot`, dead zone, lens + aperture, all presets), `productNameFromUrl` (slug with year, multi-word, `.html`, bare/`www` domains, unusable input → `""`), showcase (unique ids, categories ⊆ `SHOWCASE_CATEGORIES`, `.jpg` previews, prompts/seeds, real camera presets), `CREATIVE_APPS` (unique ids/keys, required fields, every select has > 1 unique option), `AD_TEMPLATES` (scene durations sum > 0 and ≥ 5 s, hook → … → cta, format offered by `AD_FORMATS`), `BRAND_TONES` (hex colours, product name in every headline, exact copy for two tones), `VIDEO_DURATIONS`, `SUBSCRIPTION_TIERS` (rising allowances), `PROMPT_ENHANCERS`, `AD_FORMATS` |
| `store-project` | `createProject` defaults (prompt title, seed, `mediaKind`, duration 5 / fps 30 for all video types, `queued`, quality, origin) and explicit overrides, blank title/negative-prompt handling, `MAX_PROJECTS` cap, `updateProject` merge + `updatedAt` bump + unknown-id no-op, `deleteProject`/`deleteProjects` (assets released, **assets kept when a duplicate still references them**, job id dropped), `duplicateProject` (`(copy)`, `origin: "remix"`, `parentId`, `sample` tag stripped, unknown id), `renameProject` (trim, ignore blank, 80-char cap), `toggleFavorite`, `setJobActive` idempotency, `markInterruptedJobs` (count, `failed` + message, active list cleared, zero case), `clearAllProjects`, `resetToSamples` (six samples), selectors `selectLatestCompleted`/`selectActiveJobs`/`selectProjectsOfType`. `../src/lib/asset-store` is mocked so `deleteAsset` calls are assertable |
| `store-credit` | Initial grant state, `canAfford` boundaries, `spend` (success, overdraw refused with no state change, zero/negative no-op, down to exactly 0), `grant` (incl. non-positive no-op), `refund` (lifetimeSpent floors at 0), history newest-first / unique ids / 200-entry cap, `setPlan`, `openTopUp`/`closeTopUp`, `reset` |
| `store-ui` | `addToast` id + defaults (info 4000, error 6000, success/warning 4000), explicit duration/title/action, auto-dismiss on fake timers at exactly the duration, `duration: 0` sticky, five-toast cap (and *which* five), `dismissToast` (removes, `clearTimeout` called, no later side effect, other toasts untouched, unknown id), sidebar/mobile-nav/command-palette setters and toggles, lightbox open/replace/close, the non-React `toast()` helper |
| `store-account` | Defaults, `updateProfile` (partial patch, empty patch, actions survive), `createApiKey` (`ff_live_` + 32 `[a-z0-9]`, prepended, unique, name trim / `Untitled key`), `maskApiKey` shape (12 + `…` + 4 = 17 chars), `revokeApiKey` (kept, flagged), `deleteApiKey`, unknown ids, `setPreference` isolation, `initialsOf` (`"Yasir Usman"` → `YU`, `""` → `FF`, single word → one letter, extra whitespace) |
| `generation-runner` | `friendlyError` for all five `PollinationsError` kinds + `Error`/non-`Error` fallbacks; `startGeneration` success (output fields, progress 100, `completedAt`, `renderMs`, `activeJobIds` cleared, success toast in `useUIStore`), progress clamping to 99 + `processing` state mid-flight, failure (status `failed`, **credits refunded**, error toast titled "Generation failed"), no refund for a free job, idempotency (same promise, pipeline called once), unknown project; `cancelGeneration` mid-flight (status `cancelled`, **no refund**, no error toast) and for queued/finished/unknown projects; `cancelAllGenerations`; `retryGeneration` (re-charges, re-runs, **preserves the `startGeneration(id, override)` pipeline override**, falls back to `getPipeline`, blocked + top-up when credits run out, no re-charge for a cancelled job, unknown/already-running); `useGeneration().generate` via `renderHook` (empty prompt → warning + nothing created, input file substitutes for a prompt, insufficient credits → project deleted + top-up opened + nothing started, happy path → project + charge + `startGeneration(id, undefined)`, custom pipeline forwarded and not stored on the project, `activeJobs`/`isBusy`/`latestCompleted` scoped by type, `cancel` === the runner's `cancelGeneration`). `../src/lib/pipelines` is factory-mocked; `../src/lib/generation-runner` uses `vi.mock(…, { spy: true })` so the real runner runs while `useGeneration`'s call to `startGeneration` stays assertable |

`tests/helpers/fixtures.ts` exports `makeProject`, `makeCamera`, `makeMarketing`, `makeLipsync`,
`makeAudioBuffer` (fake `AudioBuffer`), `fakeFile`, `imageResponse`, `deferred`, `flush`,
`resetFixtures`. Everything is counter-driven, so no test depends on `Date.now()` or `Math.random()`.

---

## Bugs found (not fixed — please review)

### 1. `useGeneration.generate` destroys the user's uploaded asset when credits are short

**Severity: high (user-visible data loss).** `src/hooks/useGeneration.ts` creates the project
*before* charging. When `spend` fails it calls `deleteProject`, and
`project-store.releaseAssets` then `deleteAsset`s every asset id the project referenced —
including the `sourceAssetId` / `audioAssetId` the user just uploaded. The studio page still
holds that asset id in its own state, so after topping up, the next attempt renders from a
dangling id (portrait / keyframe / packshot / audio silently gone).

Confirmed: after a blocked `generate({ …, sourceAssetId })`, `getAsset(assetId)` returns
`undefined`.

Suggested patch — check affordability before creating anything:

```diff
--- a/src/hooks/useGeneration.ts
+++ b/src/hooks/useGeneration.ts
@@
-  const spend = useCreditStore((s) => s.spend);
+  const spend = useCreditStore((s) => s.spend);
+  const canAfford = useCreditStore((s) => s.canAfford);
   const openTopUp = useCreditStore((s) => s.openTopUp);
@@
       const { pipeline, ...projectInput } = input;
+      if (input.creditCost > 0 && !canAfford(input.creditCost)) {
+        addToast(`You need ${input.creditCost} credits for this generation.`, { type: "warning", title: "Not enough credits" });
+        openTopUp();
+        return null;
+      }
       const project = createProject(projectInput);
-      if (input.creditCost > 0 && !spend(input.creditCost, `${TYPE_LABELS[input.type]} · ${project.title}`, project.id)) {
-        useProjectStore.getState().deleteProject(project.id);
-        addToast(`You need ${input.creditCost} credits for this generation.`, { type: "warning", title: "Not enough credits" });
-        openTopUp();
-        return null;
-      }
+      spend(input.creditCost, `${TYPE_LABELS[input.type]} · ${project.title}`, project.id);
```

(remember to add `canAfford` to the `useCallback` dependency array). The existing tests assert
only the observable contract — project deleted, top-up opened, `null` returned — so they keep
passing after this change.

An alternative, if you prefer to keep the create-then-charge order: give
`deleteProject`/`deleteProjects` a `releaseAssets = true` flag and pass `false` here.

### 2. `startGeneration` can leave a permanently "running" project

**Severity: medium (recoverable only by reload).** In `src/lib/generation-runner.ts` the async
IIFE is started *before* `running.set(projectId, …)`. Note that
`pipelineOverride ?? (await getPipeline(...))` short-circuits, so with an override there is no
`await` before `await pipeline(ctx)`; if that pipeline throws **synchronously** the whole
`try/catch/finally` — including `running.delete(projectId)` — runs before `running.set` ever
happens. The stale entry makes `isRunning(id)` permanently `true`, `startGeneration` return the
old promise, and `retryGeneration` bail out, so the project can never be run again.

Confirmed: with a synchronously throwing override, `isRunning(project.id) === true` after the
job settled (status `failed`, `activeJobIds` empty).

Suggested patch — register the controller before the work starts:

```diff
   const controller = new AbortController();
+  let promise!: Promise<void>;
+  const register = () => running.set(projectId, { controller, promise });
-  const promise = (async () => {
+  promise = (async () => {
+    register();
     store.setJobActive(projectId, true);
```

Simpler still: wrap the pipeline call so it can never throw synchronously —

```diff
-      const output = await pipeline({
+      const output = await Promise.resolve().then(() => pipeline({
         project: current,
         signal: controller.signal,
         report: (progress, stage) => { … },
-      });
+      }));
```

Also worth a look: `pipelineOverrides` is never cleared, so a Creative-App pipeline stays
referenced for the lifetime of the tab even after its project is deleted. A
`pipelineOverrides.delete(projectId)` inside `deleteProjects` (or in the runner's `finally`
when the project no longer exists) would close that leak.

### 3. `timeAgo` prints "0m ago" for 45–59 seconds

**Severity: cosmetic.** `src/lib/format.ts` switches away from `"just now"` at 45 s but the
next branch is minute-based, so 45–59 s renders as `"0m ago"`. Either raise the `"just now"`
threshold to 60 s, or floor the minute count to 1:

```diff
-  if (s < 45) return "just now";
+  if (s < 60) return "just now";
   const m = Math.floor(s / 60);
```

### 4. `slugify` strips trailing dashes but not leading ones

**Severity: cosmetic.** `slugify("--foo__bar--")` → `"-foo-bar"`, so a prompt starting with
punctuation produces filenames such as `fluxframe--foo-bar-123456.jpg`. Tests currently assert
today's behaviour only for inputs without a leading separator.

```diff
-      .replace(/-+$/g, "") || "untitled"
+      .replace(/^-+|-+$/g, "") || "untitled"
```

### 5. `formatBytes` has no TB unit

**Severity: cosmetic.** The unit list stops at `GB`, so a storage estimate of 3 TB renders as
`"3072 GB"` on the Account → Storage tab. Appending `"TB"` to `units` fixes it; the test asserts
the current output and would need its expectation updated alongside.

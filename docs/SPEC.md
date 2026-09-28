# FluxFrame — engineering spec for parallel agents

FluxFrame is a Higgsfield-style AI creative studio that runs entirely in the browser.
It is being resubmitted for a Software Engineer take-home whose reviewer said the
product "looks incomplete". Every screen must therefore be *complete*: real
outputs, real state, empty/loading/error states, keyboard + screen-reader support,
mobile layout, and E2E coverage. Brand name is **FluxFrame** (never "Higgsfield Clone").

What is real:
- Text-to-image via the public Pollinations endpoint (`src/lib/pollinations.ts`,
  rate-limited to ~1 req / 15 s anonymously; the client serialises and backs off).
- Video files (.webm) produced by in-browser canvas renderers + MediaRecorder
  (`src/lib/render/*`). Video/Cinema studios: text → AI keyframe → camera-motion clip.
  LipSync: portrait + audio envelope → talking-portrait clip (audio muxed when uploaded).
  Marketing: packshot → multi-scene ad clip with typography.
- Assets persisted as blobs in IndexedDB (`src/lib/asset-store.ts`), metadata in
  localStorage (Zustand persist). Downloads are real files.
What is simulated and must be labelled: credits/plans/API keys (local only).

## Conventions (mandatory)
- React 19, TypeScript strict with `noUnusedLocals`/`noUnusedParameters`. ESLint forbids
  `any` and requires `import type` for type-only imports (`verbatimModuleSyntax`).
- Tailwind v4 tokens from `src/styles/globals.css`: `brand-50…950` (emerald accent),
  `surface-0…3`, `font-sans`, `font-mono`, `animate-fade-in`, `animate-slide-up`,
  utilities `.glass`, `.glow-brand`, `.text-gradient-brand`, `.skeleton`, `.dot-grid`.
  Neutrals are zinc. Panels: `rounded-2xl bg-surface-1 border border-zinc-800/80`.
  Controls: `rounded-xl`. Never introduce violet/rose/cyan accents for whole studios —
  studio identity comes from icons and copy, not clashing palettes. Small semantic
  colour is fine (rose for destructive, amber for credits, sky for info).
- Icons: `lucide-react`. Motion: `framer-motion` (keep subtle; respect reduced motion).
- `cn()` from `src/lib/cn.ts` for class merging.
- Accessibility: icon-only buttons use `<IconButton label>` or `aria-label`; every input
  has a label; dialogs use `<Modal>`; lists of choices use `SegmentedControl`/`Tabs`
  (they handle aria-pressed/roles); focus is visible (global CSS ring).
- Copy: concise, product-grade, no "prototype note" banners. Provider transparency is a
  small `Badge` (e.g. "Pollinations", "Motion engine", "Procedural fallback").
- Do NOT edit files you do not own (see ownership). If you need a change in shared code,
  write it to `docs/agent-notes/<your-agent-name>.md` and the integrator applies it.
- Verify your own files with:
  `npx eslint <files>` and `npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -E "<your paths>"`.
  Other agents' files may be missing/incomplete while you work — only fix errors in yours.
- Use `data-testid` exactly as listed below; E2E specs are written against them.

## Directory map & ownership
```
src/
  app/            router.tsx providers.tsx App.tsx           → shell agent
  main.tsx                                                    → shell agent
  components/
    ui/            (DONE – shared kit, read-only)              → integrator
    app-shell/     Layout Sidebar Header CommandPalette ErrorBoundary RouteError Lightbox → shell agent
    generation/    ModelSelector RatioSelector DurationSelector CameraMotionControl
                   PromptEnhancer QueuePanel MotionPreview     → components agent
    media/         VideoPlayer MediaCard OutputCanvas ProviderBadge ImageCompare → components agent
    canvas/        node canvas internals                       → canvas agent
  features/
    explore/       ExplorePage                                 → explore-image agent
    image-studio/  ImageStudioPage                             → explore-image agent
    video-studio/  VideoStudioPage                             → video-cinema agent
    cinema-studio/ CinemaStudioPage                            → video-cinema agent
    lipsync-studio/LipSyncStudioPage                           → lipsync-marketing agent
    marketing-studio/MarketingStudioPage                       → lipsync-marketing agent
    canvas/        CanvasPage                                  → canvas agent
    apps/          AppsPage (+ AppRunModal)                    → apps-account agent
    account/       AccountPage (+ TopUpModal)                  → apps-account agent
    projects/      ProjectLibraryPage ProjectDetailPage        → projects agent
    not-found/     NotFoundPage                                → shell agent
  hooks/           useAsset useGeneration useDocumentTitle useMediaQuery (DONE)
  lib/             (DONE) + render/motion.ts render/lipsync.ts render/ad.ts
                   pipelines/{image,motion,lipsync,ad}.ts apps.ts → engines agent
  store/           (DONE)
  types/           (DONE)
tests/             unit tests (vitest + RTL, happy-dom)        → each agent adds for own code
e2e/               Playwright                                 → e2e agent (+ page agents add specs)
docs/              README assets, DEMO-SCRIPT.md               → docs agent
```
Read these DONE files before coding — they are the contracts:
`src/types/project.ts`, `src/lib/catalog.ts`, `src/lib/asset-store.ts`, `src/hooks/useAsset.ts`,
`src/hooks/useGeneration.ts`, `src/lib/generation-runner.ts`, `src/lib/pipelines/index.ts`,
`src/store/*.ts`, `src/lib/query-params.ts`, `src/lib/download.ts`, `src/lib/image-utils.ts`,
`src/lib/audio-utils.ts`, `src/lib/render/canvas-recorder.ts`, `src/lib/render/drawing.ts`,
`src/components/ui/index.ts` (and each component's props).

## Key APIs (summary — the source is authoritative)
- `useGeneration(type?)` → `{ generate(input: CreateProjectInput & {creditCost}) => GenerationProject|null,
  cancel(id), retry(id), activeJobs, activeJob, isBusy, latestCompleted }`.
  `generate` charges credits (opens top-up modal when short), creates the project and
  starts the pipeline in the background. Pages never run pipelines themselves.
- `useProjectStore` (Zustand): `projects`, `activeJobIds`, `createProject`, `updateProject`,
  `deleteProject(s)`, `duplicateProject`, `renameProject`, `toggleFavorite`, `getProject`,
  `clearAllProjects`, `resetToSamples`. Selectors: `selectLatestCompleted(type)`, `selectActiveJobs`.
- `useCreditStore`: `balance`, `history`, `planId`, `topUpOpen`, `canAfford`, `spend`, `grant`,
  `refund`, `setPlan`, `openTopUp`, `closeTopUp`, `reset`; constants `INITIAL_CREDITS`, `DEMO_REFILL_AMOUNT`.
- `useUIStore`: `sidebarCollapsed`, `mobileNavOpen`, `commandPaletteOpen`, `toasts`, `lightbox`,
  `addToast(message, {type,title,duration,action})`, `dismissToast`, `openLightbox({url,title,kind})`,
  `closeLightbox`, sidebar/palette setters. Non-React: `toast(message, options)`.
- `useAccountStore`: profile fields, `apiKeys`, `preferences`, `updateProfile`, `createApiKey`,
  `revokeApiKey`, `deleteApiKey`, `setPreference`; helpers `maskApiKey`, `initialsOf`.
- `useAsset(assetId?, fallbackUrl?)` → `{url, status}`; `useAssetUrl(...)` → url.
  Project outputs: prefer `project.outputAssetId` and fall back to `project.outputUrl`;
  thumbnails: `thumbnailAssetId` / `thumbnailUrl` / then output.
- `storeUploadedImage(file)` (image-utils) → `{assetId, width, height, url}`; use inside
  `Dropzone.onFile`. Audio uploads: validate with `validateAudioFile`, store with
  `putAsset(file, "audio", {name})`.
- `downloadProject(project)`; `remixUrl(project)`; `parseStudioParams(searchParams)` /
  `buildStudioUrl(route, params)`.
- Catalog: `IMAGE_MODELS`, `VIDEO_MODELS`, `CINEMA_MODELS`, `LIPSYNC_MODELS`, `findModel`,
  `modelsForType`, `CAMERA_PRESETS`, `DEFAULT_CAMERA`, `cameraFromPreset`, `describeCamera`,
  `FOCAL_LENGTHS`, `APERTURES`, `VIDEO_DURATIONS` (3|5|10), `SHOWCASE_PRESETS`,
  `SHOWCASE_CATEGORIES`, `CREATIVE_APPS`, `AD_TEMPLATES`, `BRAND_TONES`, `AD_FORMATS`,
  `productNameFromUrl`, `SUBSCRIPTION_TIERS`, `PROMPT_ENHANCERS`.
- Aspect: `ASPECT_RATIOS`, `dimensionsFor(ratio, longEdge)`, `videoDimensionsFor`, `cssAspect`.

## Pipeline contract (engines agent implements)
`src/lib/pipelines/index.ts` defines `PipelineContext {project, signal, report(progress, stage)}`
and `PipelineOutput`. Implement:
- `pipelines/image.ts` → `export const imagePipeline: Pipeline`. Build prompt =
  `project.prompt + ", " + model.styleSuffix`; dims `dimensionsFor(ratio, 1024)`; call
  `generateImage` with `onStatus → report`; store blob via `putAsset(blob,"image")`, thumbnail via
  `createThumbnail`; on PollinationsError (not abort) fall back to
  `proceduralRasterBlob` with `providerSource:"procedural"` and detail explaining why; abort must
  propagate (rethrow AbortError).
- `pipelines/motion.ts` → `motionPipeline` (types video + cinema): source image = `sourceAssetId`
  blob if present, else generate keyframe from prompt (+ `describeCamera` + style suffix of a
  matching image model, e.g. `studio-cinema-xl`) and store as `keyframeAssetId`; then
  `renderMotionVideo` with `project.cameraMotion ?? DEFAULT_CAMERA`, `project.motionStrength`,
  `look` from the model, `speedRamp` for `hailuo-2-3-motion`, duration `project.duration`,
  dims `videoDimensionsFor(ratio)`; output `outputAssetId` (video), `thumbnailAssetId` (keyframe
  thumbnail), `providerSource:"motion-engine"`, `providerDetail` naming keyframe provider.
  If `isVideoRenderingSupported()` is false throw a clear Error.
- `pipelines/lipsync.ts` → `lipsyncPipeline`: portrait = `sourceAssetId` or generated
  ("front-facing studio portrait of …"); envelope = `computeEnvelope(decodeAudio(audioBlob))`
  when `audioAssetId`, else `envelopeFromScript(lipsync.script)`; `renderLipsyncVideo` (you write
  it in `render/lipsync.ts`) with audio tracks from `createRecordingAudio` when audio exists;
  duration = envelope duration; captions when `lipsync.captions` and script mode.
- `pipelines/ad.ts` → `adPipeline`: packshot = `sourceAssetId` or generated product shot from
  `marketing.productName` (+ "studio product photography"); `renderAdVideo` (in `render/ad.ts`)
  using `AD_TEMPLATES[marketing.template].scenes`, tone colours, copy from `marketing`.
- `lib/apps.ts` → `runCreativeApp(appId, values: Record<string,string>, generate)` helpers used by
  the Apps page: builds prompts per app and calls `generate` (image apps) or a multi-step
  runner. Storyboard: 4 sequential image generations composited into a 2×2 labelled contact
  sheet blob (canvas), saved as one image project (use `createProject`+`startGeneration` with a
  custom pipeline? No — simpler: apps agent exposes
  `buildAppPrompt(app, values): {prompt, model, aspectRatio, creditCost}` for single-step apps and
  `runStoryboard(values, {report, signal}) → Blob` + `runLogoMotion(...)` for multi-step apps;
  the Apps page wires them). Keep it honest and simple; document the API in
  `docs/agent-notes/engines.md`.

## Generation & media components (components agent) — props
```ts
// ModelSelector: accessible listbox-style dropdown
{ models: ModelInfo[]; value: string; onChange(id: string): void; label?: string; testId?: string }
//   root data-testid={testId ?? "model-selector"}; each option data-testid=`model-option-${id}`
//   shows name, badge, description, creditCost, speed, and engine ("via Pollinations" | "In-browser engine")
// RatioSelector
{ value: string; onChange(v: string): void; ratios?: string[]; columns?: number }   // buttons data-testid=`ratio-${id}`
// DurationSelector
{ value: number; onChange(v: number): void; options?: readonly number[] }           // data-testid=`duration-${n}`
// CameraMotionControl (presets chips + sliders pan/tilt/zoom/dolly/orbit/roll + focal/aperture + optional live preview)
{ value: CameraMotionSettings; onChange(v): void; previewImageUrl?: string; motionStrength?: number; compact?: boolean }
//   preset chips data-testid=`camera-preset-${id}`; sliders `camera-slider-${axis}`; focal `focal-${mm}`; aperture `aperture-${f}` (use f value without "f/", e.g. aperture-2.8)
// MotionPreview: small canvas loop using createMotionDrawer (lightweight) — { imageUrl; camera; motionStrength?; className? }
// PromptEnhancer: deterministic enhancement based on a style key, not random
{ prompt: string; onEnhance(next: string): void; style?: keyof typeof PROMPT_ENHANCERS; disabled?: boolean } // button data-testid="enhance-button"
// QueuePanel: shows a job (queued/processing/failed/cancelled/completed) with progress, stage, cancel/retry/view
{ project: GenerationProject; onView?(): void; compact?: boolean }  // root data-testid="queue-panel", buttons queue-cancel / queue-retry / queue-view
// VideoPlayer: real <video> with custom controls (play/pause, scrub, time, loop, mute, fullscreen, download), handles blob/object URLs
{ src: string; poster?: string; title?: string; autoPlay?: boolean; loop?: boolean; className?: string; onDownload?(): void; testId?: string /* default "output-video" */ }
// MediaCard: grid card for any project type (image or video thumbnail, type badge, status overlay for in-progress/failed, favorite, hover actions: open, download, remix, duplicate, delete), selection mode support
{ project: GenerationProject; selectable?: boolean; selected?: boolean; onToggleSelect?(id): void; size?: "sm"|"md" }
//   root data-testid="media-card" + data-project-id; favorite button "media-card-favorite"; delete "media-card-delete"; download "media-card-download"
// OutputCanvas: the big output area of a studio — shows latest completed project (image → img with lightbox, video → VideoPlayer), provider badge, download + open + remix; empty state when none; in-progress state with QueuePanel
{ project?: GenerationProject; activeJob?: GenerationProject; emptyTitle: string; emptyDescription: string; emptyIcon?: ReactNode; aspect?: string; onRemix?(project): void }
//   root data-testid="output-canvas"; image data-testid="output-image"; download button "download-button"
// ProviderBadge: { source?: ProviderSource; detail?: string; size?: "sm"|"md" }  data-testid="provider-badge"
// ImageCompare: before/after slider { beforeUrl; afterUrl; beforeLabel; afterLabel; className? } (keyboard accessible: arrow keys)
```

## Routes (shell agent) — lazy-loaded, `basename` from `import.meta.env.BASE_URL`
```
/                    ExplorePage           title "Explore"
/create/image        ImageStudioPage       "Image Studio"
/create/video        VideoStudioPage       "Video Studio"
/create/cinema       CinemaStudioPage      "Cinema Studio"
/create/lipsync      LipSyncStudioPage     "LipSync Studio"
/create/marketing    MarketingStudioPage   "Marketing Studio"
/canvas              CanvasPage            "Node Canvas"
/apps                AppsPage              "Creative Apps"
/projects            ProjectLibraryPage    "Library"   (?filter=favorites|image|video|cinema|lipsync|marketing)
/projects/:projectId ProjectDetailPage
/account             AccountPage           (?tab=profile|plans|history|api|preferences|storage)
*                    NotFoundPage
```
Layout: sidebar (collapsible on desktop, off-canvas drawer on <768px), header (breadcrumb,
jobs indicator with dropdown of active jobs, credits pill opening top-up modal, ⌘K search,
Create button, avatar → /account), `<Outlet/>` in a scrollable `<main>`, `ToastContainer`,
`CommandPalette`, `Lightbox`, route-level `ErrorBoundary`, `Suspense` fallback skeleton.
`main.tsx` must call `useProjectStore.getState().markInterruptedJobs()` only via the store's
rehydrate hook (already wired) — nothing else needed.

## Studio page anatomy (all studios)
Two-column on lg (controls 5/12, output 7/12), stacked on mobile. Controls in a `Card`:
prompt `Textarea` (testid `prompt-input`, maxLength 1000, showCount) with `PromptEnhancer`,
model selector, ratio, duration (video), quality (image), advanced accordion (negative
prompt `negative-prompt-input`, seed `seed-input`), `Dropzone` for source image
(`keyframe-dropzone` / `portrait-dropzone` / `packshot-dropzone`), primary `Button`
`generate-button` showing credit cost (`Generate · 5 credits`), disabled when invalid,
shows loading while that studio has an active job? NO — allow multiple jobs; instead show the
active job in `QueuePanel` inside the output column and keep the button enabled unless
`activeJobs.length >= 3` (then show "Queue full").
Output column: `OutputCanvas` (latest completed of that type) + "Recent" row of `MediaCard`s
(up to 4) + link to library filtered by type.
On mount, read `parseStudioParams(searchParams)` once to prefill (prompt, model, ratio,
duration, camera preset, source asset id, etc.). Use `useDocumentTitle`.
Credits: `creditCost` from the model (`model.creditCost`), Marketing fixed 25.

## Test ids (global)
Shell: `sidebar`, `sidebar-toggle`, `mobile-nav-toggle`, `nav-link-{explore|image|video|cinema|lipsync|marketing|canvas|apps|projects|favorites|account}`,
`header-breadcrumb`, `credits-pill`, `jobs-indicator`, `jobs-menu`, `command-palette-trigger`,
`command-palette`, `command-palette-input`, `command-palette-item`, `create-button`, `avatar-button`,
`toast` (+ `data-toast-type`), `lightbox`, `lightbox-close`, `topup-modal`, `topup-refill`, `plan-select-{id}`.
Explore: `hero-composer-input`, `hero-composer-studio`, `hero-composer-submit`, `showcase-filter-{Category}`,
`showcase-card-{id}`, `showcase-remix-{id}`, `recent-project-card`, `engine-card-{id}`.
Studios: listed above + `quality-{draft|standard|high}`, `advanced-toggle`, `motion-strength-slider`.
LipSync: `script-input`, `audio-dropzone`, `portrait-dropzone`, `mouth-x-slider`, `mouth-y-slider`,
`captions-switch`, `speak-preview`, `lipsync-mode-{script|audio}`.
Marketing: `product-url-input`, `product-name-input`, `ad-template-{id}`, `ad-format-{ratio}`, `ad-tone-{id}`,
`ad-headline-input`, `ad-subheadline-input`, `ad-cta-input`, `packshot-dropzone`.
Library: `library-search`, `library-filter-{all|image|video|cinema|lipsync|marketing|favorites}`, `library-sort`,
`library-view-{grid|list}`, `library-select-toggle`, `library-bulk-delete`, `library-empty`, `library-clear`.
Detail: `project-title`, `project-rename`, `project-prompt`, `project-download`, `project-favorite`,
`project-delete`, `project-remix`, `project-share`, `project-duplicate`, `project-status`.
Canvas: `canvas-root`, `canvas-add-{prompt|image|motion|text}`, `canvas-node` (+`data-node-type`, `data-node-id`),
`node-port-out`, `node-port-in`, `node-run`, `node-delete`, `canvas-run-all`, `canvas-zoom-in`, `canvas-zoom-out`,
`canvas-zoom-reset`, `canvas-clear`, `canvas-fit`, `node-prompt-input`.
Apps: `app-card-{id}`, `app-run-modal`, `app-field-{key}`, `app-run`, `app-output`, `app-filter-{Category}`.
Account: `account-tab-{profile|plans|history|api|preferences|storage}`, `profile-name-input`, `profile-handle-input`,
`profile-save`, `plan-card-{id}`, `apikey-name-input`, `apikey-create`, `apikey-row`, `apikey-copy`, `apikey-revoke`,
`credit-history-row`, `storage-usage`, `storage-clear`.

## E2E notes (all agents writing specs)
- Config lives in `playwright.config.ts` (e2e agent). Helpers in `e2e/helpers.ts`:
  `mockPollinations(page)` routes `https://image.pollinations.ai/**` to a fixture JPEG,
  `gotoApp(page, path)`, `resetStorage(page)`, `seedStorage(page, {...})`, `expectToast(page, /text/)`.
- Video rendering in tests: use duration 3 (fastest) and `test.setTimeout(60_000)`.
- Every page spec should include an axe accessibility check (`@axe-core/playwright`,
  `AxeBuilder`) with no `critical`/`serious` violations.

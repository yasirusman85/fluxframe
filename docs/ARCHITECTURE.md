# FluxFrame architecture

FluxFrame is a static single-page app. There is no server: generation is a client-side job system that talks to one public image endpoint and to in-browser rendering engines, and persistence is the browser's own storage. This document explains how the pieces fit, in the order a reviewer usually asks about them.

## Module map

| Module | Responsibility |
| --- | --- |
| `src/app/` | `App` (providers, router), lazy route table with `basename = import.meta.env.BASE_URL`, route-level `ErrorBoundary`, Suspense skeleton. |
| `src/components/ui/` | Design-system kit (Button, IconButton, Modal, Tabs, SegmentedControl, Slider, Switch, Select, Input/Textarea, Dropzone, Toast, Skeleton, EmptyState, PageHeader, ProgressBar, Kbd, Card, Badge). Owns ARIA roles and `data-testid` conventions. |
| `src/components/app-shell/` | Layout (collapsible sidebar / off-canvas drawer), Header (breadcrumb, jobs indicator, credits pill, ⌘K, Create, avatar), CommandPalette, Lightbox. |
| `src/components/generation/` | Studio controls: ModelSelector, RatioSelector, DurationSelector, CameraMotionControl (+ MotionPreview), PromptEnhancer, QueuePanel. |
| `src/components/media/` | VideoPlayer (custom controls over a real `<video>`), MediaCard, OutputCanvas, ProviderBadge, ImageCompare. |
| `src/features/*` | One folder per route. Pages compose controls, call `useGeneration`, and never run pipelines themselves. |
| `src/hooks/useGeneration.ts` | Page-level API: `generate()`, `cancel()`, `retry()`, `activeJobs`, `latestCompleted`. Charges credits, creates the project, hands off to the runner. |
| `src/lib/generation-runner.ts` | Job lifecycle independent of pages: abort controllers, progress, completion, failure → refund, cancel, retry, `cancelAll`. |
| `src/lib/pipelines/` | `Pipeline(ctx) → PipelineOutput` contract; `image`, `motion`, `lipsync`, `ad` implementations, lazy-loaded via `getPipeline(type)`. |
| `src/lib/pollinations.ts` | Serialised, rate-limit-aware client for `image.pollinations.ai` with timeout, retries, abort and status callbacks. |
| `src/lib/render/` | `canvas-recorder` (MediaRecorder capture), `drawing` (fit, easing, grain, vignette, letterbox, light leak, text), `motion`, `lipsync`, `ad` engines. |
| `src/lib/asset-store.ts` | Blob storage in IndexedDB (`idb-keyval`), object-URL cache, delete/GC, storage estimate, in-memory fallback. |
| `src/lib/audio-utils.ts` | Decode audio, RMS envelope, script-to-envelope timing, MediaStream muxing, speech-synthesis preview. |
| `src/lib/image-utils.ts` · `procedural.ts` · `aspect.ts` · `query-params.ts` · `download.ts` | Upload normalisation and thumbnails, the labelled procedural fallback, ratio → pixel snapping (multiples of 16), studio deep links, real-file downloads. |
| `src/lib/catalog.ts` | Static product catalogue: engines (with credit cost, style suffix, render look), camera presets, showcase, apps, ad templates, tones, plans, enhancers. |
| `src/store/` | Zustand persist stores: `project-store`, `credit-store`, `ui-store`, `account-store` (the canvas keeps its own graph store). |
| `src/types/project.ts` | Domain model. |

## Data model

`GenerationProject` is one generation request plus its output. The fields that matter:

- Identity and inputs: `id`, `type` (`image | video | cinema | lipsync | marketing`), `mediaKind` (`image | video`), `title`, `prompt`, `negativePrompt`, `model`, `aspectRatio`, `width/height`, `duration` (s, video only), `fps`, `quality`, `seed`, `creditCost`, plus type-specific settings `cameraMotion` (pan/tilt/zoom/dolly/orbit/roll, `focalLength`, `aperture`, optional `preset`), `motionStrength`, `lipsync` (mode, script, expression, amplitude, captions, `mouthX/Y`), `marketing` (template, tone, format, product, copy, accent colours).
- Lifecycle: `status` (`queued → processing → completed | failed | cancelled`), `progress` 0–100, `stageMessage`, `errorMessage`, `createdAt/updatedAt/completedAt`, `renderMs`.
- Outputs are **references, not bytes**: `outputAssetId` / `thumbnailAssetId` point into the asset store; `outputUrl` / `thumbnailUrl` are used only for remote or data URLs (samples, procedural fallback). Inputs are references too: `sourceAssetId` (upload), `keyframeAssetId` (AI keyframe), `audioAssetId`.
- Provenance: `providerSource` (`pollinations | procedural | motion-engine | lipsync-engine | ad-engine`) and `providerDetail` feed the provider badge; `origin` (`studio | canvas | app | remix`) and `parentId` record where a project came from.

`CreateProjectInput` is the subset a page supplies; the store fills ids, timestamps, seed, fps and the title (first clause of the prompt).

## Generation lifecycle

```mermaid
sequenceDiagram
  autonumber
  participant Page as Studio page
  participant UG as useGeneration()
  participant CS as credit-store
  participant PS as project-store
  participant R as generation-runner
  participant PL as pipeline (image · motion · lipsync · ad)
  participant AS as asset-store (IndexedDB)
  participant UI as QueuePanel · OutputCanvas · toasts

  Page->>UG: generate({ type, prompt, model, …, creditCost })
  UG->>PS: createProject() → status "queued"
  UG->>CS: spend(creditCost)
  alt insufficient balance
    CS-->>UG: false
    UG->>PS: deleteProject()
    UG->>UI: warning toast + top-up modal
  else charged
    UG-)R: startGeneration(projectId)
    R->>PS: status "processing", progress 2
    R->>PL: run({ project, signal, report })
    loop stages (request, wait for rate-limit slot, render frame n/N, encode)
      PL->>PS: report(progress, stage)
      PS-->>UI: re-render QueuePanel
    end
    PL->>AS: putAsset(blob) → assetId (+ thumbnail)
    PL-->>R: PipelineOutput
    R->>PS: status "completed", outputAssetId, providerSource, renderMs
    R->>UI: success toast
    UI->>AS: resolveAssetUrl(assetId) → cached object URL
  end
  opt pipeline throws (not an abort)
    R->>PS: status "failed", friendly errorMessage
    R->>CS: refund(creditCost)
    R->>UI: error toast; QueuePanel offers Retry
  end
  opt user cancels
    Page->>R: cancel(projectId) → AbortController.abort()
    R->>PS: status "cancelled"
  end
```

Notes: pages may navigate away at any point — the runner holds the job, not the component. Retry re-runs the same project (re-charging a refunded failure; cancelled jobs keep their charge and retry free). A studio refuses new jobs when it already has three active. On reload, `project-store`'s rehydrate hook calls `markInterruptedJobs()`, which flips any `queued`/`processing` project to `failed` with "Interrupted by a page reload. Retry to run it again." — the browser cannot resume in-flight work, so the UI says so instead of showing a stuck spinner.

## Rendering engines

All video engines share `renderCanvasVideo()` (`render/canvas-recorder.ts`): an off-screen canvas, `canvas.captureStream(fps)`, optional audio tracks, `MediaRecorder` with the first supported codec (`vp9,opus → vp9 → vp8,opus → vp8 → webm → mp4`), 6 Mbit/s, wall-clock-driven frames via `setTimeout` (survives background tabs and headless runs), abort support, and a `fix-webm-duration` pass because Chrome's WebM blobs carry no duration header. Output dimensions come from `videoDimensionsFor(ratio)` (long edge 1280, snapped to multiples of 16).

- **Motion engine** (`render/motion.ts`, Video & Cinema studios). The keyframe is drawn with `coverFit` at an overscan so camera moves never reveal edges. Per frame, eased progress (`easeInOutSine`/`easeInOutCubic`) maps `pan`/`tilt` to translation within the overscan margin, `zoom`/`dolly` to scale about the centre (dolly with a stronger parallax curve), `orbit` to a horizontal sweep with perspective-style skew, `roll` to canvas rotation, and `focalLength`/`aperture` to the overscan (field of view) and vignette strength. `motionStrength` scales all axes; `handheld` adds deterministic `pseudoRandom` micro-jitter. The engine's `RenderLook` then layers grain, vignette, 2.39:1 letterbox, tint, light leak and saturation/contrast, with a black fade at both ends. The speed-ramp engine remaps time before easing. `MotionPreview` reuses the same drawer at low resolution, so the live preview is faithful.
- **LipSync engine** (`render/lipsync.ts`). The portrait is drawn once per frame; a horizontal "jaw slice" below the calibrated mouth point (`mouthX/Y`, normalised) is redrawn translated downward by `amplitude × envelope(t)` with a dark mouth cavity ellipse scaled by the same value, and the whole head gets a smoothed nod/tilt from a low-passed envelope so speech reads as motion, not a meter. The envelope is either the audio's per-frame RMS (normalised at the 95th percentile; attack 0.6, release 0.25) or a syllable-timed synthetic envelope from the script (150 wpm, pauses at punctuation), whose word timings drive burned-in captions. Uploaded audio is played into a `MediaStreamAudioDestinationNode` and its tracks are added to the recorder stream, so the file has sound.
- **Ad engine** (`render/ad.ts`). `AD_TEMPLATES[template].scenes` is a timeline of `{kind: hook|feature|proof|cta, durationMs, motion}`; total duration is the sum (9–11 s). Each scene draws the packshot with its motion (push, pull, pan, orbit, static), the tone's accent/secondary colours, and typography for that scene kind (headline, sub-headline, proof line, CTA pill) with cross-fades between scenes.

## Persistence and migration

| Storage | Key | Contents |
| --- | --- | --- |
| `localStorage` (Zustand persist) | `fluxframe-projects-v2` (version 2) | `projects[]` metadata only (max 400). |
| | `fluxframe-credits-v2` (version 2) | balance, lifetime totals, plan id, last 200 transactions. |
| | `fluxframe-ui-v1` | `sidebarCollapsed` only (toasts, palette and lightbox are transient). |
| | `fluxframe-account-v1` | profile, simulated API keys, preferences. |
| | `fluxframe-canvas-v1` | node graph (nodes, edges, viewport). |
| `localStorage` (direct) | `fluxframe-library-view` | Library grid/list preference (`library-utils.ts`; read/write wrapped in try/catch). |
| IndexedDB | database `fluxframe`, store `assets` | `{ blob, kind: image|video|audio, name, createdAt, width, height, durationMs }` by asset id. |

Migration policy: bump the persist `version` and supply a `migrate` when a stored shape changes (the `-v2` suffixes are the current break from the original prototype; older keys are ignored, not migrated). Asset ids are opaque, so blobs never need rewriting. Deleting projects releases any asset no remaining project references; the Account → Storage tab runs `garbageCollectAssets()` for orphans and reports `navigator.storage.estimate()`. When IndexedDB is unavailable or throws (private mode, some test runners) the store transparently uses an in-memory map for the session.

## Error handling and recovery

- `PollinationsError` carries a `kind` (`rate-limited | http | not-image | network | timeout`); `friendlyError()` in the runner turns it into copy a user can act on. Rate limits set a shared back-off that every queued job respects.
- Aborts are first-class: `AbortError` propagates through `sleep`, `fetch` and the frame loop; the runner records `cancelled` and never refunds or toasts an error for a user cancel.
- Provider failures inside the image pipeline fall back to a procedural render labelled `procedural` with a `providerDetail` explaining why; user aborts do not.
- `isVideoRenderingSupported()` guards the video pipelines with a clear message on browsers without `MediaRecorder`/`captureStream`.
- The UI has a route-level `ErrorBoundary`, a not-found route, empty states for every list, and toasts (with optional actions) for every success/failure.

## Testing strategy

- **Unit (Vitest, happy-dom, Testing Library)** — `src/lib/**` and `src/store/**` are the coverage targets: the Pollinations client (serialisation, back-off, retries, abort, non-image responses), the runner (refund on failure, cancel, retry re-charge), stores (persist shapes, interrupted-job marking, asset release), audio envelopes, query-param round trips, catalog helpers, and the UI kit's accessibility contracts.
- **E2E (Playwright)** — the product as a user sees it, per page, on `chromium` (1360×860) and `mobile` (Pixel 7). Pollinations is mocked (`mockPollinations` routes `image.pollinations.ai/**` to a fixture JPEG) because the real endpoint is rate-limited, non-deterministic and sometimes down — CI must be fast and reproducible; one spec deliberately returns 403 first to exercise the retry/back-off path. Video studios render for real in headless Chromium (`--autoplay-policy=no-user-gesture-required`): specs upload a fixture keyframe, choose 3 s, and assert that `output-video` contains a `<video>` with a blob source, `readyState ≥ 2` and a duration near the requested length. Every page spec runs axe (`wcag2a`/`wcag2aa`, no critical/serious violations).
- **Demo project** — `DEMO=1` adds a 1440×900 project with video recording; `e2e/demo/tour.spec.ts` drives the whole product slowly for the narrated demo and, with `SCREENSHOTS=1`, regenerates the README screenshots.

## Performance notes

- Routes are `React.lazy` with a Suspense skeleton; pipelines and the video engines are dynamic imports, so a first paint of Explore does not download the recorder or the render code.
- Vite `manualChunks` separate React/Router, Framer Motion and Lucide so app code changes do not invalidate vendor chunks.
- Object URLs are created once per asset and cached (`peekAssetUrl` gives a synchronous hit for re-renders); thumbnails are 640 px JPEGs so grids never decode full outputs.
- Uploads are normalised to ≤ 2048 px before storage; the renderer paints at 720p-class sizes and encodes at 6 Mbit/s — a 3 s clip renders in ~3 s real time.
- Zustand selectors use `useShallow` where objects are returned to avoid re-render storms during progress updates.

## Security and privacy

- The only outbound data is prompt text (plus width/height/seed and `nologo=true&private=true`) in a GET to `image.pollinations.ai`; there is no auth header because there are no keys. Google Fonts are loaded from Google.
- Uploaded images and audio never leave the browser; they are stored in IndexedDB and rendered locally.
- "API keys" on the Account page are generated locally with `crypto.getRandomValues`, shown masked after creation and never transmitted — they exist to complete the product surface and are labelled simulated.
- No `dangerouslySetInnerHTML`; prompt text is only ever rendered as text or encoded into URLs; procedural SVG escapes titles before embedding.

# Verification & capture notes

- **Application**: FluxFrame — a browser-only AI creative studio (text-to-image, camera-choreographed image-to-video, audio-driven LipSync, multi-scene ad builder, executable node canvas, creative apps, library, simulated credits/plans).
- **Stack**: React 19 · TypeScript (strict, `noUnusedLocals`/`noUnusedParameters`, `verbatimModuleSyntax`) · Vite 6 · Tailwind CSS v4 · Zustand 5 (persist) · Framer Motion · React Router 7.
- **AI provider**: public, anonymous Pollinations image endpoint (`https://image.pollinations.ai/prompt/…`), accessed through a serialised, rate-limit-aware client with abort support, timeouts, bounded retries and a labelled procedural fallback. No API keys exist in the codebase or the build.
- **Media**: video outputs are rendered in the browser (canvas + `MediaRecorder`) and stored as blobs in IndexedDB; downloads are real `.webm`/`.mp4`/`.jpg` files.
- **Routing**: React Router with `basename` derived from `VITE_BASE`; SPA fallbacks for GitHub Pages (`404.html`) and Cloudflare Pages (`public/_redirects`).

## Authentic capture disclosure

> **Truthful disclosure**: automatic prompt/final-response capture was not configured before development began. We have not reconstructed or represented historical interactions as automatically captured, and this repository contains no file that claims to be such a log. FluxFrame was built with AI-assisted development (coding agents working from the engineering spec in `docs/SPEC.md`); every generated line was reviewed, type-checked, linted and covered by the automated checks below before being kept.

## Verification commands

Run from a clean checkout with Node 20+ (`npm ci` first; `npx playwright install chromium` once for the E2E suite).

```bash
# 1. Static analysis: ESLint (no `any`, type-only imports enforced, hooks rules) — expect 0 errors
npm run lint

# 2. Type-check the app and the Playwright suite without emitting — expect 0 errors
npm run typecheck

# 3. Unit tests (Vitest + Testing Library, happy-dom): stores, runner, Pollinations client,
#    asset store, audio envelope, catalog/query-param helpers, UI kit — expect all passing
npm run test

# 4. Production build (tsc -b + vite build) — expect dist/ with hashed, code-split chunks
npm run build

# 5. End-to-end (Playwright): `chromium` desktop project + `mobile` Pixel 7 project.
#    Pollinations is mocked with a fixture image so the suite is fast, offline and deterministic;
#    the video studios render real clips in headless Chromium and the specs assert on the
#    resulting <video>. Every page spec runs an axe accessibility check (no critical/serious).
npm run e2e

# Optional: reproduce the demo recording / README screenshots
npm run demo:record        # DEMO=1 → demo/walkthrough.webm
npm run demo:screenshots   # DEMO=1 SCREENSHOTS=1 → docs/screenshots/*.png
```

## What CI runs

`.github/workflows/ci.yml` runs on every push and pull request: `npm ci` → `npm run lint` → `npm run typecheck` → `npm run test` → `npm run build` → `npx playwright install --with-deps chromium` → `npm run e2e` (against `vite preview` of the production build, with the Playwright HTML report uploaded as an artifact). `.github/workflows/deploy.yml` builds with `VITE_BASE=/fluxframe/` and publishes `dist/` to GitHub Pages at https://yasirusman85.github.io/fluxframe/ on pushes to `main`.

## Product disclosures

- **Image generation**: real, via the public Pollinations endpoint. Prompts (plus a per-engine style suffix) are sent as URL parameters; the endpoint currently serves a single model ("sana"), so the engine choice steers the prompt rather than the server model. Rate limit ≈ 1 request / 15 s anonymously; the client serialises and backs off, and the UI shows the wait. On provider failure the output is a procedural render labelled "Procedural fallback".
- **Video generation**: real files rendered in the browser from a keyframe using deterministic camera choreography (pan/tilt/zoom/dolly/orbit/roll, focal length, aperture, film looks). Not a diffusion video model; labelled "Motion engine".
- **LipSync**: real audio-driven jaw/head animation with the uploaded audio muxed into the file. Script mode is silent with burned-in captions because browser speech synthesis cannot be captured.
- **Marketing**: real multi-scene ad video rendered in the browser.
- **Credits, plans, API keys**: simulated locally and labelled as such. Nothing is billed; generated keys are never transmitted.
- **Data**: projects and blobs stay in the browser (localStorage + IndexedDB). Only prompt text leaves the browser (to Pollinations), plus Google Fonts requests.

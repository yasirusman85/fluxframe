# Agent Coding Capture & Verification Details

- **Target Application**: Higgsfield Clone
- **Framework**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **State Engine**: Zustand persistent store (`localStorage`)
- **Queue & AI Engine**: Public Pollinations image endpoint with `AbortController` cancellation, 12s timeout, lightweight URL preservation, and procedural SVG fallback.
- **Routing Engine**: Clean `BrowserRouter` (`/create/image`, `/create/video`, `/projects`) with Cloudflare Pages `_redirects` SPA support.

## Authentic Logging Notice

> **Notice**: Automatic verbatim step-by-step prompt/response capture logging (`.agent-logs/`) was not configured from the start of this workspace session. Per assessment guidelines, retrospective log reconstruction has deliberately been omitted to preserve repository integrity and avoid unauthentic evidence.

## Verification Commands

```bash
# 1. Run ESLint code quality suite (0 errors)
npm run lint

# 2. Run full Vitest unit test suite (9 tests covering Store, Engine, AbortController, Pollinations, UI)
npm run test

# 3. Build production bundle
npm run build
```

## Production & Prototype Disclosure

- **Image Generation**: Uses public Pollinations endpoint with automatic procedural fallback. Prompts are transmitted via URL parameters. Model assignment is dynamic (`sana` / `flux`).
- **Video Generation**: Simulated motion preview using keyframe vectors and optical flow controls.
- **Access Limits**: Prototype mode with unlimited local access.

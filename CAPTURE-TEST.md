# Agent Coding Capture & Verification Details

- **Target Application**: Higgsfield Clone
- **Framework**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **State Engine**: Zustand persistent store (`localStorage`)
- **Queue & AI Engine**: Public Pollinations image endpoint with `AbortController` cancellation, 12s timeout, lightweight URL preservation, and procedural SVG fallback.
- **Routing Engine**: Clean `BrowserRouter` (`/create/image`, `/create/video`, `/projects`) with Cloudflare Pages `_redirects` SPA support.

## Captured Log Files

Verbatim system harness transcripts captured automatically during this session:
- [.agent-logs/session-01.md](.agent-logs/session-01.md) (Step-by-step verbatim prompts, tool calls, and responses with UTC timestamps and model identity)

## Verification Commands

```bash
# 1. Run ESLint code quality suite (0 errors)
npm run lint

# 2. Run full Vitest unit test suite (9 tests covering Store, Engine, AbortController, Pollinations, UI)
npm run test

# 3. Build production bundle
npm run build
```

## Production & Prototype Disclosures

- **Image Generation**: Uses public Pollinations endpoint with automatic procedural fallback. Prompts are transmitted via URL parameters. Model assignment is dynamic (`sana` / `flux`).
- **Video Generation**: Simulated motion preview using keyframe vectors and optical flow controls.
- **Access Limits**: Prototype mode with unlimited local access.

# Higgsfield Clone

Higgsfield Clone is an AI visual-generation creative studio web application built with React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion, and Zustand.

![Higgsfield Clone](public/favicon.svg)

## Core Experience

1. **Explore Studio**: Hero gallery, quick-start creative presets, community prompts with 1-click prefill, and project grid.
2. **Image Studio Workspace**: AI image generation form, prompt enhancer, canvas aspect ratio selector (`16:9`, `1:1`, `9:16`, `4:3`, `21:9`), preset options, and live preview.
3. **Video Studio Workspace**: Simulated motion preview generator with starting keyframe upload preview, duration selector, motion strength controls, and interactive video player.
4. **Resilient AI Engine**: Public Pollinations image endpoint integration with `AbortController` true network cancellation, 12s timeout, lightweight URL storage, and automatic procedural SVG fallback.
5. **Project Library & Detail View**: Grid view with search, media filtering (All, Image, Video, Favorites), date sorting, Before/After latent step comparison slider, 1-click downloads, shareable URLs, and project duplication.
6. **Command Palette**: Press `Cmd+K` / `Ctrl+K` from anywhere to launch quick search across tools, presets, and pages.

## Product & Prototype Disclosures

> **Honest Prototype Architecture**:

- **Image Generation**: Powered by a public Pollinations endpoint. Prompts are transmitted via URL parameters, and model allocation (`sana` / `flux`) is dynamic. If the endpoint is throttled or offline, the app automatically switches to procedural SVG fallback rendering.
- **Video Generation**: Outputs are **simulated motion previews** rendered via keyframe animation vectors and optical flow controls.
- **Persistent Local Store**: Uses Zustand persistent storage in `localStorage`. Remote image URLs are preserved directly to avoid Base64 storage bloat.
- **Unlimited Access**: Operates in prototype mode with zero credit paywalls.

## Technical Stack

- **Core**: React 19, TypeScript, Vite
- **State**: Zustand with `persist` middleware
- **Styling**: Tailwind CSS v4, Vanilla CSS Custom Tokens
- **Icons & Motion**: Lucide React, Framer Motion
- **Testing**: Vitest, React Testing Library, happy-dom (9 unit tests)
- **Routing**: `BrowserRouter` clean URLs with SPA fallback support

## Verification & Testing

```bash
# 1. Install dependencies
npm install

# 2. Run automated Vitest test suite (9 tests)
npm run test

# 3. Build production bundle
npm run build

# 4. Start local development server
npm run dev
```

## Audit & Verification Evidence

- Benchmark & execution logs: [.agent-logs/](.agent-logs/)
- Capture test details: [CAPTURE-TEST.md](CAPTURE-TEST.md)

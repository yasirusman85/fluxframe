# Fluxframe Studio

Fluxframe Studio is a cinematic AI visual-generation creative studio application built with React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion, and Zustand.

![Fluxframe Studio](https://raw.githubusercontent.com/antigravity-studio/fluxframe/main/public/demo/preview.png)

## Core Experience

1. **Explore Studio**: Hero gallery, quick-start tool cards, community preset prompts with 1-click prefill, and recent creations grid.
2. **Image Studio Workspace**: Multi-model selection (`Flux Realism v2`, `Studio Cinema XL`, `Cyber Concept Pro`, `HyperDetail Ultra`), AI prompt enhancer, canvas aspect ratio picker, quality presets, seed/negative prompt controls, and live canvas preview.
3. **Video Studio Workspace**: Starting keyframe photo upload preview, duration picker (5s / 10s), motion strength slider (1-10), and interactive 60fps motion video player with time scrubbing.
4. **Simulated Generation Engine**: Realistic asynchronous queueing state machine (`queued` &rarr; `processing` 18% &rarr; 42% &rarr; 70% &rarr; 92% &rarr; `completed`/`failed`), cancelation handling, live stage descriptions, and retry actions.
5. **Project Library & Detail View**: Grid view with search by title/prompt, filter by media type (All, Image, Video, Favorites), sort by date, Before/After latent step slider, 1-click media downloads, shareable URLs, and settings duplication.
6. **Command Palette**: Press `Cmd+K` / `Ctrl+K` from anywhere to launch quick search across models, presets, and pages.

## Product Decisions

> I prioritized a complete, reliable user journey and product-quality state handling over a thin dependency on a paid generation API.

- **Persistent Client Store**: Uses Zustand persistent storage so user generations, favorite flags, and active queue state survive browser refreshes.
- **Cinematic Dark Design Tokens**: Built with CSS custom properties (`--background`, `--panel`, `--accent`, `--border`), subtle glow effects, and responsive drawer navigation.
- **Accessibility & Keyboard Usability**: Keyboard shortcuts (`Cmd+K`, `Escape`), semantic button elements, visible focus rings, ARIA live region progress announcements, and text contrast.

## Architecture & Tech Stack

- **Core**: React 19, TypeScript, Vite
- **State**: Zustand with `persist` middleware
- **Styling**: Tailwind CSS v4, Vanilla CSS Custom Tokens
- **Icons & Animation**: Lucide React, Framer Motion
- **Testing**: Vitest, React Testing Library, jsdom

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev

# 3. Execute unit test suite
npm run test

# 4. Build production bundle
npm run build
```

## Deployment (Cloudflare Pages)

Configured for Cloudflare Pages SPA deployment with `public/_redirects`:

- **Build command**: `npm run build`
- **Output directory**: `dist`

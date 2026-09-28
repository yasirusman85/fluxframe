# Node Canvas — implementation notes

Files owned by the canvas agent:

```
src/features/canvas/canvas-store.ts        graph + viewport state (written first, unchanged)
src/features/canvas/use-canvas-runner.ts   runNode / runAll on top of useGeneration
src/features/canvas/CanvasPage.tsx         page (named export `CanvasPage` + default)
src/components/canvas/CanvasViewport.tsx   pan / zoom workspace, `canvas-root`
src/components/canvas/EdgeLayer.tsx        SVG connections + edge delete
src/components/canvas/NodeCard.tsx         one node (header, body, status, ports)
src/components/canvas/CanvasToolbar.tsx    node palette, run-all, zoom cluster
src/components/canvas/NodeInspector.tsx    right-hand settings/provenance panel
tests/canvas-store.test.ts                 graph helpers, store actions, runner helpers (38 cases)
tests/canvas-page.test.tsx                 render smoke test for the page (RTL + MemoryRouter)
e2e/canvas.spec.ts                         Playwright spec
```

Nothing outside those paths was touched.

## Graph model

`canvas-store.ts` is the contract; the components only call its actions.

- Node types `prompt | text | image | motion`. Allowed edges: `prompt → image`,
  `text → image`, `image → motion`, `prompt → motion`. Everything else (including
  self-loops and duplicates) is rejected by `connect`, which returns `false`.
- **A target keeps at most one incoming edge** — connecting a second source replaces
  the first. The E2E leans on this (edge count stays 2 after rewiring).
- `topologicalOrderOf` is Kahn's algorithm with a stable priority (sources first, then
  image, then motion; ties left-to-right), so `runAll` is deterministic.
- Persisted under `fluxframe-canvas-v1` with `partialize` → `{ nodes, edges, viewport }`.
  Selection is deliberately not persisted.

## Runner (`use-canvas-runner.ts`)

`useCanvasRunner()` → `{ runNode(nodeId), runAll(), running, runningNodeId }`.

- Nothing calls a pipeline directly: both paths go through `useGeneration().generate`,
  so credits, the queue, toasts and the project library behave exactly like a studio.
  Projects are created with `origin: "canvas"` and `tags: ["canvas"]`.
- **image node** — prompt = upstream prompt/text node's content joined to the node's own
  `data.prompt` with `", "`, blanks skipped (`resolveImagePrompt`). Empty ⇒ warning toast
  and stop. `creditCost` comes from `findModel(model)?.creditCost ?? 5`.
- **motion node** — requires the upstream image node's project to be `completed` with an
  `outputAssetId`; otherwise it toasts `"Run the upstream image node first"` and stops.
  `sourceAssetId` = that project's output (so `motionPipeline` skips keyframe generation),
  ratio = that project's ratio, prompt = the image node's upstream prompt node, else the
  image project's prompt. Fixed `model: "motion-v1-realism"`, `creditCost: 15`.
- The node's `projectId` is written back with `updateNodeData` as soon as the job starts,
  which is what drives the in-node progress bar, output and animated edge.
- `waitForProject(projectId)` is a thin `useProjectStore.subscribe` promise: resolves on
  `completed`, rejects on `failed`/`cancelled`. `runAll` walks the topological order,
  awaits each generator node and stops on the first rejection or on `generate` returning
  `null` (not enough credits). `runNode`/`runAll` are re-entrancy guarded by a ref.

## Interaction notes

- **Pan** — pointer events with pointer capture on `canvas-root`; a press only starts a
  pan when the target is not inside `[data-canvas-node] / [data-canvas-hit] / [data-canvas-ui]`.
  The root sets `touch-action: none`, so single-finger touch panning works.
- **Wheel** — attached natively with `{ passive: false }` (React registers `wheel`
  passively, so `preventDefault` would be ignored). Plain wheel pans; `ctrlKey`/`metaKey`
  wheel zooms around the cursor, which is also how a trackpad pinch arrives. `deltaMode`
  line/page units are normalised.
- **Connections** — pointerdown on `node-port-out` starts a draft bezier drawn in
  `EdgeLayer`; window-level `pointermove`/`pointerup` track it and `document.elementFromPoint`
  resolves the drop target to a `[data-testid="node-port-in"]` (each port carries
  `data-node-id`). A rejected pair toasts a warning. Ports are real `<button>`s with
  `aria-label`s and an enlarged `::after` hit area.
- **Nodes** drag by the header with pointer capture and deltas divided by `zoom`; the body
  stops pointer-down propagation so typing never starts a drag. Titles are editable on
  double-click (and always editable in the inspector, which is the keyboard path).
- **Delete/Backspace** removes the selected node, else the selected edge, and is skipped
  while focus is in an input/textarea/select or a contenteditable.
- **Inspector** starts collapsed and auto-opens on mount when the workspace is at least
  1200px wide, so it never covers the graph on a laptop. It is inside `canvas-root`.

## Test ids

Spec ids: `canvas-root`, `canvas-add-{prompt|text|image|motion}`, `canvas-node`
(+`data-node-type`, `data-node-id`), `node-port-out`, `node-port-in`, `node-run`,
`node-delete`, `canvas-run-all`, `canvas-zoom-{in|out|reset}`, `canvas-clear`,
`canvas-fit`, `node-prompt-input`.

Extra ids added for this page: `canvas-zoom-label`, `canvas-load-template`, `canvas-empty`,
`canvas-edge`, `edge-delete`, `node-text-input`, `node-output-image`, `node-output-video`,
`node-retry`, `node-open`, `node-model-select`, `node-ratio-select`, `node-preset-select`,
`node-duration-select`, `node-strength-slider`, `node-inspector`, `node-inspector-toggle`,
`node-open-studio`, `inspector-delete-node`.

## Verification

```
npx eslint src/features/canvas src/components/canvas tests/canvas-store.test.ts tests/canvas-page.test.tsx e2e/canvas.spec.ts
npx tsc -p tsconfig.app.json --noEmit    # clean for src/features/canvas + src/components/canvas
npx vitest run tests/canvas-store.test.ts tests/canvas-page.test.tsx    # 40 passing
npx tsc -p tsconfig.e2e.json --noEmit
```

```
npx playwright test e2e/canvas.spec.ts --project=chromium      # 3 passing, ~6 s
```

The spec follows the agreed setup order (`resetStorage` → `mockPollinations` →
`gotoApp("/canvas")`), scrolls `canvas-root` into view before the pointer drag, and uses
`test.setTimeout(150_000)` for the generation test. It covers: starter graph (3 nodes /
2 edges), adding a prompt node, rewiring it onto the image node with `page.mouse` (edge
count stays 2 — replacement), running the image node to a `blob:` `node-output-image`,
`canvas-run-all` producing a `blob:` `node-output-video` on the motion node, persistence
across `page.reload()`, the zoom label, `window.confirm`-guarded clear → `canvas-empty`,
accessible names on every toolbar button, and `checkA11y`.

## Notes for the integrator / other agents

- The route must lazy-load `src/features/canvas/CanvasPage.tsx`; it provides both a named
  `CanvasPage` export and a default export. Title: "Node Canvas" (already set by the page
  itself via `useDocumentTitle`). `ROUTES` in `src/app/routes.ts` already has the entry.
- `checkA11y` already excludes `[data-testid="canvas-root"]`; no change needed. Because the
  toolbar and inspector live inside that root, `e2e/canvas.spec.ts` asserts accessible
  names on the toolbar buttons explicitly.
- No shared file needed a change, so there is nothing for the integrator to apply.

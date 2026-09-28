# projects agent — Library & Project Detail

Owned files:

```
src/features/projects/ProjectLibraryPage.tsx   (named + default export)
src/features/projects/ProjectDetailPage.tsx    (named + default export)
src/features/projects/library-utils.ts         pure filter/sort/search/format helpers
src/features/projects/ProjectListRow.tsx       list-view row
src/features/projects/ProjectDetailsPanel.tsx  metadata sidebar (type-specific panels)
src/features/projects/RelatedProjects.tsx      remix lineage + "more of this type"
src/features/projects/LinkButton.tsx           <Link> styled like <Button>
src/features/projects/useDebouncedValue.ts
e2e/library.spec.ts  e2e/project-detail.spec.ts
```

`src/app/router.tsx` lazy-imports the **named** exports; the default exports exist so the
modules also work with a plain `React.lazy(() => import(...))`.

## ProjectLibraryPage (`/projects`)

- `PageHeader` (icon `Library`) with a live description: `{n} projects · {n} images · {n} clips`,
  plus `· {formatBytes(usage)} used` once `storageEstimate()` resolves with a non-zero usage
  (it is re-read whenever `projects.length` changes, so it updates after deletes).
- Sticky `.glass` toolbar, negative-margin bleed so it spans the content gutter:
  - filter `Tabs` — `testIdPrefix="library-filter"`, labels from `FILTER_LABELS`, counts from
    `countByFilter` as badges. **The filter is the URL**: `?filter=favorites` etc.; `all` deletes the
    parameter, so `/projects?filter=favorites` (the sidebar "Favorites" entry) is a real deep link.
  - `library-search` — `useDebouncedValue(query, 150)`, matched by `matchesQuery` against title,
    prompt, model id + name and tags (every whitespace-separated token must match).
  - `library-sort` — `SORT_OPTIONS`; initial value read from `?sort=` (`parseSort`) for deep links
    but kept in component state afterwards so sorting does not push history entries.
  - `library-view-grid` / `library-view-list` — persisted through `readStoredView`/`storeView`
    (`localStorage["fluxframe-library-view"]`), so the choice survives reloads.
  - `library-select-toggle` → selection bar with `{n} selected`, "Select all visible",
    `library-bulk-delete` (danger) and "Done". Bulk delete confirms in a `Modal`
    (`library-bulk-delete-confirm`) and calls `deleteProjects`, which also releases the
    now-unreferenced IndexedDB assets.
  - `library-more` — a small `role="menu"` popover (Escape / outside-click close) with
    `library-clear` → `library-clear-confirm` (`cancelAllGenerations()` then `clearAllProjects()`)
    and `library-restore-samples` (`resetToSamples()`).
- Grid view renders `MediaCard` with `selectable`/`selected`/`onToggleSelect`; list view renders
  `ProjectListRow`. `sortProjects` always floats queued/processing projects to the top.
- Paging: `LIBRARY_PAGE_SIZE` (24) at a time, then `library-load-more`. The page resets to the
  first page whenever filter, search or sort changes.
- Empty states share `testId="library-empty"`: "No projects yet" (CTA into the Image Studio) when
  the library is empty, "Nothing matches" + `library-clear-filters` when the filters exclude
  everything.
- Deleting a single row from list view opens the same confirm `Modal` (`library-delete-confirm`).

## ProjectDetailPage (`/projects/:projectId`)

- Unknown id → `EmptyState` `testId="project-not-found"` with `project-not-found-back` → `/projects`.
  The page component resolves the project and then renders an inner `ProjectDetail` keyed by id, so
  every hook below runs unconditionally and remounts cleanly when you navigate between projects.
- Top row: back `Link` ("Library"), `project-status` badge (`STATUS_LABELS`/`STATUS_VARIANTS`,
  pulsing dot while in flight), type badge, `ProviderBadge`, `describeMedia`.
- Title row: `<h1 data-testid="project-title">` + `project-rename` → `project-rename-input`
  (auto-focused and selected). Enter or blur commits via `renameProject`; Escape restores the old
  title and is guarded by a ref so the unmount blur cannot re-commit it.
- Actions: `project-favorite` (`aria-pressed`), `project-share` (clipboard, falls back to a toast
  containing the URL), `project-duplicate` (navigates to the copy), `project-remix`
  ("Open in studio" → `remixUrl(project)`, a real `<Link>`), `project-download`
  (`downloadProject`, disabled unless completed), `project-delete` → `project-delete-confirm` →
  `deleteProject` → `/projects`. `project-retry` shows for failed/cancelled, `project-cancel` while
  queued/processing.
- Viewer `Card`: `QueuePanel` for anything not completed (it carries its own retry/cancel),
  `VideoPlayer` (autoplay+muted+loop, poster from `thumbnailSource`) for clips,
  `<img data-testid="project-image">` inside a button that opens the shell lightbox for stills.
  When `sourceAssetId ?? keyframeAssetId` exists and the job completed, `project-compare` swaps in
  `ImageCompare` (before = source/keyframe, after = the output, or the thumbnail for videos).
- Sidebar `ProjectDetailsPanel`, then `RelatedProjects` full width, then a shortcut legend.
- Page shortcuts: `f` favorite, `d` download, `Delete` opens the delete confirm. They are ignored
  when the event target is an `input`/`textarea`/`select`/contenteditable, or when a modifier is
  held, so typing in the rename field or the command palette is never hijacked.

## E2E

`e2e/library.spec.ts` (10 tests) and `e2e/project-detail.spec.ts` (10 tests) — **20/20 green**
(`npx playwright test e2e/library.spec.ts e2e/project-detail.spec.ts --project=chromium`, also
green with `--repeat-each=2`).

Both specs deliberately seed nothing: with empty storage the store seeds the six
`SAMPLE_PROJECTS` from `src/lib/samples.ts` (`sample-valkyrie` "Obsidian Valkyrie" and
`sample-noir-detective` "Neo-Tokyo Detective" are the two favorites; "Celestial Dragon" is
alphabetically first and the only project matching "dragon"). `seedProjects` replaces the whole
persisted list, so any future test that seeds must include everything it needs.

### Finding for the e2e agent: `checkA11y` must wait for entry animations

`checkA11y` currently scans as soon as it is called. Every page root mounts with
`animate-fade-in` (180 ms) and **axe blends each foreground colour with the background using the
ancestor opacity at scan time** — so a mid-fade scan reports false-positive `color-contrast`
violations for text that is perfectly fine once the animation ends. Measured on
`/projects/sample-valkyrie`: `text-zinc-400` was reported as `#595960` on `#09090b` (2.86:1)
instead of `#a1a1aa` (7.6:1); waiting for the animation dropped the page from 20 violations to 0.

Both of my specs work around it with a local `settleAnimations(page)` helper. **The fix belongs in
`checkA11y` itself** (it would also de-flake the other page specs):

```ts
await page.evaluate(
  () =>
    new Promise<void>((resolve) => {
      const entry = document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity);
      void Promise.all(entry.map((a) => a.finished.catch(() => undefined))).then(() => resolve());
      setTimeout(resolve, 1_000); // never wait on spinners/shimmers
    }),
);
```

Once that lands, the `settleAnimations` helper can be deleted from both project specs.
Note that several other pages (`/create/*`, `/account`) still have **genuine** violations after the
wait (`label`, `nested-interactive`, `color-contrast`) — those belong to their own agents.

### Shared-code changes I needed (already applied by the UI-kit/components agents)

The colour-contrast pass on `/projects` originally failed on `MediaCard`'s secondary text
(`text-zinc-500` = 3.98:1 on `surface-1`, below the 4.5:1 AA threshold). That, along with the
`text-zinc-500` hints in `Input`/`Select`/`Card`, has since been changed to `zinc-400` upstream, so
both specs now run a plain `checkA11y(page)` with colour contrast enabled. Keep meaningful text at
`zinc-400` or lighter on the dark surfaces — decorative punctuation counts too, because axe only
ignores text that is entirely emoji.

Inside my own directory I changed one class for the same reason:
`ProjectListRow` — the `·` separator between meta fields moved from `text-zinc-600` to `text-zinc-400`.

### No other shared changes requested

Everything else is consumed as-is: `MediaCard`, `VideoPlayer`, `ImageCompare`, `ProviderBadge`,
`QueuePanel`, the whole `components/ui` kit, `useAsset`/`useAssetUrl`, `downloadProject`,
`remixUrl`, `storageEstimate`, `cancelGeneration`/`retryGeneration`/`cancelAllGenerations` and the
project store.

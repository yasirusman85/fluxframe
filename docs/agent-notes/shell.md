# App shell — router, layout, navigation, command palette

Owned files: `src/app/{router.tsx,providers.tsx,App.tsx}`, `src/main.tsx`,
`src/components/app-shell/{Layout,Sidebar,Header,CommandPalette}.tsx`,
`src/features/not-found/NotFoundPage.tsx`, `tests/shell.test.tsx`.

## What was built

- **`src/app/router.tsx`** — `createBrowserRouter` with
  `basename: import.meta.env.BASE_URL.replace(/\/$/, "")` (React Router turns `""` back into
  `"/"`, so the same build works at `/` and at `/fluxframe/`). One root route renders
  `<Layout/>`; every child is a `React.lazy` chunk wrapped in
  `<Suspense fallback={<PageSkeleton/>}>`. `errorElement: <RouteError/>` is set on the root
  **and on every child**, so a page-level crash renders inside the shell (sidebar/header stay
  usable) while a shell-level crash still gets the full-page fallback.
- **`providers.tsx` / `App.tsx`** — `ErrorBoundary` above `RouterProvider`; `App` is exported
  both named and default. `main.tsx` already imported `./app/App` + `./styles/globals.css`
  and was left untouched.
- **`Layout.tsx`** — skip link → `<Sidebar/>` → column of `<Header/>` + `<main id="main">`
  (`flex-1 overflow-y-auto`, **no padding** — pages own their `max-w-7xl` wrapper).
  Mounts `ToastContainer`, `CommandPalette`, `Lightbox` and `TopUpModal` (imported from
  `src/features/account/TopUpModal.tsx`) exactly once. Owns the global ⌘K/Ctrl+K handler and
  `useDocumentTitle(routeForPath(pathname, search)?.title ?? "")`; closes the mobile drawer on
  every location change.
- **`Sidebar.tsx`** — a single `data-testid="sidebar"` element in every layout:
  `fixed … hidden md:flex` drawer below `md` (so the closed drawer is `display:none` and really
  out of the viewport), static 256px / 76px column from `md` up. Backdrop button + Escape close
  the drawer. Groups come from `ROUTE_GROUPS`/`routesInGroup`.
- **`Header.tsx`** — `h-16 .glass` bar: mobile nav toggle, `FluxFrame /` + `header-breadcrumb`,
  then `JobsIndicator` (only when `activeJobIds.length > 0`; popover lists each active job with
  `<QueuePanel compact>`), `CreditsPill`, `command-palette-trigger`, `create-button`
  (→ `/create/${preferences.defaultStudio}`) and `avatar-button`.
- **`CommandPalette.tsx`** — `Modal` (`hideHeader`, `lg`, `testId="command-palette"`) bound to
  `useUIStore.commandPaletteOpen`; groups **Pages → Engines → Prompts → Projects → Actions**
  (Pages + Actions when the query is empty).

## Decisions worth knowing

1. **`Link` instead of `NavLink` for nav items.** `NavLink` matches on the *pathname only* and
   re-applies its own `aria-current="page"` default whenever the prop is `undefined`, so at
   `/projects?filter=favorites` **both** Library and Favorites ended up marked as current.
   The sidebar therefore computes `isRouteActive()` from `useLocation()` (favorites ⇔
   `pathname === "/projects"` *and* `filter=favorites`; Library also stays active on
   `/projects/:id`) and sets `aria-current` itself. Behaviour and styling are unchanged;
   only the implementation detail differs from the original brief.
2. **Palette highlight starts "unmoved" (`activeIndex === -1`).** The first result is rendered
   as selected (and is what Enter opens), but the first ArrowDown *lands on it* instead of
   skipping to the second item — this is what the E2E (`type "cinema"` → ArrowDown → Enter →
   `/create/cinema`) expects. Further ArrowDown/ArrowUp wrap around.
3. **Ranking.** Groups are rendered in a fixed order (Pages first) and items are scored inside
   their group: exact title (120) > title prefix (100) > word prefix (80) > substring (60) >
   keyword prefix (40) > description match (20) > keyword substring (10). That is why
   "cinema" always yields `Cinema Studio` as item 0 even though engines and showcase prompts
   also contain "cinematic".
4. **Two toggles, one testid.** `sidebar-toggle` is rendered inline in the brand row when the
   sidebar is expanded and on its own centred row when collapsed — only ever one in the DOM.
5. **Modal has no accessible name when `hideHeader` is used.** Passing `title` while hiding the
   header would emit a dangling `aria-labelledby` (a *serious* axe violation), so the palette
   dialog relies on the labelled combobox input instead. If the UI kit ever gains an
   `ariaLabel` prop on `Modal`, wire it up here.
6. **Contrast.** Nothing in the shell uses `text-zinc-500`; muted text is `zinc-400` or lighter
   (`checkA11y` fails on colour contrast). `RouteError`'s "HTTP {status}" line and
   `NotFoundPage`'s muted copy were bumped from `zinc-500` to `zinc-400` for the same reason,
   and `NotFoundPage` gained `px-4 sm:px-6` because `<main>` deliberately has no padding.

## For the integrator

- **Unrelated a11y failure (not the shell):** `e2e/credits.spec.ts` fails its `checkA11y` on
  `/create/image` with ~15 `color-contrast` nodes, all `text-zinc-500` on `surface-1/2`. The
  offenders are in other agents' files: `components/generation/{ModelSelector,
  CameraMotionControl,MotionPreview,QueuePanel}.tsx`, `components/media/{MediaCard,
  OutputCanvas}.tsx` and `components/ui/{Card,Dropzone,EmptyState,Input,SegmentedControl,
  Select,Slider,Switch,Toast}.tsx`. A global `text-zinc-500 → text-zinc-400` sweep in those
  files clears it. Everything else in that spec passes.
- **Unrelated unit failures:** `tests/lib-audio.test.ts > wordAt` and
  `tests/lib-format.test.ts > titleFromPrompt` fail (engines/lib agents).
- `src/components/app-shell/ErrorBoundary.tsx` emits one pre-existing ESLint *warning*
  (`react-refresh/only-export-components`) because it exports a class plus a helper component.
  Harmless; moving `FatalErrorScreen` to its own file would silence it.
- `Layout` sets the document title from `routeForPath`, and parent effects run after child
  effects, so the shell wins over a page's own `useDocumentTitle`. `/projects/:id` therefore
  reads "Project · FluxFrame" rather than the project's name — say the word and the
  `routeForPath` call can be dropped for that one route.

## Verification run

- `npx eslint src/app src/components/app-shell src/main.tsx tests/shell.test.tsx` → 0 errors
  (1 pre-existing warning in `ErrorBoundary.tsx`).
- `npx tsc -p tsconfig.app.json --noEmit` → clean (whole project).
- `npx vitest run tests/shell.test.tsx` → 12/12.
- `npx playwright test e2e/navigation.spec.ts e2e/command-palette.spec.ts --project=chromium` → 8/8.
- `npx playwright test e2e/navigation.mobile.spec.ts --project=mobile` → 3/3.
- `npx playwright test e2e/credits.spec.ts --project=chromium` → 1/2 (the failure is the
  contrast issue above, raised by components outside the shell).

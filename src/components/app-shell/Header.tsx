import React, { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { Coins, Menu, Plus, Search } from "lucide-react";
import { routeForPath } from "../../app/routes";
import { selectActiveJobs, useProjectStore } from "../../store/project-store";
import { useCreditStore } from "../../store/credit-store";
import { useUIStore } from "../../store/ui-store";
import { useAccountStore } from "../../store/account-store";
import { cn } from "../../lib/cn";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { Kbd } from "../ui/Kbd";
import { QueuePanel } from "../generation/QueuePanel";
import { Avatar } from "./Avatar";
import { isLowBalance } from "./shell-tokens";

/** Dropdown listing every job the generation runner is currently working on. */
const JobsIndicator: React.FC = () => {
  const activeJobs = useProjectStore(useShallow(selectActiveJobs));
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const menuId = useId();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (activeJobs.length === 0) setOpen(false);
  }, [activeJobs.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (activeJobs.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        data-testid="jobs-indicator"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 items-center gap-2 rounded-xl border border-brand-500/30 bg-brand-500/10 px-2.5 text-xs font-semibold text-brand-200 transition-colors hover:bg-brand-500/20"
      >
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
        </span>
        <span className="tabular-nums">{activeJobs.length} generating</span>
      </button>

      {open && (
        <div
          id={menuId}
          data-testid="jobs-menu"
          role="region"
          aria-label="Active generations"
          className="animate-fade-in absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] space-y-2 rounded-2xl border border-zinc-800 bg-surface-1 p-3 shadow-panel"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">In progress</h2>
            <Badge size="sm" variant="brand">
              {activeJobs.length}
            </Badge>
          </div>
          <ul role="list" className="max-h-80 space-y-2 overflow-y-auto">
            {activeJobs.map((project) => (
              <li key={project.id}>
                <QueuePanel project={project} compact onView={() => navigate(`/projects/${project.id}`)} />
              </li>
            ))}
          </ul>
          <Link to="/projects" onClick={() => setOpen(false)} className="block rounded-xl px-2 py-1.5 text-xs font-semibold text-brand-300 transition-colors hover:bg-zinc-800/60 hover:text-brand-200">
            Open library →
          </Link>
        </div>
      )}
    </div>
  );
};

/** Credit balance; opens the top-up dialog. Turns amber when the balance is low. */
const CreditsPill: React.FC = () => {
  const balance = useCreditStore((s) => s.balance);
  const openTopUp = useCreditStore((s) => s.openTopUp);
  const low = isLowBalance(balance);

  return (
    <button
      type="button"
      data-testid="credits-pill"
      onClick={openTopUp}
      aria-label={`${balance.toLocaleString()} credits. Open top up`}
      className={cn(
        "flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-sm font-semibold transition-colors",
        low ? "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20" : "border-zinc-800 bg-surface-2/80 text-zinc-100 hover:border-zinc-700 hover:bg-surface-3",
      )}
    >
      <Coins className={cn("h-4 w-4 shrink-0", low ? "text-amber-400" : "text-brand-400")} aria-hidden />
      <span className="font-mono tabular-nums">{balance.toLocaleString()}</span>
      <span className="hidden text-xs font-medium text-zinc-400 sm:inline">credits</span>
    </button>
  );
};

/**
 * Top bar: drawer toggle + breadcrumb on the left, live job state, credits,
 * search, the create shortcut and the account avatar on the right.
 */
export const Header: React.FC = () => {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { mobileNavOpen, setMobileNavOpen, setCommandPaletteOpen } = useUIStore(
    useShallow((s) => ({ mobileNavOpen: s.mobileNavOpen, setMobileNavOpen: s.setMobileNavOpen, setCommandPaletteOpen: s.setCommandPaletteOpen })),
  );
  const { displayName, avatarHue, defaultStudio } = useAccountStore(
    useShallow((s) => ({ displayName: s.displayName, avatarHue: s.avatarHue, defaultStudio: s.preferences.defaultStudio })),
  );

  const title = routeForPath(pathname, search)?.title ?? "FluxFrame";

  return (
    <header className="glass z-30 flex h-16 shrink-0 items-center gap-2 border-b border-zinc-800/80 px-3 sm:px-4">
      <IconButton
        data-testid="mobile-nav-toggle"
        label={mobileNavOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={mobileNavOpen}
        icon={<Menu className="h-5 w-5" />}
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
        className="md:hidden"
      />

      <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
        <span className="hidden shrink-0 text-zinc-400 sm:inline">FluxFrame</span>
        <span className="hidden shrink-0 text-zinc-400 sm:inline" aria-hidden>
          /
        </span>
        <span data-testid="header-breadcrumb" className="truncate font-semibold text-white">
          {title}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <JobsIndicator />
        <CreditsPill />

        <button
          type="button"
          data-testid="command-palette-trigger"
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Search FluxFrame"
          className="flex h-9 items-center gap-2 rounded-xl border border-zinc-800 bg-surface-2/80 px-2.5 text-sm text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-100"
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden lg:inline">Search</span>
          <Kbd className="hidden lg:inline-flex">⌘K</Kbd>
        </button>

        <Button
          data-testid="create-button"
          size="sm"
          className="hidden h-9 sm:inline-flex"
          leftIcon={<Plus className="h-4 w-4" aria-hidden />}
          onClick={() => navigate(`/create/${defaultStudio}`)}
        >
          Create
        </Button>

        <button
          type="button"
          data-testid="avatar-button"
          onClick={() => navigate("/account")}
          aria-label={`Account · ${displayName}`}
          className="rounded-full transition-opacity hover:opacity-80"
        >
          <Avatar name={displayName} hue={avatarHue} size="sm" />
        </button>
      </div>
    </header>
  );
};

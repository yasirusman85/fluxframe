import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { Coins, Layers, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import type { RouteMeta } from "../../app/routes";
import { ROUTE_GROUPS, routePathname, routesInGroup } from "../../app/routes";
import { useUIStore } from "../../store/ui-store";
import { useCreditStore } from "../../store/credit-store";
import { useAccountStore } from "../../store/account-store";
import { cn } from "../../lib/cn";
import { Badge } from "../ui/Badge";
import { IconButton } from "../ui/IconButton";
import { Avatar } from "./Avatar";
import { isLowBalance } from "./shell-tokens";

const NAV_LINK_BASE =
  "group flex h-10 items-center gap-2.5 rounded-xl border px-2.5 text-sm font-medium transition-colors";
const NAV_LINK_ACTIVE = "border-brand-500/30 bg-brand-500/12 text-brand-200";
const NAV_LINK_IDLE = "border-transparent text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100";

/**
 * Active state is computed by hand rather than left to `NavLink`: Library
 * (`/projects`) and Favorites (`/projects?filter=favorites`) share a pathname,
 * and `NavLink` matches on the pathname only — both entries would light up and
 * both would get `aria-current="page"` (it re-applies its own default when the
 * prop is `undefined`). Plain `Link` + this predicate keeps one active entry.
 */
function isRouteActive(route: RouteMeta, pathname: string, favoritesActive: boolean): boolean {
  if (route.id === "favorites") return favoritesActive;
  if (route.id === "projects") return !favoritesActive && (pathname === "/projects" || pathname.startsWith("/projects/"));
  const target = routePathname(route);
  if (target === "/") return pathname === "/";
  return pathname === target || pathname.startsWith(`${target}/`);
}

/**
 * Primary navigation. One element carries `data-testid="sidebar"` in every
 * layout: a static column from `md` up (256px, or 76px when collapsed) and an
 * off-canvas drawer below it — hidden with `display:none` when closed so it is
 * genuinely out of the viewport.
 */
export const Sidebar: React.FC = () => {
  const { pathname, search } = useLocation();
  const { collapsed, toggleSidebar, mobileNavOpen, setMobileNavOpen } = useUIStore(
    useShallow((s) => ({ collapsed: s.sidebarCollapsed, toggleSidebar: s.toggleSidebar, mobileNavOpen: s.mobileNavOpen, setMobileNavOpen: s.setMobileNavOpen })),
  );
  const balance = useCreditStore((s) => s.balance);
  const openTopUp = useCreditStore((s) => s.openTopUp);
  const { displayName, handle, avatarHue } = useAccountStore(useShallow((s) => ({ displayName: s.displayName, handle: s.handle, avatarHue: s.avatarHue })));

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen, setMobileNavOpen]);

  const favoritesActive = pathname === "/projects" && new URLSearchParams(search).get("filter") === "favorites";
  const lowBalance = isLowBalance(balance);
  /** Hides content in the collapsed desktop rail but keeps it in the drawer. */
  const railHidden = collapsed ? "md:hidden" : undefined;

  return (
    <>
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileNavOpen(false)}
          className="animate-fade-in fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        data-testid="sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] flex-col border-r border-zinc-800/80 bg-surface-1 shadow-2xl",
          "md:static md:max-w-none md:shadow-none",
          mobileNavOpen ? "flex" : "hidden md:flex",
          collapsed && "md:w-[76px]",
        )}
      >
        {/* Brand */}
        <div className={cn("flex h-16 shrink-0 items-center gap-2.5 border-b border-zinc-800/80 px-4", collapsed && "md:justify-center md:px-0")}>
          <Link
            to="/"
            className={cn("flex min-w-0 items-center gap-2.5 rounded-xl", collapsed && "md:justify-center")}
            aria-label="FluxFrame — AI Creative Studio, go to Explore"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-zinc-950 shadow-[0_8px_20px_-8px_rgb(16_185_129/0.9)]">
              <Layers className="h-5 w-5" aria-hidden />
            </span>
            <span className={cn("min-w-0 leading-tight", railHidden)} aria-hidden>
              <span className="block truncate text-sm font-extrabold tracking-tight text-white">FluxFrame</span>
              <span className="block truncate text-[10px] font-medium uppercase tracking-wider text-zinc-400">AI Creative Studio</span>
            </span>
          </Link>
          {/* Exactly one toggle exists at a time: inline when expanded, on its own row in the rail. */}
          {!collapsed && (
            <IconButton
              data-testid="sidebar-toggle"
              label="Collapse sidebar"
              icon={<PanelLeftClose className="h-4.5 w-4.5" />}
              onClick={toggleSidebar}
              size="sm"
              className="ml-auto hidden md:inline-flex"
            />
          )}
          <IconButton label="Close navigation" icon={<X className="h-4.5 w-4.5" />} onClick={() => setMobileNavOpen(false)} size="sm" className="ml-auto md:hidden" />
        </div>

        {collapsed && (
          <div className="hidden justify-center border-b border-zinc-800/80 py-2 md:flex">
            <IconButton data-testid="sidebar-toggle" label="Expand sidebar" icon={<PanelLeftOpen className="h-4.5 w-4.5" />} onClick={toggleSidebar} size="sm" />
          </div>
        )}

        <nav aria-label="Primary" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {ROUTE_GROUPS.map((group) => (
            <div key={group.id}>
              <p className={cn("px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400", collapsed && "md:sr-only")}>{group.label}</p>
              <ul role="list" className="space-y-1">
                {routesInGroup(group.id).map((route) => {
                  const Icon = route.icon;
                  const active = isRouteActive(route, pathname, favoritesActive);
                  return (
                    <li key={route.id}>
                      <Link
                        to={route.path}
                        data-testid={`nav-link-${route.id}`}
                        aria-current={active ? "page" : undefined}
                        title={collapsed ? route.title : undefined}
                        className={cn(NAV_LINK_BASE, active ? NAV_LINK_ACTIVE : NAV_LINK_IDLE, collapsed && "md:justify-center md:px-0")}
                      >
                        <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden />
                        <span className={cn("min-w-0 flex-1 truncate", collapsed && "md:sr-only")}>{route.title}</span>
                        {route.badge && (
                          <Badge size="sm" variant={active ? "brand" : "neutral"} className={railHidden}>
                            {route.badge}
                          </Badge>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 space-y-2 border-t border-zinc-800/80 p-3">
          <button
            type="button"
            onClick={openTopUp}
            aria-label={`${balance.toLocaleString()} credits remaining. Top up credits`}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl border border-zinc-800 bg-surface-2/70 px-2.5 py-2 text-left transition-colors hover:border-zinc-700 hover:bg-surface-3",
              railHidden,
            )}
          >
            <Coins className={cn("h-4 w-4 shrink-0", lowBalance ? "text-amber-400" : "text-brand-400")} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-medium text-zinc-400">Credits</span>
              <span className={cn("block font-mono text-sm font-bold tabular-nums", lowBalance ? "text-amber-300" : "text-zinc-100")}>{balance.toLocaleString()}</span>
            </span>
            {lowBalance && (
              <Badge size="sm" variant="amber">
                Low
              </Badge>
            )}
          </button>

          <Link
            to="/account"
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-zinc-800/60",
              collapsed && "md:justify-center md:px-0",
            )}
          >
            <Avatar name={displayName} hue={avatarHue} size="sm" />
            <span className={cn("min-w-0 flex-1 leading-tight", collapsed && "md:sr-only")}>
              <span className="block truncate text-sm font-semibold text-zinc-100">{displayName}</span>
              <span className="block truncate text-[11px] text-zinc-400">@{handle}</span>
            </span>
          </Link>
        </div>
      </aside>
    </>
  );
};

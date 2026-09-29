import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { Coins, Globe2, Search } from "lucide-react";
import { routeForPath } from "../../app/routes";
import { Avatar } from "../../components/app-shell/Avatar";
import { useAccountStore } from "../../store/account-store";
import { useCreditStore } from "../../store/credit-store";
import { useUIStore } from "../../store/ui-store";
import { selectCurrentUser, useAuthStore } from "../../store/auth-store";
import { cn } from "../../lib/cn";
import { LANDING_NAV } from "./landing-content";

/**
 * Thin accent strip above the nav. Dismissible, and the choice is remembered
 * for the session so it does not pop back on every route change.
 */
const NAV_BASE = "rounded-lg px-2 py-1 text-sm font-medium transition-colors";
const NAV_IDLE = "text-zinc-400 hover:bg-white/5 hover:text-white";
const NAV_ACTIVE = "text-accent";

/**
 * Marketing header: promo strip, logo, primary nav and the account cluster.
 * Sits above the app shell chrome rather than replacing it — studios keep the
 * sidebar, the landing page gets the wide navigation.
 */
export const LandingNav: React.FC = () => {
  const { pathname, search } = useLocation();
  const { displayName, avatarHue } = useAccountStore(
    useShallow((s) => ({ displayName: s.displayName, avatarHue: s.avatarHue })),
  );
  const balance = useCreditStore((s) => s.balance);
  const openTopUp = useCreditStore((s) => s.openTopUp);
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const currentUser = useAuthStore(selectCurrentUser);
  const openAuth = useAuthStore((state) => state.openAuth);
  const logout = useAuthStore((state) => state.logout);
  const isActive = (to: string) => {
    if (to === "/") return pathname === "/";
    const [targetPath, targetQuery] = to.split("?");
    if (pathname !== targetPath) return false;
    return targetQuery ? search === `?${targetQuery}` : !search;
  };

  return (
    <>
      <header className="sticky top-0 z-20 flex h-[62px] items-center gap-1 border-b border-white/5 bg-ink px-4">
        <Link
          to="/"
          aria-label="Higgsfield home"
          data-testid="landing-logo"
          className="mr-2 inline-flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-zinc-100 font-grotesk text-xl font-black text-black">
            ∿
          </span>
          <span className="hidden font-grotesk text-[16px] font-bold tracking-[-.04em] text-white xl:inline">Higgsfield</span>
        </Link>

        <nav aria-label="Main" className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto lf-scroll">
          {LANDING_NAV.map((item) => (
            <Link
              key={item.to + item.label}
              to={item.to}
              aria-current={isActive(item.to) ? "page" : undefined}
              className={cn(NAV_BASE, isActive(item.to) ? NAV_ACTIVE : NAV_IDLE)}
            >
              {item.label}{item.tag && <span className="ml-1 rounded bg-accent/20 px-1 py-0.5 text-[9px] font-bold text-accent">{item.tag}</span>}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button type="button" data-testid="command-palette-trigger" aria-label="Search" onClick={() => setCommandPaletteOpen(true)} className="hidden h-9 w-9 items-center justify-center rounded-[10px] bg-white/5 text-zinc-300 transition hover:bg-white/10 lg:inline-flex"><Search className="h-4 w-4"/></button>
          <button type="button" data-testid="credits-pill" aria-label={`${balance.toLocaleString()} credits. Open top up`} onClick={openTopUp} className="hidden items-center gap-1.5 rounded-[10px] bg-white/5 px-3 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/10 lg:inline-flex"><Coins className="h-3.5 w-3.5 text-accent"/><span>{balance.toLocaleString()}</span></button>
          <Link to="/account?tab=plans" className="hidden rounded-[10px] bg-white/5 px-3 py-2 text-sm font-medium text-zinc-200 xl:inline-flex">Pricing</Link>
          <Link to="/account" aria-label="Language" className="hidden h-9 w-9 items-center justify-center rounded-[10px] bg-white/5 text-zinc-300 lg:inline-flex"><Globe2 className="h-4 w-4"/></Link>
          {currentUser ? (
            <>
              <button type="button" onClick={logout} className="hidden rounded-[10px] bg-white/5 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/10 sm:inline-flex" data-testid="auth-logout">Logout</button>
              <Link to="/account" aria-label={`Account · ${displayName}`} className="hidden rounded-full transition-opacity hover:opacity-80 md:inline-flex" title={routeForPath(pathname, search)?.title ?? "Higgsfield"}><Avatar name={displayName} hue={avatarHue} size="sm" /></Link>
            </>
          ) : (
            <>
              <button type="button" onClick={() => openAuth("login")} className="hidden rounded-[10px] bg-white/5 px-3 py-2 text-sm font-semibold text-accent sm:inline-flex" data-testid="landing-login">Login</button>
              <button type="button" onClick={() => openAuth("signup")} className="rounded-[10px] bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90" data-testid="landing-signup">Sign up</button>
            </>
          )}
        </div>
      </header>
    </>
  );
};

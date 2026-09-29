import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { routeForPath } from "../../app/routes";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useUIStore } from "../../store/ui-store";
import { ToastContainer } from "../ui/Toast";
import { TopUpModal } from "../../features/account/TopUpModal";
import { AuthModal } from "../../features/auth/AuthModal";
import { CommandPalette } from "./CommandPalette";
import { LandingFooter } from "../../features/explore/LandingFooter";
import { LandingNav } from "../../features/explore/LandingNav";
import { Lightbox } from "./Lightbox";

const SKIP_LINK =
  "sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:inline-flex focus:h-10 focus:items-center focus:rounded-xl focus:border focus:border-brand-400/40 focus:bg-brand-500 focus:px-4 focus:text-sm focus:font-semibold focus:text-zinc-950";

/**
 * Application frame: sidebar + header + scrollable `<main>`, plus the global
 * overlays (toasts, command palette, lightbox, top-up dialog) mounted once.
 */
export const Layout: React.FC = () => {
  const { pathname, search } = useLocation();
  const setMobileNavOpen = useUIStore((s) => s.setMobileNavOpen);
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette);

  // The shell owns the document title; pages may set a more specific one first.
  useDocumentTitle(routeForPath(pathname, search)?.title ?? "");

  // The drawer never survives a navigation.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, search, setMobileNavOpen]);

  // Global ⌘K / Ctrl+K.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      if (event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      toggleCommandPalette();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleCommandPalette]);

  // The landing route gets the wide marketing chrome; every studio keeps the
  // sidebar shell.
  const isLanding = pathname === "/";

  if (isLanding) {
    return (
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-ink text-zinc-100">
        <a href="#main" className={SKIP_LINK}>
          Skip to content
        </a>
        <LandingNav />
        <main id="main" tabIndex={0} className="min-h-0 flex-1 overflow-y-auto focus:outline-none">
          <Outlet />
          <LandingFooter />
        </main>
        <ToastContainer />
        <CommandPalette />
        <Lightbox />
        <TopUpModal />
        <AuthModal />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-ink text-zinc-100">
      <a href="#main" className={SKIP_LINK}>
        Skip to content
      </a>
      <LandingNav />
      <main id="main" tabIndex={0} className="min-h-0 flex-1 overflow-y-auto focus:outline-none">
        <Outlet />
      </main>
      <ToastContainer />
      <CommandPalette />
      <Lightbox />
      <TopUpModal />
      <AuthModal />
    </div>
  );
};

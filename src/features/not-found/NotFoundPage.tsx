import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Library } from "lucide-react";
import { routesInGroup } from "../../app/routes";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { primaryLinkButton, secondaryLinkButton } from "../../components/app-shell/shell-tokens";
import { Badge } from "../../components/ui/Badge";

export const NotFoundPage: React.FC = () => {
  useDocumentTitle("Page not found");
  const studios = routesInGroup("studios");

  return (
    <section data-testid="not-found" className="mx-auto max-w-3xl px-4 py-8 animate-fade-in sm:px-6 md:py-14">
      <div className="space-y-4 text-center">
        <p className="text-gradient-brand text-7xl font-extrabold leading-none tracking-tighter md:text-8xl" aria-hidden>
          404
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
          <span className="sr-only">404 — </span>This page doesn't exist
        </h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-zinc-400">
          The link may be outdated or the page may have moved. Everything you have generated is still in your library.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <Link to="/" className={primaryLinkButton}>
            <ArrowLeft aria-hidden />
            Back to Explore
          </Link>
          <Link to="/projects" className={secondaryLinkButton}>
            <Library aria-hidden />
            Open library
          </Link>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">Or jump into a studio</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {studios.map((route) => {
            const Icon = route.icon;
            return (
              <li key={route.id}>
                <Link
                  to={route.path}
                  className="group flex h-full items-start gap-3 rounded-2xl border border-zinc-800/80 bg-surface-1 p-4 transition-colors hover:border-brand-500/40 hover:bg-surface-2"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-surface-2 text-brand-400 transition-colors group-hover:border-brand-500/40">
                    <Icon className="h-4.5 w-4.5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                      {route.title}
                      {route.badge && (
                        <Badge size="sm" variant="neutral">
                          {route.badge}
                        </Badge>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-zinc-400">{route.description}</span>
                  </span>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-400 transition-all group-hover:translate-x-0.5 group-hover:text-brand-300" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

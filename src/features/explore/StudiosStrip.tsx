import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check } from "lucide-react";
import { STUDIO_ROUTES } from "../../types/project";
import { STUDIOS, studioStartingCost } from "./studios";

export const StudiosStrip: React.FC = () => (
  <section aria-labelledby="studios-heading" className="space-y-5">
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 id="studios-heading" className="text-2xl font-extrabold tracking-tight text-white">
          Studios
        </h2>
        <p className="text-sm text-zinc-400">Five workflows, one library. Every output is a real file you can download.</p>
      </div>
      <p className="text-xs text-zinc-400">Credits are a local demo balance.</p>
    </div>

    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {STUDIOS.map((studio) => {
        const Icon = studio.icon;
        return (
          <li key={studio.type}>
            <Link
              to={STUDIO_ROUTES[studio.type]}
              data-testid={`engine-card-${studio.type}`}
              className="group flex h-full flex-col gap-3 rounded-2xl border border-zinc-800/80 bg-surface-1 p-4 transition-colors hover:border-brand-500/50 hover:bg-surface-2"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-500/30 bg-brand-500/10 text-brand-300">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <ArrowUpRight className="h-4 w-4 text-zinc-400 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-300" aria-hidden />
              </div>
              <div className="space-y-1">
                <span className="block text-sm font-bold text-white">{studio.name}</span>
                <span className="block text-xs leading-relaxed text-zinc-400">{studio.tagline}</span>
              </div>
              <div className="mt-auto space-y-1 border-t border-zinc-800/80 pt-3 text-[11px]">
                <span className="flex items-center gap-1.5 font-semibold text-zinc-200">
                  <Check className="h-3.5 w-3.5 text-brand-400" aria-hidden />
                  {studio.delivers}
                </span>
                <span className="block font-mono text-zinc-400">{studio.type === "marketing" ? `${studioStartingCost(studio.type)} credits` : `from ${studioStartingCost(studio.type)} credits`}</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  </section>
);

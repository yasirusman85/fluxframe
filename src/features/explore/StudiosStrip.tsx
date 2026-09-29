import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check } from "lucide-react";
import { STUDIO_ROUTES } from "../../types/project";
import { STUDIOS, studioStartingCost } from "./studios";
import { SectionHeading } from "./SectionHeading";

/** The five studio entry points, as a dense 5-up tile row. */
export const StudiosStrip: React.FC = () => (
  <section aria-labelledby="studios-heading" className="lf-section">
    <SectionHeading
      id="studios-heading"
      title="Studios"
      subtitle="Five workflows, one library. Every output is a real file you can download."
    />
    <ul role="list" className="lf-container grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3">
      {STUDIOS.map((studio) => {
        const Icon = studio.icon;
        return (
          <li key={studio.type}>
            <Link
              to={STUDIO_ROUTES[studio.type]}
              data-testid={`engine-card-${studio.type}`}
              className="group flex h-full flex-col gap-3 rounded-lg border border-ink-line bg-ink-raised p-4 transition-colors hover:border-accent/40"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-accent">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <ArrowUpRight
                  className="h-4 w-4 text-zinc-500 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
                  aria-hidden
                />
              </div>
              <div className="space-y-1">
                <span className="lf-card-title block text-white">{studio.name}</span>
                <span className="lf-card-sub block">{studio.tagline}</span>
              </div>
              <div className="mt-auto space-y-1 border-t border-ink-line pt-3 text-[11px]">
                <span className="flex items-center gap-1.5 font-semibold text-zinc-200">
                  <Check className="h-3.5 w-3.5 text-accent" aria-hidden />
                  {studio.delivers}
                </span>
                <span className="block font-mono text-zinc-500">
                  {studio.type === "marketing"
                    ? `${studioStartingCost(studio.type)} credits`
                    : `from ${studioStartingCost(studio.type)} credits`}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  </section>
);

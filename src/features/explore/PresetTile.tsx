import React from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/cn";
import type { PresetCard } from "./landing-content";

export interface PresetCardProps {
  preset: PresetCard;
  /** Stacks the card in a single column with a wider aspect. */
  className?: string;
}

/**
 * Reference preset tile: a rounded-8px media block, a hairline highlight
 * layered over the artwork, then the uppercase title and a muted descriptor.
 */
export const PresetTile: React.FC<PresetCardProps> = ({ preset, className }) => (
  <article className={cn("group relative", className)}>
    <Link
      to={preset.to}
      data-testid={`preset-card-${preset.id}`}
      className="grid grid-flow-row-dense gap-3 rounded-lg transition active:brightness-60"
    >
      <figure className="relative overflow-hidden rounded-lg bg-ink-raised">
        {preset.image ? (
          <img
            src={preset.image}
            alt={preset.title}
            loading="lazy"
            decoding="async"
            className="aspect-video h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div
            className="aspect-video w-full"
            style={{
              background: `linear-gradient(135deg, hsl(${(preset.seed % 360)} 40% 22%), hsl(${(preset.seed % 360 + 60) % 360} 35% 12%))`,
            }}
          />
        )}
        <span aria-hidden className="lf-hairline pointer-events-none absolute inset-0 rounded-lg" />
      </figure>
      <div className="grid grid-rows-2 text-left">
        <h3 className="lf-card-title truncate text-white">{preset.title}</h3>
        <p className="lf-card-sub truncate">{preset.subtitle}</p>
      </div>
    </Link>
  </article>
);

export interface PresetGridProps {
  presets: PresetCard[];
  /** 3 columns from `lg`, dropping to 2 then 1. */
  className?: string;
  "aria-label"?: string;
}

/** Dense responsive grid of preset tiles. */
export const PresetGrid: React.FC<PresetGridProps> = ({ presets, className, "aria-label": ariaLabel }) => (
  <ul
    role="list"
    aria-label={ariaLabel}
    className={cn("grid auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 lg:gap-3", className)}
  >
    {presets.map((preset) => (
      <li key={preset.id}>
        <PresetTile preset={preset} />
      </li>
    ))}
  </ul>
);

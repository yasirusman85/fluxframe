import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shuffle } from "lucide-react";
import { Button, Tabs } from "../../components/ui";
import { SHOWCASE_CATEGORIES, SHOWCASE_PRESETS, findModel } from "../../lib/catalog";
import type { ShowcasePreset } from "../../lib/catalog";
import { buildStudioUrl } from "../../lib/query-params";
import { proceduralDataUrl } from "../../lib/procedural";
import { STUDIO_ROUTES, TYPE_LABELS } from "../../types/project";
import { SectionHeading } from "./SectionHeading";

const CATEGORY_TABS = SHOWCASE_CATEGORIES.map((category) => ({ id: category, label: category }));

/** Deep link that re-opens a showcase preset's settings in the matching studio. */
export function showcaseRemixUrl(preset: ShowcasePreset): string {
  return buildStudioUrl(STUDIO_ROUTES[preset.type], {
    prompt: preset.prompt,
    model: preset.model,
    ratio: preset.aspectRatio,
    camera: preset.cameraPreset,
    product: preset.type === "marketing" ? preset.title : undefined,
  });
}

function modelLabel(preset: ShowcasePreset): string {
  return findModel(preset.model)?.name ?? (preset.type === "marketing" ? "Ad engine" : preset.model);
}

interface ShowcaseCardProps {
  preset: ShowcasePreset;
  onRemix: (preset: ShowcasePreset) => void;
}

/** Preset tile in the showcase system: media block, title, muted descriptor. */
const ShowcaseCard: React.FC<ShowcaseCardProps> = ({ preset, onRemix }) => {
  const [src, setSrc] = useState(preset.previewUrl);

  return (
    <article className="group relative overflow-hidden rounded-lg border border-ink-line bg-ink-raised transition-colors hover:border-zinc-600 focus-within:border-accent/60">
      {/* The whole card is one button (remix). The Remix button below is a sibling, never nested. */}
      <button
        type="button"
        data-testid={`showcase-card-${preset.id}`}
        onClick={() => onRemix(preset)}
        aria-label={`Remix ${preset.title} in the ${TYPE_LABELS[preset.type]} studio`}
        className="block w-full text-left"
      >
        <div className="relative w-full overflow-hidden bg-ink">
          <img
            src={src}
            alt={preset.title}
            loading="lazy"
            decoding="async"
            onError={() => setSrc(proceduralDataUrl({ title: preset.title, seed: preset.seed, aspectRatio: preset.aspectRatio }))}
            className="aspect-video h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
          <span aria-hidden className="lf-hairline pointer-events-none absolute inset-0" />
        </div>
        <div className="grid grid-rows-2 gap-0.5 p-3 text-left">
          <span className="lf-card-title block truncate text-white">{preset.title}</span>
          <span className="lf-card-sub block truncate">{modelLabel(preset)}</span>
        </div>
      </button>

      {/* Hover / focus overlay across the image area (always shown on touch devices). */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/35 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-accent">
              {TYPE_LABELS[preset.type]}
            </span>
            <span className="block truncate text-[11px] text-zinc-300">{preset.aspectRatio}</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            data-testid={`showcase-remix-${preset.id}`}
            onClick={() => onRemix(preset)}
            leftIcon={<Shuffle className="h-3.5 w-3.5" aria-hidden />}
            className="pointer-events-auto shrink-0"
            aria-label={`Remix ${preset.title}`}
          >
            Remix
          </Button>
        </div>
      </div>
    </article>
  );
};

export const ShowcaseSection: React.FC = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState<string>(SHOWCASE_CATEGORIES[0]);

  const presets = useMemo(
    () => (category === "All" ? SHOWCASE_PRESETS : SHOWCASE_PRESETS.filter((p) => p.category === category)),
    [category],
  );

  const remix = (preset: ShowcasePreset) => navigate(showcaseRemixUrl(preset));

  return (
    <section aria-labelledby="showcase-heading" className="lf-section-lg">
      <SectionHeading
        id="showcase-heading"
        title="Showcase"
        subtitle="Every still was generated with the same image pipeline the studios use. Pick one and remix it with your own prompt."
      />
      <div className="lf-container mb-4 md:mb-5">
        <Tabs
          tabs={CATEGORY_TABS}
          value={category}
          onChange={setCategory}
          ariaLabel="Showcase category"
          size="sm"
          testIdPrefix="showcase-filter"
          className="lf-scroll max-w-full overflow-x-auto"
        />
      </div>

      {presets.length === 0 ? (
        <p className="lf-container rounded-lg border border-dashed border-ink-line p-8 text-center text-sm text-zinc-400">
          Nothing in this category yet.
        </p>
      ) : (
        <ul
          role="list"
          aria-live="polite"
          data-testid="showcase-grid"
          className="lf-container grid auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 lg:gap-3"
        >
          {presets.map((preset) => (
            <li key={preset.id}>
              <ShowcaseCard preset={preset} onRemix={remix} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

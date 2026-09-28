import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shuffle } from "lucide-react";
import { Badge, Button, Tabs } from "../../components/ui";
import { SHOWCASE_CATEGORIES, SHOWCASE_PRESETS, findModel } from "../../lib/catalog";
import type { ShowcasePreset } from "../../lib/catalog";
import { buildStudioUrl } from "../../lib/query-params";
import { proceduralDataUrl } from "../../lib/procedural";
import { cssAspect } from "../../lib/aspect";
import { STUDIO_ROUTES, TYPE_LABELS } from "../../types/project";
import { TYPE_BADGE_VARIANT } from "./studios";

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

const ShowcaseCard: React.FC<ShowcaseCardProps> = ({ preset, onRemix }) => {
  const [src, setSrc] = useState(preset.previewUrl);
  const aspect = cssAspect(preset.aspectRatio);

  return (
    <article className="group relative mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-zinc-800/80 bg-surface-1 transition-colors hover:border-zinc-600 focus-within:border-brand-500/60">
      {/* The whole card is one button (remix). The Remix button below is a sibling, never nested. */}
      <button type="button" data-testid={`showcase-card-${preset.id}`} onClick={() => onRemix(preset)} aria-label={`Remix ${preset.title} in the ${TYPE_LABELS[preset.type]} studio`} className="block w-full text-left">
        <div className="relative w-full overflow-hidden bg-surface-2" style={{ aspectRatio: aspect }}>
          <img
            src={src}
            alt={preset.title}
            loading="lazy"
            decoding="async"
            onError={() => setSrc(proceduralDataUrl({ title: preset.title, seed: preset.seed, aspectRatio: preset.aspectRatio }))}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        </div>
        <div className="space-y-1 p-3.5">
          <span className="block text-sm font-bold text-zinc-100">{preset.title}</span>
          <span className="line-clamp-2 block text-xs leading-relaxed text-zinc-400">{preset.prompt}</span>
        </div>
      </button>

      {/* Hover / focus overlay across the image area (always shown on touch devices). */}
      <div
        style={{ aspectRatio: aspect }}
        className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/35 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100"
      >
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge size="sm" variant={TYPE_BADGE_VARIANT[preset.type]}>
                {TYPE_LABELS[preset.type]}
              </Badge>
              <Badge size="sm" variant="outline" className="border-zinc-500 text-zinc-100">
                {preset.aspectRatio}
              </Badge>
            </div>
            <span className="block truncate font-mono text-[11px] text-zinc-100">{modelLabel(preset)}</span>
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

  const presets = useMemo(() => (category === "All" ? SHOWCASE_PRESETS : SHOWCASE_PRESETS.filter((p) => p.category === category)), [category]);

  const remix = (preset: ShowcasePreset) => navigate(showcaseRemixUrl(preset));

  return (
    <section aria-labelledby="showcase-heading" className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 id="showcase-heading" className="text-2xl font-extrabold tracking-tight text-white">
            Showcase
          </h2>
          <p className="text-sm text-zinc-400">Every still was generated with the same image pipeline the studios use. Pick one and remix it with your own prompt.</p>
        </div>
        <Tabs tabs={CATEGORY_TABS} value={category} onChange={setCategory} ariaLabel="Showcase category" size="sm" testIdPrefix="showcase-filter" className="max-w-full" />
      </div>

      {presets.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-400">Nothing in this category yet.</p>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3" aria-live="polite">
          {presets.map((preset) => (
            <ShowcaseCard key={preset.id} preset={preset} onRemix={remix} />
          ))}
        </div>
      )}
    </section>
  );
};

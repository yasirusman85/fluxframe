import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CornerDownLeft } from "lucide-react";
import { Badge, Button, Kbd, SegmentedControl, Select, Textarea } from "../../components/ui";
import { PromptEnhancer } from "../../components/generation/PromptEnhancer";
import { SHOWCASE_PRESETS } from "../../lib/catalog";
import { buildStudioUrl } from "../../lib/query-params";
import type { GenerationType } from "../../types/project";
import { STUDIO_ROUTES } from "../../types/project";
import { HERO_STILL_IDS, STUDIOS, TRY_PROMPTS } from "./studios";

type HeroRatio = "16:9" | "9:16" | "1:1";

const RATIO_OPTIONS: Array<{ value: HeroRatio; label: string }> = [
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "1:1", label: "1:1" },
];

const STUDIO_OPTIONS = STUDIOS.map((studio) => ({ value: studio.type, label: studio.name }));
const STUDIO_TYPES = new Set<string>(STUDIOS.map((s) => s.type));

const HERO_STILLS = HERO_STILL_IDS.map((id) => SHOWCASE_PRESETS.find((p) => p.id === id)).filter((p) => p !== undefined);

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [studio, setStudio] = useState<GenerationType>("cinema");
  const [ratio, setRatio] = useState<HeroRatio>("16:9");

  const openStudio = () => {
    const clean = prompt.trim();
    // An empty prompt simply opens the chosen studio (ratio still travels along).
    navigate(buildStudioUrl(STUDIO_ROUTES[studio], { prompt: clean || undefined, ratio }));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      openStudio();
    }
  };

  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-surface-1 shadow-panel">
      {/* Cinematic backdrop: faint showcase montage + brand glow + dot grid. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 grid grid-cols-2 lg:grid-cols-4 opacity-20 [mask-image:linear-gradient(to_bottom,black_0%,transparent_90%)]">
          {HERO_STILLS.map((still) => (
            <img key={still.id} src={still.previewUrl} alt="" decoding="async" className="h-full w-full object-cover" />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-surface-0/60 via-surface-1/85 to-surface-1" />
        <div className="absolute inset-0 dot-grid bg-[size:22px_22px] opacity-50 [mask-image:radial-gradient(ellipse_at_top,black,transparent_65%)]" />
        <div className="absolute -top-40 left-1/2 h-80 w-[46rem] -translate-x-1/2 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pb-10 pt-12 text-center sm:px-8 lg:pb-14 lg:pt-20">
        <Badge variant="brand" dot className="animate-fade-in">
          FluxFrame Studio · v2
        </Badge>
        <h1 id="hero-heading" className="mt-5 animate-slide-up text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
          Direct cinematic AI video and imagery — <span className="text-gradient-brand">in your browser</span>
        </h1>
        <p className="mt-5 max-w-2xl animate-slide-up text-base text-zinc-300 sm:text-lg [animation-delay:60ms]">
          One prompt becomes an AI keyframe, then a camera-choreographed clip — generated, rendered and saved on your own machine.
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            openStudio();
          }}
          className="glass mt-8 w-full max-w-3xl animate-slide-up rounded-2xl border border-zinc-700/70 p-2 text-left shadow-panel glow-brand [animation-delay:120ms]"
          aria-label="Quick composer"
        >
          <Textarea
            testId="hero-composer-input"
            rows={2}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Describe your shot — a lone astronaut walking through neon rain, slow dolly in…"
            aria-label="Describe what you want to create"
            maxLength={1000}
            className="border-transparent bg-transparent px-3 py-2.5 text-base focus:border-transparent"
          />
          <div className="flex flex-col gap-2 border-t border-zinc-800/80 px-1 pb-1 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Select
              testId="hero-composer-studio"
              ariaLabel="Target studio"
              size="sm"
              value={studio}
              onChange={(value) => {
                if (STUDIO_TYPES.has(value)) setStudio(value as GenerationType);
              }}
              options={STUDIO_OPTIONS}
              className="sm:w-44"
            />
            <SegmentedControl ariaLabel="Aspect ratio" size="sm" options={RATIO_OPTIONS} value={ratio} onChange={setRatio} className="sm:w-48" />
            <div className="flex items-center justify-end gap-2 sm:ml-auto">
              <PromptEnhancer prompt={prompt} onEnhance={setPrompt} style="cinematic" disabled={!prompt.trim()} />
              <Button type="submit" data-testid="hero-composer-submit" rightIcon={<ArrowRight className="h-4 w-4" aria-hidden />}>
                Open studio
              </Button>
            </div>
          </div>
        </form>

        <div className="mt-4 flex w-full max-w-3xl flex-wrap items-center gap-2 text-xs text-zinc-400">
          <span className="font-semibold uppercase tracking-wider">Try:</span>
          {TRY_PROMPTS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setPrompt(item.prompt)}
              className="rounded-full border border-zinc-700/80 bg-surface-2/70 px-3 py-1 text-xs text-zinc-300 transition-colors hover:border-brand-500/60 hover:text-white"
            >
              {item.label}
            </button>
          ))}
          <span className="ml-auto hidden items-center gap-1 sm:inline-flex">
            <Kbd>
              <CornerDownLeft className="h-3 w-3" aria-hidden /> Enter
            </Kbd>
            to open
          </span>
        </div>
      </div>
    </section>
  );
};

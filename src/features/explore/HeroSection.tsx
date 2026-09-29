import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CornerDownLeft } from "lucide-react";
import { Badge, Button, Kbd, SegmentedControl, Select, Textarea } from "../../components/ui";
import { PromptEnhancer } from "../../components/generation/PromptEnhancer";
import { buildStudioUrl } from "../../lib/query-params";
import type { GenerationType } from "../../types/project";
import { STUDIO_ROUTES } from "../../types/project";
import { STUDIOS, TRY_PROMPTS } from "./studios";

type HeroRatio = "16:9" | "9:16" | "1:1";

const RATIO_OPTIONS: Array<{ value: HeroRatio; label: string }> = [
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "1:1", label: "1:1" },
];

const STUDIO_OPTIONS = STUDIOS.map((studio) => ({ value: studio.type, label: studio.name }));
const STUDIO_TYPES = new Set<string>(STUDIOS.map((s) => s.type));

/**
 * Quick composer. Stays the page's primary action, restyled onto the landing
 * surface system (16px gutter, 8px radius, hairline border).
 */
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

  return (
    <section aria-labelledby="hero-heading" className="lf-container mb-6 md:mb-8">
      <div className="rounded-3xl border border-ink-line bg-ink-raised p-5 md:p-8">
        <div className="max-w-3xl space-y-3">
          <Badge variant="brand" dot>
            Higgsfield Studio
          </Badge>
          <h1
            id="hero-heading"
            className="font-grotesk text-3xl font-bold leading-[1.08] tracking-tight text-white md:text-5xl"
          >
            Direct cinematic AI video and imagery
          </h1>
          <p className="text-sm leading-relaxed text-zinc-400 md:text-base">
            One prompt becomes an AI keyframe, then a camera-choreographed clip — generated, rendered and
            saved on your own machine.
          </p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            openStudio();
          }}
          className="mt-6 w-full rounded-lg border border-ink-line bg-ink p-2 text-left"
          aria-label="Quick composer"
        >
          <Textarea
            testId="hero-composer-input"
            rows={2}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                openStudio();
              }
            }}
            placeholder="Describe your shot — a lone astronaut walking through neon rain, slow dolly in…"
            aria-label="Describe what you want to create"
            maxLength={1000}
            className="border-transparent bg-transparent px-3 py-2.5 text-base focus:border-transparent"
          />
          <div className="flex flex-col gap-2 border-t border-ink-line px-1 pb-1 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
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
            <SegmentedControl
              ariaLabel="Aspect ratio"
              size="sm"
              options={RATIO_OPTIONS}
              value={ratio}
              onChange={setRatio}
              className="sm:w-48"
            />
            <div className="flex items-center justify-end gap-2 sm:ml-auto">
              <PromptEnhancer prompt={prompt} onEnhance={setPrompt} style="cinematic" disabled={!prompt.trim()} />
              <Button
                type="submit"
                data-testid="hero-composer-submit"
                rightIcon={<ArrowRight className="h-4 w-4" aria-hidden />}
              >
                Open studio
              </Button>
            </div>
          </div>
        </form>

        <div className="mt-4 flex w-full flex-wrap items-center gap-2 text-xs text-zinc-400">
          <span className="font-semibold uppercase tracking-wider">Try:</span>
          {TRY_PROMPTS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setPrompt(item.prompt)}
              className="rounded-full border border-ink-line bg-ink-raised px-3 py-1 text-xs text-zinc-300 transition-colors hover:border-accent/60 hover:text-white"
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

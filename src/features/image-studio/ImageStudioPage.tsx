import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, ChevronDown, Dices, ImageIcon, Images, SlidersHorizontal, Sparkles } from "lucide-react";
import { Badge, Button, Card, EmptyState, IconButton, Input, Kbd, PageHeader, SegmentedControl, Textarea } from "../../components/ui";
import { ModelSelector } from "../../components/generation/ModelSelector";
import { RatioSelector } from "../../components/generation/RatioSelector";
import { PromptEnhancer } from "../../components/generation/PromptEnhancer";
import { OutputCanvas } from "../../components/media/OutputCanvas";
import { MediaCard } from "../../components/media/MediaCard";
import { useGeneration } from "../../hooks/useGeneration";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useProjectStore } from "../../store/project-store";
import { useCreditStore } from "../../store/credit-store";
import { useUIStore } from "../../store/ui-store";
import { IMAGE_MODELS } from "../../lib/catalog";
import { parseStudioParams } from "../../lib/query-params";
import { cssAspect } from "../../lib/aspect";
import { randomSeed } from "../../lib/ids";
import { cn } from "../../lib/cn";
import type { GenerationProject } from "../../types/project";
import { IMAGE_RATIO_IDS, MAX_SEED, QUALITY_OPTIONS, findImageModel, formFromParams, formFromProject, normalizeSeed } from "./prefill";
import type { ImageStudioForm } from "./prefill";

/** Studio-level cap: the button turns into "Queue full" beyond this many image jobs. */
const MAX_ACTIVE_JOBS = 3;
const MAX_RECENT = 4;
const PROMPT_PLACEHOLDER = "A weathered lighthouse keeper in a yellow raincoat, storm light through the window, 85mm portrait…";

export const ImageStudioPage: React.FC = () => {
  useDocumentTitle("Image Studio");
  const [searchParams] = useSearchParams();
  const search = searchParams.toString();

  const balance = useCreditStore((s) => s.balance);
  const addToast = useUIStore((s) => s.addToast);
  const projects = useProjectStore((s) => s.projects);
  const { generate, activeJobs, activeJob, latestCompleted } = useGeneration("image");

  // Prefill once from the query string (prompt, negative, model, ratio, remix → seed/quality).
  const [form, setForm] = useState<ImageStudioForm>(() => formFromParams(parseStudioParams(searchParams), useProjectStore.getState().getProject));
  const appliedSearch = useRef(search);
  useEffect(() => {
    // Re-apply when a deep link changes while this page stays mounted (e.g. "remix" from a card below).
    if (appliedSearch.current === search) return;
    appliedSearch.current = search;
    if (!search) return;
    setForm(formFromParams(parseStudioParams(new URLSearchParams(search)), useProjectStore.getState().getProject));
  }, [search]);

  const patch = (changes: Partial<ImageStudioForm>) => setForm((current) => ({ ...current, ...changes }));

  const promptRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const advancedId = useId();

  const model = findImageModel(form.modelId);
  const cost = model.creditCost;
  const queueFull = activeJobs.length >= MAX_ACTIVE_JOBS;
  const hasPrompt = form.prompt.trim().length > 0;
  const canGenerate = hasPrompt && !queueFull;

  const imageProjects = useMemo(
    () => projects.filter((p) => p.type === "image").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [projects],
  );
  const recent = imageProjects.slice(0, MAX_RECENT);

  const handleGenerate = () => {
    if (!canGenerate) return;
    const project = generate({
      type: "image",
      prompt: form.prompt.trim(),
      negativePrompt: form.negativePrompt.trim() || undefined,
      model: model.id,
      aspectRatio: form.ratio,
      quality: form.quality,
      seed: form.seed ?? undefined,
      creditCost: model.creditCost,
    });
    // On stacked (mobile) layouts bring the queue/output into view.
    if (project && window.matchMedia("(max-width: 1023px)").matches) {
      outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const onPromptKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      handleGenerate();
    }
  };

  const applyProject = (project: GenerationProject) => {
    setForm(formFromProject(project));
    addToast(`Prompt, engine, ratio and seed from “${project.title}” are loaded. Tweak and generate again.`, { type: "info", title: "Remix" });
    promptRef.current?.focus();
    promptRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const advancedSummary = [form.negativePrompt.trim() && "Negative prompt", form.seed !== null && `Seed ${form.seed}`].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        icon={<ImageIcon aria-hidden />}
        title="Image Studio"
        badge={
          <Badge variant="sky" size="sm" dot>
            Pollinations
          </Badge>
        }
        description="Text to image with six engine styles. Real images come from the public Pollinations endpoint, are stored in this browser and download as files."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Controls */}
        <div className="lg:col-span-5">
          <Card className="space-y-5">
            <div className="space-y-1.5">
              <Textarea
                ref={promptRef}
                label="Prompt"
                testId="prompt-input"
                value={form.prompt}
                onChange={(event) => patch({ prompt: event.target.value })}
                onKeyDown={onPromptKeyDown}
                placeholder={PROMPT_PLACEHOLDER}
                maxLength={1000}
                showCount
                rows={5}
                trailing={<PromptEnhancer prompt={form.prompt} onEnhance={(next) => patch({ prompt: next })} style="photoreal" disabled={!hasPrompt} />}
              />
              <p className="text-[11px] text-zinc-400">
                <Kbd>⌘</Kbd> / <Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd> generates.
              </p>
            </div>

            <ModelSelector models={IMAGE_MODELS} value={form.modelId} onChange={(id) => patch({ modelId: id })} label="Engine" />

            <div className="space-y-1.5">
              <span className="block text-xs font-semibold text-zinc-300">Aspect ratio</span>
              <RatioSelector value={form.ratio} onChange={(ratio) => patch({ ratio })} ratios={IMAGE_RATIO_IDS} columns={3} />
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-semibold text-zinc-300">Quality</span>
              <SegmentedControl ariaLabel="Quality" size="sm" options={QUALITY_OPTIONS} value={form.quality} onChange={(quality) => patch({ quality })} />
            </div>

            {/* Advanced */}
            <div className="rounded-xl border border-zinc-800 bg-surface-2/40">
              <button
                type="button"
                data-testid="advanced-toggle"
                aria-expanded={form.advancedOpen}
                aria-controls={advancedId}
                onClick={() => patch({ advancedOpen: !form.advancedOpen })}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-300 transition-colors hover:text-white"
              >
                <span className="inline-flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-brand-400" aria-hidden />
                  Advanced
                </span>
                <span className="inline-flex min-w-0 items-center gap-2 text-[11px] font-medium text-zinc-400">
                  {!form.advancedOpen && advancedSummary && <span className="truncate">{advancedSummary}</span>}
                  <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", form.advancedOpen && "rotate-180")} aria-hidden />
                </span>
              </button>
              {form.advancedOpen && (
                <div id={advancedId} className="animate-fade-in space-y-3 border-t border-zinc-800 px-3.5 pb-3.5 pt-3">
                  <Input
                    label="Negative prompt"
                    testId="negative-prompt-input"
                    value={form.negativePrompt}
                    onChange={(event) => patch({ negativePrompt: event.target.value })}
                    placeholder="blurry, text, watermark, extra fingers"
                    maxLength={500}
                  />
                  <Input
                    label="Seed"
                    testId="seed-input"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={MAX_SEED}
                    step={1}
                    placeholder="Random"
                    value={form.seed ?? ""}
                    onChange={(event) => patch({ seed: normalizeSeed(event.target.value) })}
                    trailing={<IconButton size="sm" label="Randomize seed" icon={<Dices className="h-4 w-4" aria-hidden />} onClick={() => patch({ seed: randomSeed() })} />}
                  />
                  <p className="text-[11px] text-zinc-400">The same prompt and seed reproduce an image. Leave the seed blank for a fresh one every run.</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Button data-testid="generate-button" size="lg" fullWidth disabled={!canGenerate} onClick={handleGenerate} leftIcon={<Sparkles className="h-4 w-4" aria-hidden />}>
                {queueFull ? "Queue full" : `Generate · ${cost} credits`}
              </Button>
              <p className="text-[11px] leading-relaxed text-zinc-400">
                {queueFull ? (
                  <span className="text-amber-300">Three image jobs are running — wait for one to finish. </span>
                ) : balance < cost ? (
                  <span className="text-amber-300">Balance {balance.toLocaleString()} credits — Generate opens the top-up dialog. </span>
                ) : (
                  <>Balance {balance.toLocaleString()} credits. </>
                )}
                The public Pollinations endpoint allows about one request every 15 s; jobs queue automatically.
              </p>
            </div>
          </Card>
        </div>

        {/* Output */}
        <div ref={outputRef} className="scroll-mt-4 space-y-6 lg:col-span-7">
          <OutputCanvas
            project={latestCompleted}
            activeJob={activeJob}
            emptyTitle="Your first image lands here"
            emptyDescription="Describe a scene, choose an engine style and press Generate. Images arrive from Pollinations in a few seconds and are stored in this browser."
            emptyIcon={<ImageIcon aria-hidden />}
            aspect={cssAspect(form.ratio)}
            onRemix={applyProject}
          />

          <section aria-labelledby="recent-images-heading" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="recent-images-heading" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300">
                <Images className="h-4 w-4 text-brand-400" aria-hidden />
                Recent images
              </h2>
              <Link to="/projects?filter=image" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-300 transition-colors hover:text-brand-200">
                View all{imageProjects.length > 0 ? ` (${imageProjects.length})` : ""}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
            {recent.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {recent.map((project) => (
                  <MediaCard key={project.id} project={project} size="sm" />
                ))}
              </div>
            ) : (
              <EmptyState compact icon={<ImageIcon aria-hidden />} title="No images yet" description="Everything you generate here shows up in this row and in the library." />
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default ImageStudioPage;

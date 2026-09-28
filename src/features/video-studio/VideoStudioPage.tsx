import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Film, Sparkles, Video } from "lucide-react";
import { Badge, Button, Card, Dropzone, EmptyState, Kbd, PageHeader, Slider, Textarea } from "../../components/ui";
import { ModelSelector } from "../../components/generation/ModelSelector";
import { RatioSelector } from "../../components/generation/RatioSelector";
import { DurationSelector } from "../../components/generation/DurationSelector";
import { CameraMotionControl } from "../../components/generation/CameraMotionControl";
import { PromptEnhancer } from "../../components/generation/PromptEnhancer";
import { OutputCanvas } from "../../components/media/OutputCanvas";
import { MediaCard } from "../../components/media/MediaCard";
import { useGeneration } from "../../hooks/useGeneration";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useAssetUrl } from "../../hooks/useAsset";
import { useProjectStore } from "../../store/project-store";
import { useCreditStore } from "../../store/credit-store";
import { useUIStore } from "../../store/ui-store";
import { VIDEO_MODELS } from "../../lib/catalog";
import { parseStudioParams } from "../../lib/query-params";
import { cssAspect } from "../../lib/aspect";
import { storeUploadedImage } from "../../lib/image-utils";
import type { GenerationProject } from "../../types/project";
import { MAX_MOTION_STRENGTH, MIN_MOTION_STRENGTH, VIDEO_RATIO_IDS, findVideoModel, formFromParams, formFromProject } from "./prefill";
import type { VideoStudioForm } from "./prefill";

/** Studio-level cap: the button turns into "Queue full" beyond this many video jobs. */
const MAX_ACTIVE_JOBS = 3;
const MAX_RECENT = 4;
const PROMPT_PLACEHOLDER = "A lone climber on a granite ridge at first light, clouds drifting through the valley below…";

export const VideoStudioPage: React.FC = () => {
  useDocumentTitle("Video Studio");
  const [searchParams] = useSearchParams();
  const search = searchParams.toString();

  const balance = useCreditStore((s) => s.balance);
  const addToast = useUIStore((s) => s.addToast);
  const projects = useProjectStore((s) => s.projects);
  const { generate, activeJobs, activeJob, latestCompleted } = useGeneration("video");

  // Prefill once from the query string (prompt, model, ratio, duration, camera preset, source asset).
  const [form, setForm] = useState<VideoStudioForm>(() => formFromParams(parseStudioParams(searchParams)));
  const appliedSearch = useRef(search);
  useEffect(() => {
    // Re-apply when a deep link changes while this page stays mounted (e.g. "remix" from a card below).
    if (appliedSearch.current === search) return;
    appliedSearch.current = search;
    if (!search) return;
    setForm(formFromParams(parseStudioParams(new URLSearchParams(search))));
  }, [search]);

  const patch = (changes: Partial<VideoStudioForm>) => setForm((current) => ({ ...current, ...changes }));

  const promptRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const [lastJobId, setLastJobId] = useState<string>();

  const model = findVideoModel(form.modelId);
  const cost = model.creditCost;
  const queueFull = activeJobs.length >= MAX_ACTIVE_JOBS;
  const hasPrompt = form.prompt.trim().length > 0;
  const hasKeyframe = Boolean(form.sourceAssetId);
  const canGenerate = (hasPrompt || hasKeyframe) && !queueFull;

  // A fresh upload has its object URL to hand; a deep-linked `?source=` asset is resolved from IndexedDB.
  const storedKeyframeUrl = useAssetUrl(form.sourceAssetId);
  const keyframePreviewUrl = form.sourceUrl ?? storedKeyframeUrl;

  const videoProjects = useMemo(
    () => projects.filter((p) => p.type === "video").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [projects],
  );
  const recent = videoProjects.slice(0, MAX_RECENT);

  // Keep the last job on screen once it is cancelled or fails, so its reason and Retry stay reachable.
  const lastJob = lastJobId ? projects.find((p) => p.id === lastJobId) : undefined;
  const shownJob = activeJob ?? (lastJob && lastJob.status !== "completed" ? lastJob : undefined);

  const handleGenerate = () => {
    if (!canGenerate) return;
    const prompt = form.prompt.trim();
    const project = generate({
      type: "video",
      prompt,
      model: model.id,
      aspectRatio: form.ratio,
      duration: form.duration,
      motionStrength: form.motionStrength,
      cameraMotion: form.camera,
      sourceAssetId: form.sourceAssetId,
      creditCost: model.creditCost,
      title: prompt ? undefined : "Keyframe animation",
    });
    if (!project) return;
    setLastJobId(project.id);
    // On stacked (mobile) layouts bring the queue/output into view.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const onPromptKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      handleGenerate();
    }
  };

  // Errors thrown here are caught and shown inline by the Dropzone.
  const handleKeyframe = async (file: File) => {
    const { assetId, url } = await storeUploadedImage(file);
    patch({ sourceAssetId: assetId, sourceUrl: url, sourceName: file.name });
  };

  const clearKeyframe = () => patch({ sourceAssetId: undefined, sourceUrl: undefined, sourceName: undefined });

  const applyProject = (project: GenerationProject) => {
    setForm(formFromProject(project));
    addToast(`Prompt, engine, camera and duration from “${project.title}” are loaded. Tweak and render again.`, { type: "info", title: "Remix" });
    promptRef.current?.focus();
    promptRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        icon={<Video aria-hidden />}
        title="Video Studio"
        badge={
          <Badge variant="sky" size="sm" dot>
            Motion engine
          </Badge>
        }
        description="Prompt or keyframe to a moving clip. The camera move is rendered frame by frame in this tab and saved as a real .webm file — no server, no waiting room."
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
                rows={4}
                trailing={<PromptEnhancer prompt={form.prompt} onEnhance={(next) => patch({ prompt: next })} style="cinematic" disabled={!hasPrompt} />}
              />
              <p className="text-[11px] text-zinc-400">
                <Kbd>⌘</Kbd> / <Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd> generates.
              </p>
            </div>

            <Dropzone
              accept="image"
              testId="keyframe-dropzone"
              label="Upload a keyframe"
              hint="Optional — otherwise we generate one from your prompt"
              aspect={cssAspect(form.ratio)}
              previewUrl={keyframePreviewUrl}
              fileName={form.sourceName}
              onFile={handleKeyframe}
              onClear={hasKeyframe ? clearKeyframe : undefined}
            />

            <ModelSelector models={VIDEO_MODELS} value={form.modelId} onChange={(id) => patch({ modelId: id })} label="Motion engine" />

            <div className="space-y-1.5">
              <span className="block text-xs font-semibold text-zinc-300">Duration</span>
              <DurationSelector value={form.duration} onChange={(duration) => patch({ duration })} />
            </div>

            <div className="space-y-1">
              <Slider
                label="Motion strength"
                testId="motion-strength-slider"
                value={form.motionStrength}
                min={MIN_MOTION_STRENGTH}
                max={MAX_MOTION_STRENGTH}
                onChange={(motionStrength) => patch({ motionStrength })}
                formatValue={(value) => `${value}/10`}
              />
              <p className="text-[11px] leading-relaxed text-zinc-400">Scales how far every camera axis travels across the clip.</p>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-semibold text-zinc-300">Aspect ratio</span>
              <RatioSelector value={form.ratio} onChange={(ratio) => patch({ ratio })} ratios={VIDEO_RATIO_IDS} columns={4} />
            </div>

            <CameraMotionControl value={form.camera} onChange={(camera) => patch({ camera })} motionStrength={form.motionStrength} compact />

            <div className="space-y-2">
              <Button data-testid="generate-button" size="lg" fullWidth disabled={!canGenerate} onClick={handleGenerate} leftIcon={<Sparkles className="h-4 w-4" aria-hidden />}>
                {queueFull ? "Queue full" : `Generate · ${cost} credits`}
              </Button>
              <p className="text-[11px] leading-relaxed text-zinc-400">
                <span className="font-semibold text-zinc-300">How this clip is made: </span>
                {hasKeyframe ? "Your keyframe → camera-motion render in your browser (.webm)" : "Prompt → AI keyframe (Pollinations) → camera-motion render in your browser (.webm)"}
              </p>
              <p className="text-[11px] leading-relaxed text-zinc-400">
                {queueFull ? (
                  <span className="text-amber-300">Three video jobs are running — wait for one to finish. </span>
                ) : balance < cost ? (
                  <span className="text-amber-300">Balance {balance.toLocaleString()} credits — Generate opens the top-up dialog. </span>
                ) : (
                  <>Balance {balance.toLocaleString()} credits. </>
                )}
                Rendering runs in real time, so a {form.duration}-second clip takes roughly {form.duration} seconds plus the keyframe.
              </p>
            </div>
          </Card>
        </div>

        {/* Output */}
        <div ref={outputRef} className="scroll-mt-4 space-y-6 lg:col-span-7">
          <OutputCanvas
            project={latestCompleted}
            activeJob={shownJob}
            emptyTitle="Your first clip lands here"
            emptyDescription="Describe a shot or upload a keyframe, pick a camera move and press Generate. Frames are drawn and encoded in this tab, then stored as a real video file."
            emptyIcon={<Video aria-hidden />}
            aspect={cssAspect(form.ratio)}
            onRemix={applyProject}
          />

          <section aria-labelledby="recent-clips-heading" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="recent-clips-heading" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300">
                <Film className="h-4 w-4 text-brand-400" aria-hidden />
                Recent clips
              </h2>
              <Link to="/projects?filter=video" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-300 transition-colors hover:text-brand-200">
                View all{videoProjects.length > 0 ? ` (${videoProjects.length})` : ""}
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
              <EmptyState compact icon={<Film aria-hidden />} title="No clips yet" description="Everything you render here shows up in this row and in the library." />
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default VideoStudioPage;

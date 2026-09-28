import React, { useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Film, LayoutGrid, Megaphone, RotateCcw, Smartphone, Sparkles, Tv } from "lucide-react";
import { Badge, Button, Card, Dropzone, EmptyState, Input, PageHeader, SectionTitle, SegmentedControl, Textarea } from "../../components/ui";
import type { SegmentOption } from "../../components/ui";
import { OutputCanvas } from "../../components/media/OutputCanvas";
import { MediaCard } from "../../components/media/MediaCard";
import { useGeneration } from "../../hooks/useGeneration";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useProjectStore } from "../../store/project-store";
import { useCreditStore } from "../../store/credit-store";
import { AD_FORMATS, AD_TEMPLATES, BRAND_TONES } from "../../lib/catalog";
import { parseStudioParams } from "../../lib/query-params";
import { storeUploadedImage } from "../../lib/image-utils";
import { cssAspect } from "../../lib/aspect";
import { cn } from "../../lib/cn";
import {
  AD_CREDIT_COST,
  MAX_FEATURES,
  MOTION_LABELS,
  SCENE_LABELS,
  adFormFromParams,
  buildAdRequest,
  findTemplate,
  findTone,
  resetCopy,
  sceneCopy,
  setCopyField,
  setProductName,
  setProductUrl,
  setTemplate,
  setTone,
  templateSeconds,
} from "./ad-form";
import type { AdForm, PackshotUpload } from "./ad-form";

/** Studio-level cap: the button turns into "Queue full" beyond this many ad jobs. */
const MAX_ACTIVE_JOBS = 3;
const MAX_RECENT = 4;

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  "9:16": <Smartphone aria-hidden />,
  "16:9": <Tv aria-hidden />,
  "1:1": <LayoutGrid aria-hidden />,
};

const Step: React.FC<{ index: number; title: string; hint?: React.ReactNode; children: React.ReactNode }> = ({ index, title, hint, children }) => (
  <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/15 text-[10px] font-bold text-brand-300" aria-hidden>
        {index}
      </span>
      <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">{title}</h2>
      {hint && <span className="text-[11px] text-zinc-400">{hint}</span>}
    </div>
    {children}
  </div>
);

export const MarketingStudioPage: React.FC = () => {
  useDocumentTitle("Marketing Studio");
  const [searchParams] = useSearchParams();

  const balance = useCreditStore((s) => s.balance);
  const projects = useProjectStore((s) => s.projects);
  const { generate, activeJobs, activeJob, latestCompleted } = useGeneration("marketing");

  const [form, setForm] = useState<AdForm>(() => adFormFromParams(parseStudioParams(searchParams)));
  const [packshot, setPackshot] = useState<PackshotUpload | undefined>();
  const outputRef = useRef<HTMLDivElement>(null);

  const template = findTemplate(form.templateId);
  const tone = findTone(form.toneId);
  const productName = form.productName.trim();
  const queueFull = activeJobs.length >= MAX_ACTIVE_JOBS;
  const canGenerate = productName.length > 0 && !queueFull;
  const portraitOutput = form.format === "9:16";

  const adProjects = useMemo(
    () => projects.filter((p) => p.type === "marketing").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [projects],
  );
  const recent = adProjects.slice(0, MAX_RECENT);

  const formatOptions: SegmentOption<string>[] = AD_FORMATS.map((format) => ({
    value: format.ratio,
    label: format.ratio,
    description: format.label,
    icon: FORMAT_ICONS[format.ratio],
    testId: `ad-format-${format.ratio}`,
  }));

  const toneOptions: SegmentOption<string>[] = BRAND_TONES.map((option) => ({
    value: option.id,
    label: option.label,
    icon: <span className="block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: option.accent }} />,
    testId: `ad-tone-${option.id}`,
  }));

  const handlePackshot = async (file: File) => {
    const stored = await storeUploadedImage(file); // throws a readable message the Dropzone shows
    if (packshot) URL.revokeObjectURL(packshot.url);
    setPackshot({ assetId: stored.assetId, url: stored.url, name: file.name });
  };

  const clearPackshot = () => {
    if (packshot) URL.revokeObjectURL(packshot.url);
    setPackshot(undefined);
  };

  const handleGenerate = () => {
    if (!canGenerate) return;
    const project = generate(buildAdRequest(form, packshot?.assetId));
    if (project && window.matchMedia("(max-width: 1023px)").matches) {
      outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const onFieldKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        icon={<Megaphone aria-hidden />}
        title="Marketing Studio"
        badge={
          <Badge variant="brand" size="sm" dot>
            Ad engine
          </Badge>
        }
        description="Paste a product link, pick a template and a tone. The ad engine renders a multi-scene clip with animated typography in this browser."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Controls */}
        <div className="lg:col-span-5">
          <Card className="space-y-6">
            <Step index={1} title="Product">
              <div className="space-y-3">
                <Input
                  label="Product URL"
                  testId="product-url-input"
                  type="url"
                  inputMode="url"
                  value={form.productUrl}
                  onChange={(event) => setForm((current) => setProductUrl(current, event.target.value))}
                  onKeyDown={onFieldKeyDown}
                  placeholder="https://shop.example.com/products/aurora-desk-lamp"
                  hint="Optional. We read the product name from the slug — nothing is fetched."
                />
                <Input
                  label="Product name"
                  testId="product-name-input"
                  value={form.productName}
                  onChange={(event) => setForm((current) => setProductName(current, event.target.value))}
                  onKeyDown={onFieldKeyDown}
                  placeholder="Aurora Desk Lamp"
                  maxLength={60}
                  required
                />
                <Dropzone
                  accept="image"
                  testId="packshot-dropzone"
                  aspect="1 / 1"
                  label="Upload a packshot"
                  hint="PNG with a transparent background looks best. Optional — we generate a studio shot from the name."
                  previewUrl={packshot?.url}
                  fileName={packshot?.name}
                  onFile={handlePackshot}
                  onClear={packshot ? clearPackshot : undefined}
                />
              </div>
            </Step>

            <Step index={2} title="Template" hint={`${template.scenes.length} scenes · ${templateSeconds(template)}s`}>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {AD_TEMPLATES.map((option) => {
                  const selected = option.id === form.templateId;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      data-testid={`ad-template-${option.id}`}
                      aria-pressed={selected}
                      onClick={() => setForm((current) => setTemplate(current, option.id))}
                      className={cn(
                        "flex h-full flex-col gap-1 rounded-xl border p-3 text-left transition-colors",
                        selected
                          ? "border-brand-500/60 bg-brand-500/10 shadow-[inset_0_0_0_1px_rgb(16_185_129/0.2)]"
                          : "border-zinc-800 bg-surface-2 hover:border-zinc-700",
                      )}
                    >
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className={cn("text-xs font-bold", selected ? "text-brand-200" : "text-zinc-100")}>{option.title}</span>
                        <Badge size="sm" variant={selected ? "brand" : "neutral"}>
                          {option.badge}
                        </Badge>
                      </span>
                      <span className="text-[11px] leading-relaxed text-zinc-400">{option.description}</span>
                      <span className="mt-auto pt-1 font-mono text-[10px] text-zinc-400">
                        {option.scenes.length} scenes · {templateSeconds(option)}s · {option.aspectRatio}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Step>

            <Step index={3} title="Format & tone">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-zinc-300">Format</span>
                  <SegmentedControl
                    options={formatOptions}
                    value={form.format}
                    onChange={(format) => setForm((current) => ({ ...current, format }))}
                    ariaLabel="Ad format"
                    columns={3}
                    size="sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-zinc-300">Brand tone</span>
                  <SegmentedControl
                    options={toneOptions}
                    value={form.toneId}
                    onChange={(toneId) => setForm((current) => setTone(current, toneId))}
                    ariaLabel="Brand tone"
                    columns={2}
                    size="sm"
                  />
                </div>
              </div>
            </Step>

            <Step
              index={4}
              title="Copy"
              hint={
                <Button size="sm" variant="ghost" onClick={() => setForm(resetCopy)} leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden />}>
                  Reset copy
                </Button>
              }
            >
              <div className="space-y-3">
                <Input
                  label="Headline"
                  testId="ad-headline-input"
                  value={form.headline}
                  onChange={(event) => setForm((current) => setCopyField(current, "headline", event.target.value))}
                  onKeyDown={onFieldKeyDown}
                  maxLength={60}
                />
                <Input
                  label="Subheadline"
                  testId="ad-subheadline-input"
                  value={form.subheadline}
                  onChange={(event) => setForm((current) => setCopyField(current, "subheadline", event.target.value))}
                  onKeyDown={onFieldKeyDown}
                  maxLength={80}
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label="Call to action"
                    testId="ad-cta-input"
                    value={form.cta}
                    onChange={(event) => setForm((current) => setCopyField(current, "cta", event.target.value))}
                    onKeyDown={onFieldKeyDown}
                    maxLength={40}
                  />
                  <Input
                    label="Proof line"
                    testId="ad-proof-input"
                    value={form.proof}
                    onChange={(event) => setForm((current) => setCopyField(current, "proof", event.target.value))}
                    onKeyDown={onFieldKeyDown}
                    maxLength={60}
                  />
                </div>
                <Textarea
                  label="Feature chips"
                  testId="ad-features-input"
                  value={form.features}
                  onChange={(event) => setForm((current) => ({ ...current, features: event.target.value }))}
                  placeholder={"Dimmable to 1%\nUSB-C powered\nShips in 48 hours"}
                  rows={3}
                  maxLength={180}
                />
                <p className="text-[11px] leading-relaxed text-zinc-400">
                  One per line, up to {MAX_FEATURES}. Edited fields keep their wording when the tone changes; Reset copy restores the tone&rsquo;s.
                </p>
              </div>
            </Step>

            <Step index={5} title="Render">
              <div className="space-y-2">
                <Button
                  data-testid="generate-button"
                  size="lg"
                  fullWidth
                  disabled={!canGenerate}
                  onClick={handleGenerate}
                  leftIcon={<Sparkles className="h-4 w-4" aria-hidden />}
                >
                  {queueFull ? "Queue full" : `Build ad · ${AD_CREDIT_COST} credits`}
                </Button>
                <p className="text-[11px] leading-relaxed text-zinc-400">
                  {queueFull ? (
                    <span className="text-amber-300">Three ad jobs are running — wait for one to finish. </span>
                  ) : balance < AD_CREDIT_COST ? (
                    <span className="text-amber-300">Balance {balance.toLocaleString()} credits — Build ad opens the top-up dialog. </span>
                  ) : (
                    <>Balance {balance.toLocaleString()} credits. </>
                  )}
                  {productName
                    ? `${templateSeconds(template)}s of video is rendered in real time in this tab.`
                    : "Add a product name to enable rendering."}
                </p>
              </div>
            </Step>
          </Card>
        </div>

        {/* Output */}
        <div ref={outputRef} className="scroll-mt-4 space-y-6 lg:col-span-7">
          <Card data-testid="ad-storyboard" className="space-y-4">
            <SectionTitle icon={<Film aria-hidden />} hint={`${template.scenes.length} scenes · ${templateSeconds(template)}s · ${form.format}`}>
              Storyboard
            </SectionTitle>
            <ol className="space-y-2">
              {template.scenes.map((scene, index) => (
                <li key={`${scene.kind}-${index}`} className="flex gap-3">
                  <div className="flex w-5 shrink-0 flex-col items-center">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-brand-500/40 bg-brand-500/10 text-[10px] font-bold text-brand-300">
                      {index + 1}
                    </span>
                    {index < template.scenes.length - 1 && <span className="mt-1 w-px flex-1 bg-zinc-800" aria-hidden />}
                  </div>
                  <div className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-surface-2/60 px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-zinc-100">{SCENE_LABELS[scene.kind]}</span>
                      <span className="font-mono text-[10px] text-zinc-400">
                        {(scene.durationMs / 1000).toFixed(1)}s · {MOTION_LABELS[scene.motion]}
                      </span>
                    </div>
                    <ul className="mt-1 space-y-0.5">
                      {sceneCopy(scene.kind, form).map((line, lineIndex) => (
                        <li key={`${line}-${lineIndex}`} className="truncate text-[11px] leading-relaxed text-zinc-400">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-[11px] leading-relaxed text-zinc-400">
              Scene copy, the {tone.label.toLowerCase()} accent and the packshot are drawn frame by frame — what you see here is what the clip says.
            </p>
          </Card>

          {/* 9:16 output would otherwise be taller than the viewport. */}
          <div className={cn("w-full", portraitOutput && "mx-auto max-w-[360px]")}>
            <OutputCanvas
              project={latestCompleted}
              activeJob={activeJob}
              emptyTitle="Your ad lands here"
              emptyDescription="Name the product, pick a template and press Build ad. Scenes, typography and the packshot are rendered into a real video file."
              emptyIcon={<Megaphone aria-hidden />}
              aspect={cssAspect(form.format)}
            />
          </div>

          <section aria-labelledby="recent-ads-heading" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="recent-ads-heading" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300">
                <Megaphone className="h-4 w-4 text-brand-400" aria-hidden />
                Recent ads
              </h2>
              <Link to="/projects?filter=marketing" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-300 transition-colors hover:text-brand-200">
                View all{adProjects.length > 0 ? ` (${adProjects.length})` : ""}
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
              <EmptyState compact icon={<Megaphone aria-hidden />} title="No ads yet" description="Every ad you build shows up in this row and in the library." />
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default MarketingStudioPage;

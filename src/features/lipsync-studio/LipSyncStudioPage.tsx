import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, AudioLines, FileAudio, Mic, Play, Sparkles, Type, Volume2 } from "lucide-react";
import { Badge, Button, Card, Dropzone, EmptyState, Input, Kbd, PageHeader, Select, Slider, Switch, Tabs, Textarea } from "../../components/ui";
import { ModelSelector } from "../../components/generation/ModelSelector";
import { RatioSelector } from "../../components/generation/RatioSelector";
import { OutputCanvas } from "../../components/media/OutputCanvas";
import { MediaCard } from "../../components/media/MediaCard";
import { useGeneration } from "../../hooks/useGeneration";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useProjectStore } from "../../store/project-store";
import { useCreditStore } from "../../store/credit-store";
import { LIPSYNC_MODELS } from "../../lib/catalog";
import { parseStudioParams } from "../../lib/query-params";
import { putAsset } from "../../lib/asset-store";
import { storeUploadedImage } from "../../lib/image-utils";
import { MAX_AUDIO_SECONDS, decodeAudio, estimateSpeechDurationMs, isSpeechSupported, listVoices, speakText, validateAudioFile } from "../../lib/audio-utils";
import type { SpeechHandle } from "../../lib/audio-utils";
import { formatDuration } from "../../lib/format";
import { cssAspect } from "../../lib/aspect";
import {
  LIPSYNC_RATIO_IDS,
  MAX_SCRIPT_LENGTH,
  SCRIPT_CAP_SECONDS,
  buildLipsyncRequest,
  canSynthesize,
  clamp01,
  findLipsyncModel,
  lipSyncFormFromParams,
} from "./lipsync-form";
import type { AudioUpload, LipSyncForm, PortraitUpload } from "./lipsync-form";

/** Studio-level cap: the button turns into "Queue full" beyond this many lipsync jobs. */
const MAX_ACTIVE_JOBS = 3;
const MAX_RECENT = 4;
const SCRIPT_PLACEHOLDER = "Hi — I'm the face of your next launch video. Everything you see here was rendered in this browser…";

const MODE_TABS = [
  { id: "script", label: "Script", icon: <Type aria-hidden /> },
  { id: "audio", label: "Audio file", icon: <FileAudio aria-hidden /> },
];

export const LipSyncStudioPage: React.FC = () => {
  useDocumentTitle("LipSync Studio");
  const [searchParams] = useSearchParams();

  const balance = useCreditStore((s) => s.balance);
  const projects = useProjectStore((s) => s.projects);
  const { generate, activeJobs, activeJob, latestCompleted } = useGeneration("lipsync");

  const [form, setForm] = useState<LipSyncForm>(() => lipSyncFormFromParams(parseStudioParams(searchParams)));
  const [portrait, setPortrait] = useState<PortraitUpload | undefined>();
  const [audio, setAudio] = useState<AudioUpload | undefined>();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => listVoices());
  const [speaking, setSpeaking] = useState(false);

  const patch = (changes: Partial<LipSyncForm>) => setForm((current) => ({ ...current, ...changes }));

  const outputRef = useRef<HTMLDivElement>(null);
  const speechRef = useRef<SpeechHandle | null>(null);
  const draggingRef = useRef(false);

  // Voices load asynchronously in Chromium; refresh when the browser reports them.
  useEffect(() => {
    if (!isSpeechSupported()) return;
    const update = () => setVoices(listVoices());
    update();
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);

  useEffect(() => () => speechRef.current?.cancel(), []);

  const model = findLipsyncModel(form.modelId);
  const cost = model.creditCost;
  const queueFull = activeJobs.length >= MAX_ACTIVE_JOBS;
  const script = form.script.trim();
  const speechSupported = isSpeechSupported();
  const ready = canSynthesize(form, { portrait, audio });
  const canGenerate = ready && !queueFull;

  const estimateMs = useMemo(() => (script ? estimateSpeechDurationMs(script) : 0), [script]);
  const overScriptCap = estimateMs / 1000 > SCRIPT_CAP_SECONDS;

  const lipsyncProjects = useMemo(
    () => projects.filter((p) => p.type === "lipsync").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [projects],
  );
  const recent = lipsyncProjects.slice(0, MAX_RECENT);

  // ---- uploads ---------------------------------------------------------------

  const handlePortrait = async (file: File) => {
    const stored = await storeUploadedImage(file); // throws a readable message the Dropzone shows
    if (portrait) URL.revokeObjectURL(portrait.url);
    setPortrait({ assetId: stored.assetId, url: stored.url, name: file.name });
  };

  const clearPortrait = () => {
    if (portrait) URL.revokeObjectURL(portrait.url);
    setPortrait(undefined);
  };

  const handleAudio = async (file: File) => {
    const problem = validateAudioFile(file);
    if (problem) throw new Error(problem);
    const buffer = await decodeAudio(file);
    const assetId = await putAsset(file, "audio", { name: file.name, durationMs: buffer.duration * 1000 });
    if (audio) URL.revokeObjectURL(audio.url);
    setAudio({ assetId, url: URL.createObjectURL(file), name: file.name, durationMs: buffer.duration * 1000 });
  };

  const clearAudio = () => {
    if (audio) URL.revokeObjectURL(audio.url);
    setAudio(undefined);
  };

  // ---- mouth calibration -----------------------------------------------------

  const setMouthFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    patch({
      mouthX: clamp01((event.clientX - rect.left) / rect.width),
      mouthY: clamp01((event.clientY - rect.top) / rect.height),
    });
  };

  const onMarkerPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setMouthFromPointer(event);
  };

  const onMarkerPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) setMouthFromPointer(event);
  };

  const endMarkerDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  // ---- speech ----------------------------------------------------------------

  const speak = (text: string, voiceName?: string) => {
    if (!text.trim()) return;
    const handle = speakText(text, { voiceName: voiceName || undefined });
    speechRef.current = handle;
    setSpeaking(true);
    void handle.done.then(() => {
      if (speechRef.current === handle) setSpeaking(false);
    });
  };

  const togglePreview = () => {
    if (speaking) {
      speechRef.current?.cancel();
      setSpeaking(false);
      return;
    }
    speak(form.script, form.voice);
  };

  /** Plays the rendered clip and the synthesised voice together (script mode exports are silent). */
  const playWithVoice = () => {
    const video = outputRef.current?.querySelector<HTMLVideoElement>('[data-testid="output-video"]');
    if (video) {
      video.currentTime = 0;
      void video.play().catch(() => undefined);
    }
    speak(latestCompleted?.lipsync?.script ?? form.script, latestCompleted?.lipsync?.voice ?? form.voice);
  };

  // ---- generation ------------------------------------------------------------

  const handleGenerate = () => {
    if (!canGenerate) return;
    const project = generate(buildLipsyncRequest(form, { portrait, audio }));
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

  const voiceScript = latestCompleted?.lipsync?.script ?? script;
  const showPlayWithVoice = form.mode === "script" && Boolean(latestCompleted) && Boolean(voiceScript);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        icon={<AudioLines aria-hidden />}
        title="LipSync Studio"
        badge={
          <Badge variant="brand" size="sm" dot>
            Audio-driven
          </Badge>
        }
        description="Give a portrait a voice. Upload audio and the mouth follows its real envelope, or type a script and the studio times the mouth to the syllables."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Controls */}
        <div className="lg:col-span-5">
          <Card className="space-y-5">
            {/* 1 — portrait + mouth calibration */}
            <div className="space-y-2.5">
              <div className="relative">
                <Dropzone
                  accept="image"
                  testId="portrait-dropzone"
                  aspect="1 / 1"
                  label="Upload a portrait"
                  hint="Centred, front-facing portrait works best. Optional — we can generate one from a description."
                  previewUrl={portrait?.url}
                  fileName={portrait?.name}
                  onFile={handlePortrait}
                  onClear={portrait ? clearPortrait : undefined}
                />
                {portrait && (
                  // Pointer-only convenience that mirrors the two sliders below, so it is hidden from assistive tech.
                  <div
                    aria-hidden
                    data-testid="mouth-calibrator"
                    className="absolute inset-0 cursor-crosshair touch-none rounded-xl"
                    onPointerDown={onMarkerPointerDown}
                    onPointerMove={onMarkerPointerMove}
                    onPointerUp={endMarkerDrag}
                    onPointerCancel={endMarkerDrag}
                  >
                    <span
                      className="absolute z-10 block h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-400 bg-brand-400/25 shadow-[0_0_0_1px_rgba(0,0,0,0.65)]"
                      style={{ left: `${form.mouthX * 100}%`, top: `${form.mouthY * 100}%` }}
                    >
                      <span className="absolute left-1/2 top-1/2 h-3.5 w-px -translate-x-1/2 -translate-y-1/2 bg-white" />
                      <span className="absolute left-1/2 top-1/2 h-px w-3.5 -translate-x-1/2 -translate-y-1/2 bg-white" />
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Slider
                  label="Mouth X"
                  testId="mouth-x-slider"
                  value={form.mouthX}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(mouthX) => patch({ mouthX })}
                  formatValue={(v) => `${Math.round(v * 100)}%`}
                />
                <Slider
                  label="Mouth Y"
                  testId="mouth-y-slider"
                  value={form.mouthY}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(mouthY) => patch({ mouthY })}
                  formatValue={(v) => `${Math.round(v * 100)}%`}
                />
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-400">
                Place the marker on the mouth. {portrait ? "Drag it on the portrait or use the sliders — " : ""}the renderer opens the jaw around that point.
              </p>
            </div>

            {/* 2 — portrait description (used when nothing is uploaded) */}
            <Input
              label="Portrait description"
              testId="portrait-prompt-input"
              value={form.portraitPrompt}
              onChange={(event) => patch({ portraitPrompt: event.target.value })}
              onKeyDown={onFieldKeyDown}
              placeholder="A friendly presenter with short dark hair, charcoal jacket"
              maxLength={200}
              hint={portrait ? "Saved with the project. The uploaded portrait is used for the clip." : "No portrait uploaded — this description is generated into one first."}
            />

            {/* 3 — script or audio */}
            <div className="space-y-3">
              <Tabs
                tabs={MODE_TABS}
                value={form.mode}
                onChange={(id) => patch({ mode: id === "audio" ? "audio" : "script" })}
                ariaLabel="Voice source"
                testIdPrefix="lipsync-mode"
                fullWidth
                size="sm"
              />

              {form.mode === "script" ? (
                <div className="animate-fade-in space-y-3">
                  <Textarea
                    label="Script"
                    testId="script-input"
                    value={form.script}
                    onChange={(event) => patch({ script: event.target.value })}
                    onKeyDown={onFieldKeyDown}
                    placeholder={SCRIPT_PLACEHOLDER}
                    maxLength={MAX_SCRIPT_LENGTH}
                    showCount
                    rows={5}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-zinc-400">
                      {script ? (
                        <>
                          Estimated <span className="font-mono font-semibold text-brand-300">{formatDuration(estimateMs / 1000)}</span> spoken
                          {overScriptCap && <span className="text-amber-300"> · trimmed to {SCRIPT_CAP_SECONDS}s</span>}
                        </>
                      ) : (
                        <>
                          <Kbd>⌘</Kbd> / <Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd> synthesizes.
                        </>
                      )}
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      data-testid="speak-preview"
                      disabled={!speechSupported || script.length === 0}
                      onClick={togglePreview}
                      leftIcon={<Volume2 className="h-3.5 w-3.5" aria-hidden />}
                    >
                      {speaking ? "Stop preview" : "Preview voice"}
                    </Button>
                  </div>

                  {voices.length > 0 && (
                    <Select
                      label="Preview voice"
                      value={form.voice}
                      onChange={(voice) => patch({ voice })}
                      size="sm"
                      options={[{ value: "", label: "Browser default" }, ...voices.map((voice) => ({ value: voice.name, label: `${voice.name} (${voice.lang})` }))]}
                    />
                  )}

                  <p className="rounded-xl border border-zinc-800 bg-surface-2/60 px-3 py-2 text-[11px] leading-relaxed text-zinc-400">
                    Exported clips are silent in script mode — browsers can&rsquo;t record speech synthesis. Captions are burned in. Upload audio for a voiced export.
                  </p>
                </div>
              ) : (
                <div className="animate-fade-in space-y-3">
                  <Dropzone
                    accept="audio"
                    testId="audio-dropzone"
                    label="Upload audio"
                    hint={`MP3, WAV, M4A or OGG · up to ${MAX_AUDIO_SECONDS}s is used`}
                    fileName={audio?.name}
                    onFile={handleAudio}
                    onClear={audio ? clearAudio : undefined}
                    compact
                  />
                  {audio && (
                    <div className="animate-fade-in space-y-2 rounded-xl border border-zinc-800 bg-surface-2/60 p-3">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-zinc-200">
                          <Mic className="h-3.5 w-3.5 shrink-0 text-brand-400" aria-hidden />
                          <span className="truncate">{audio.name}</span>
                        </span>
                        <span className="shrink-0 font-mono font-semibold text-brand-300">{formatDuration(audio.durationMs / 1000)}</span>
                      </div>
                      <audio controls src={audio.url} className="w-full" aria-label={`Preview ${audio.name}`} />
                    </div>
                  )}
                  <p className="text-[11px] leading-relaxed text-zinc-400">The mouth follows the real amplitude envelope and the track is muxed into the exported clip.</p>
                </div>
              )}
            </div>

            {/* 4 — engine and look */}
            <ModelSelector models={LIPSYNC_MODELS} value={form.modelId} onChange={(modelId) => patch({ modelId })} label="Engine" />

            <div className="space-y-4">
              <Slider
                label="Expression"
                testId="expression-slider"
                value={form.expression}
                min={0}
                max={100}
                onChange={(expression) => patch({ expression })}
                formatValue={(v) => `${v}%`}
                hint="Head bob, tilt and scale driven by the envelope."
              />
              <Slider
                label="Mouth amplitude"
                testId="amplitude-slider"
                value={form.amplitude}
                min={0}
                max={100}
                onChange={(amplitude) => patch({ amplitude })}
                formatValue={(v) => `${v}%`}
                hint="How far the jaw travels on loud syllables."
              />
              {form.mode === "script" && (
                <Switch
                  checked={form.captions}
                  onChange={(captions) => patch({ captions })}
                  label="Captions"
                  description="Karaoke captions burned into the clip."
                  testId="captions-switch"
                />
              )}
              <Switch
                checked={form.visualizer}
                onChange={(visualizer) => patch({ visualizer })}
                label="Audio visualizer"
                description="Waveform bars along the bottom edge."
                testId="visualizer-switch"
              />
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-semibold text-zinc-300">Aspect ratio</span>
              <RatioSelector value={form.ratio} onChange={(ratio) => patch({ ratio })} ratios={LIPSYNC_RATIO_IDS} columns={3} />
            </div>

            {/* 5 — generate */}
            <div className="space-y-2">
              <Button
                data-testid="generate-button"
                size="lg"
                fullWidth
                disabled={!canGenerate}
                onClick={handleGenerate}
                leftIcon={<Sparkles className="h-4 w-4" aria-hidden />}
              >
                {queueFull ? "Queue full" : `Synthesize · ${cost} credits`}
              </Button>
              <p className="text-[11px] leading-relaxed text-zinc-400">
                {queueFull ? (
                  <span className="text-amber-300">Three lipsync jobs are running — wait for one to finish. </span>
                ) : balance < cost ? (
                  <span className="text-amber-300">Balance {balance.toLocaleString()} credits — Synthesize opens the top-up dialog. </span>
                ) : (
                  <>Balance {balance.toLocaleString()} credits. </>
                )}
                {ready
                  ? "Rendering runs in real time in this tab — a 5-second clip takes about 5 seconds."
                  : form.mode === "script"
                    ? "Add a script to enable synthesis."
                    : "Upload an audio file to enable synthesis."}
              </p>
            </div>
          </Card>
        </div>

        {/* Output */}
        <div ref={outputRef} className="scroll-mt-4 space-y-6 lg:col-span-7">
          <OutputCanvas
            project={latestCompleted}
            activeJob={activeJob}
            emptyTitle="Your talking portrait lands here"
            emptyDescription="Add a portrait (or describe one), type a script or upload audio, then press Synthesize. The clip is rendered frame by frame in this browser."
            emptyIcon={<AudioLines aria-hidden />}
            aspect={cssAspect(form.ratio)}
          />

          {showPlayWithVoice && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800/80 bg-surface-1 px-4 py-3">
              <p className="min-w-0 text-[11px] leading-relaxed text-zinc-400">
                The exported file is silent. Play it with the browser voice to hear the take as it was written.
              </p>
              <Button
                size="sm"
                variant="secondary"
                data-testid="play-with-voice"
                disabled={!speechSupported}
                onClick={playWithVoice}
                leftIcon={<Play className="h-3.5 w-3.5" aria-hidden />}
              >
                Play with voice
              </Button>
            </div>
          )}

          <section aria-labelledby="recent-lipsync-heading" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="recent-lipsync-heading" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300">
                <AudioLines className="h-4 w-4 text-brand-400" aria-hidden />
                Recent lipsync clips
              </h2>
              <Link to="/projects?filter=lipsync" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-300 transition-colors hover:text-brand-200">
                View all{lipsyncProjects.length > 0 ? ` (${lipsyncProjects.length})` : ""}
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
              <EmptyState compact icon={<AudioLines aria-hidden />} title="No clips yet" description="Everything you synthesize here shows up in this row and in the library." />
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default LipSyncStudioPage;

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Clapperboard,
  Upload,
  Zap,
  Film,
  Maximize2,
} from "lucide-react";
import { CINEMA_MODELS } from "../../lib/demo-assets";
import { useProjectStore } from "../../store/project-store";
import { useCreditStore } from "../../store/credit-store";
import { CameraMotionControl } from "../../components/generation/CameraMotionControl";
import { ModelSelector } from "../../components/generation/ModelSelector";
import { QueuePanel } from "../../components/generation/QueuePanel";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import type { CameraMotionSettings } from "../../types/project";
import { simulateGeneration } from "../../lib/generation-engine";

export const CinemaStudioPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, activeProcessingId, createProject, updateProject } = useProjectStore();
  const { deductCredits } = useCreditStore();

  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("kling-3-cinema");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState(5);
  const [initialImageUrl, setInitialImageUrl] = useState<string | undefined>(undefined);
  const [cameraMotion, setCameraMotion] = useState<CameraMotionSettings>({
    preset: "dolly-in",
    pan: 0,
    tilt: 0,
    zoom: 60,
    focalLength: "35mm",
    aperture: "f/2.8",
  });

  const selectedModel = CINEMA_MODELS.find((m) => m.id === model) || CINEMA_MODELS[0];
  const activeProject = activeProcessingId ? projects.find((p) => p.id === activeProcessingId) : undefined;
  const latestCompleted = projects.find((p) => p.type === "cinema" && p.status === "completed");

  const handleMagicEnhance = () => {
    if (!prompt.trim()) return;
    setPrompt(
      `${prompt.trim()}, 8K ultra cinematic lighting, anamorphic lens flare, shallow depth of field f/2.8, volumetric atmosphere, hyperrealistic film grain, shot on 70mm IMAX`
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setInitialImageUrl(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = () => {
    if (!prompt.trim() && !initialImageUrl) return;

    deductCredits(selectedModel.creditCost, `Cinema Studio (${selectedModel.name})`);

    const projectId = createProject({
      type: "cinema",
      prompt: prompt || "Keyframe Hero Motion Animation",
      model,
      aspectRatio,
      duration,
      quality: "high",
      initialImageUrl,
      cameraMotion,
    });

    const newProj = useProjectStore.getState().getProject(projectId);
    if (!newProj) return;

    simulateGeneration(newProj, (progress, status, stageMessage, resultUrl, providerSource) => {
      updateProject(projectId, {
        progress,
        status,
        errorMessage: stageMessage,
        outputUrl: resultUrl,
        providerSource,
      });
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Studio Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <Clapperboard className="w-7 h-7 text-violet-400" /> Cinema Studio 4.0
            </h1>
            <Badge variant="violet">Flagship Engine</Badge>
          </div>
          <p className="text-xs text-zinc-400 max-w-xl">
            Spatio-temporal AI filmmaking workspace. Stack multi-axis camera choreography, optical lens aperture control, and hero frame keyframing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => navigate("/projects")}>
            Cinema Vault ({projects.filter((p) => p.type === "cinema").length})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Creator Panel */}
        <div className="lg:col-span-7 space-y-6">
          {/* Model Selector */}
          <ModelSelector
            models={CINEMA_MODELS}
            selectedModelId={model}
            onSelectModel={setModel}
            label="Cinema Generation Engine"
          />

          {/* Hero Frame First Workflow */}
          <div className="space-y-2 rounded-2xl bg-zinc-900/90 border border-zinc-800 p-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5 uppercase tracking-wider">
                <Film className="w-4 h-4 text-violet-400" /> Hero Keyframe Image (Optional)
              </label>
              {initialImageUrl && (
                <button
                  onClick={() => setInitialImageUrl(undefined)}
                  className="text-xs text-rose-400 hover:underline font-semibold"
                >
                  Remove Keyframe
                </button>
              )}
            </div>

            {initialImageUrl ? (
              <div className="relative aspect-video rounded-xl overflow-hidden border border-violet-500/50 bg-zinc-950 group">
                <img src={initialImageUrl} alt="Hero Keyframe" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-white font-bold bg-violet-600 px-3 py-1.5 rounded-lg">
                    Hero Frame Loaded
                  </span>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-800 hover:border-violet-500/50 rounded-xl bg-zinc-950/60 hover:bg-zinc-900/80 cursor-pointer transition-all space-y-2">
                <Upload className="w-6 h-6 text-violet-400" />
                <span className="text-xs font-semibold text-zinc-300">
                  Upload Hero Keyframe Image
                </span>
                <span className="text-[11px] text-zinc-400">
                  Locks in subject anatomy before applying camera motion
                </span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* Cinematic Motion Prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-violet-400" /> Cinema Prompt Description
              </label>
              <button
                type="button"
                onClick={handleMagicEnhance}
                className="text-xs font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
              >
                <Zap className="w-3.5 h-3.5" /> Magic Enhance
              </button>
            </div>

            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe scene motion, atmosphere, actor emotion, lighting shifts... e.g. Cinematic camera pan right tracking a cyberpunk warrior running down a rainy neon street..."
              className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 p-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/70 transition-all resize-none"
            />
          </div>

          {/* Multi-Axis Camera Motion Controls */}
          <CameraMotionControl value={cameraMotion} onChange={setCameraMotion} />

          {/* Aspect Ratio & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Canvas Aspect Ratio</label>
              <div className="grid grid-cols-4 gap-1.5">
                {["16:9", "9:16", "1:1", "21:9"].map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      aspectRatio === ratio
                        ? "bg-violet-600 text-white border border-violet-400/50"
                        : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800"
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Sequence Duration</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[5, 10].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setDuration(sec)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      duration === sec
                        ? "bg-violet-600 text-white border border-violet-400/50"
                        : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800"
                    }`}
                  >
                    {sec} Seconds
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <Button
            size="lg"
            variant="primary"
            fullWidth
            onClick={handleGenerate}
            disabled={!!activeProcessingId || (!prompt.trim() && !initialImageUrl)}
            leftIcon={<Sparkles className="w-5 h-5" />}
          >
            Synthesize Cinema Sequence • {selectedModel.creditCost} Credits
          </Button>
        </div>

        {/* Right Output & Queue Canvas */}
        <div className="lg:col-span-5 space-y-6">
          {activeProject && <QueuePanel project={activeProject} />}

          {/* Canvas Output Display */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-zinc-300 flex items-center justify-between">
              <span>Cinematic Canvas Render</span>
              {latestCompleted && (
                <Badge variant="violet" size="sm">
                  {latestCompleted.model}
                </Badge>
              )}
            </h3>

            {latestCompleted ? (
              <div className="relative aspect-video rounded-3xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl group">
                <img
                  src={latestCompleted.outputUrl}
                  alt={latestCompleted.title}
                  className="w-full h-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-between p-4 opacity-90 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center justify-between">
                    <Badge variant="violet" size="sm">
                      CINEMA • 60 FPS
                    </Badge>
                    <button
                      onClick={() => navigate(`/projects/${latestCompleted.id}`)}
                      className="p-2 rounded-full bg-black/60 text-white hover:bg-violet-600 transition-colors"
                      title="Inspect full details"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-white">{latestCompleted.title}</h4>
                    <p className="text-xs text-zinc-300 line-clamp-1">{latestCompleted.prompt}</p>
                    <div className="pt-2 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => navigate(`/projects/${latestCompleted.id}`)}
                      >
                        Inspect Scene Details
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-video rounded-3xl border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center p-8 text-center bg-zinc-950/60 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-zinc-600 flex items-center justify-center">
                  <Clapperboard className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-zinc-300">No Cinema Render Yet</p>
                  <p className="text-xs text-zinc-400 max-w-xs">
                    Set up your camera motion, choose lens optics, and synthesize a cinema shot.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

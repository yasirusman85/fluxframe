import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Video as VideoIcon,
  Upload,
  Film,
  Sparkles,
  X,
} from "lucide-react";
import { VIDEO_MODELS } from "../../lib/demo-assets";
import { useProjectStore } from "../../store/project-store";
import { useUIStore } from "../../store/ui-store";
import { simulateGeneration } from "../../lib/generation-engine";
import { ModelSelector } from "../../components/generation/ModelSelector";
import { RatioSelector } from "../../components/generation/RatioSelector";
import { PromptEnhancer } from "../../components/generation/PromptEnhancer";
import { QueuePanel } from "../../components/generation/QueuePanel";
import { VideoPlayer } from "../../components/media/VideoPlayer";
import { MediaCard } from "../../components/media/MediaCard";
import { Button } from "../../components/ui/Button";

export const VideoStudioPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialModel = searchParams.get("model") || VIDEO_MODELS[0].id;
  const initialPrompt = searchParams.get("prompt") || "";

  const [prompt, setPrompt] = useState(initialPrompt);
  const [selectedModelId, setSelectedModelId] = useState(initialModel);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState<5 | 10>(5);
  const [motionStrength, setMotionStrength] = useState<number>(7);
  const [initialImageUrl, setInitialImageUrl] = useState<string | undefined>(undefined);
  const [currentStageMessage, setCurrentStageMessage] = useState("");

  const { projects, createProject, updateProject, activeProcessingId } = useProjectStore();
  const { addToast } = useUIStore();

  const activeProject = activeProcessingId
    ? projects.find((p) => p.id === activeProcessingId)
    : undefined;

  useEffect(() => {
    setSearchParams({ model: selectedModelId }, { replace: true });
  }, [selectedModelId, setSearchParams]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setInitialImageUrl(url);
      addToast("Loaded initial keyframe preview image", "info");
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !initialImageUrl) return;

    const projectId = createProject({
      type: "video",
      prompt: prompt.trim() || "Animate initial keyframe photo with smooth motion physics",
      model: selectedModelId,
      aspectRatio,
      duration,
      quality: "high",
      motionStrength,
      initialImageUrl,
    });

    addToast("Queued motion video generation", "info");

    const createdProject = useProjectStore.getState().getProject(projectId);
    if (!createdProject) return;

    await simulateGeneration(createdProject, (progress, status, stageMessage, resultUrl) => {
      setCurrentStageMessage(stageMessage || "Synthesizing optical motion...");
      updateProject(projectId, {
        progress,
        status,
        ...(resultUrl ? { outputUrl: resultUrl, thumbnailUrl: resultUrl } : {}),
      });

      if (status === "completed") {
        addToast("Motion video generation complete!", "success");
      }
    });
  };

  const recentVideoProjects = projects.filter((p) => p.type === "video");
  const latestCompleted = recentVideoProjects.find((p) => p.status === "completed");

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
      {/* Left Column: Video Controls Form */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <VideoIcon className="w-5 h-5 text-rose-400" /> Video Studio Controls
            </h2>
            <span className="text-xs text-rose-400 font-mono font-bold">Motion Engine V2</span>
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300">Motion Prompt</label>
              <PromptEnhancer prompt={prompt} onEnhance={(enhanced) => setPrompt(enhanced)} />
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe camera movement, camera panning, optical zoom, fluid movement... e.g. Fluid drone shot tracking through an enchanted bioluminescent rainforest..."
              className="w-full h-28 p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all resize-none"
            />
          </div>

          {/* Optional Starting Image Upload */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
              <span>Starting Image Keyframe (Optional)</span>
              {initialImageUrl && (
                <button
                  type="button"
                  onClick={() => setInitialImageUrl(undefined)}
                  className="text-[10px] text-red-400 hover:underline flex items-center gap-0.5"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              )}
            </label>

            {initialImageUrl ? (
              <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-rose-500/40 bg-zinc-950">
                <img
                  src={initialImageUrl}
                  alt="Keyframe upload preview"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950 hover:border-rose-500/50 hover:bg-zinc-950/80 transition-all cursor-pointer group">
                <Upload className="w-6 h-6 text-zinc-500 group-hover:text-rose-400 mb-1" />
                <span className="text-xs font-semibold text-zinc-300">Upload Starting Photo</span>
                <span className="text-[10px] text-zinc-500">PNG, JPG or WebP up to 10MB</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Model Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300">Select Motion Engine</label>
            <ModelSelector
              models={VIDEO_MODELS}
              selectedModelId={selectedModelId}
              onSelectModel={setSelectedModelId}
            />
          </div>

          {/* Motion Duration & Motion Strength */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300">Duration</label>
              <div className="grid grid-cols-2 gap-2">
                {([5, 10] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-colors ${
                      duration === d
                        ? "bg-rose-950/60 border-rose-500 text-rose-300"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    {d} Seconds
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                <span>Motion Strength</span>
                <span className="text-rose-400 font-mono">{motionStrength}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={motionStrength}
                onChange={(e) => setMotionStrength(parseInt(e.target.value, 10))}
                className="w-full accent-rose-500 h-2 bg-zinc-950 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300">Aspect Ratio</label>
            <RatioSelector selectedRatio={aspectRatio} onSelectRatio={setAspectRatio} />
          </div>

          {/* Generate Action Button */}
          <Button
            size="lg"
            variant="primary"
            onClick={handleGenerate}
            isLoading={!!activeProject}
            disabled={!prompt.trim() && !initialImageUrl}
            leftIcon={<Film className="w-5 h-5" />}
            className="w-full text-base font-bold bg-rose-600 hover:bg-rose-500 border-rose-500/40 shadow-xl"
          >
            {activeProject ? "Synthesizing Motion Video..." : "Generate Motion Video"}
          </Button>
        </div>
      </div>

      {/* Right Column: Video Preview & Output Canvas */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        {/* Active Processing Queue Panel */}
        {activeProject && (
          <QueuePanel
            project={activeProject}
            stageMessage={currentStageMessage}
            onViewDetails={() => navigate(`/projects/${activeProject.id}`)}
          />
        )}

        {/* Main Interactive Video Player Preview */}
        <div className="flex-1 rounded-2xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col min-h-[420px] shadow-2xl relative">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-400" /> Interactive Motion Preview
            </h3>
            {latestCompleted && (
              <span className="text-xs text-zinc-400 font-mono">
                {latestCompleted.model} • {latestCompleted.duration}s 60FPS
              </span>
            )}
          </div>

          <div className="flex-1 relative flex items-center justify-center rounded-xl bg-zinc-950 border border-zinc-800/80 overflow-hidden">
            {latestCompleted ? (
              <VideoPlayer
                src={latestCompleted.outputUrl!}
                title={latestCompleted.title}
                duration={latestCompleted.duration || 5}
              />
            ) : (
              <div className="p-8 text-center space-y-3 max-w-sm">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mx-auto">
                  <Film className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-zinc-300 text-sm">No Active Motion Video</h4>
                <p className="text-xs text-zinc-500">
                  Configure prompt or upload a keyframe photo to synthesize smooth fluid motion videos.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Video Outputs Grid */}
        {recentVideoProjects.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-zinc-300">Recent Motion Generations</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {recentVideoProjects.slice(0, 3).map((p) => (
                <MediaCard key={p.id} project={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Sliders,
  Wand2,
  Maximize2,
  Download,
  Info,
} from "lucide-react";
import { IMAGE_MODELS } from "../../lib/demo-assets";
import { useProjectStore } from "../../store/project-store";
import { useUIStore } from "../../store/ui-store";
import { simulateGeneration } from "../../lib/generation-engine";
import { ModelSelector } from "../../components/generation/ModelSelector";
import { RatioSelector } from "../../components/generation/RatioSelector";
import { PromptEnhancer } from "../../components/generation/PromptEnhancer";
import { QueuePanel } from "../../components/generation/QueuePanel";
import { Button } from "../../components/ui/Button";
import { MediaCard } from "../../components/media/MediaCard";
import { downloadMedia } from "../../lib/download";

export const ImageStudioPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialModel = searchParams.get("model") || IMAGE_MODELS[0].id;
  const initialPrompt = searchParams.get("prompt") || "";
  const initialRatio = searchParams.get("ratio") || "16:9";

  const [prompt, setPrompt] = useState(initialPrompt);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedModelId, setSelectedModelId] = useState(initialModel);
  const [aspectRatio, setAspectRatio] = useState(initialRatio);
  const [quality, setQuality] = useState<"draft" | "standard" | "high">("high");
  const [seed, setSeed] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentStageMessage, setCurrentStageMessage] = useState("");

  const { projects, createProject, updateProject, activeProcessingId } = useProjectStore();
  const { addToast } = useUIStore();

  const activeProject = activeProcessingId
    ? projects.find((p) => p.id === activeProcessingId)
    : undefined;

  // Sync state to search params
  useEffect(() => {
    setSearchParams({ model: selectedModelId, ratio: aspectRatio }, { replace: true });
  }, [selectedModelId, aspectRatio, setSearchParams]);

  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    const projectId = createProject({
      type: "image",
      prompt,
      negativePrompt: negativePrompt.trim() || undefined,
      model: selectedModelId,
      aspectRatio,
      quality,
      seed: seed ? parseInt(seed, 10) : undefined,
    });

    addToast("Queued image generation request", "info");

    const createdProject = useProjectStore.getState().getProject(projectId);
    if (!createdProject) return;

    await simulateGeneration(createdProject, (progress, status, stageMessage, resultUrl, providerSource) => {
      setCurrentStageMessage(stageMessage || "Processing...");
      updateProject(projectId, {
        progress,
        status,
        ...(resultUrl ? { outputUrl: resultUrl, thumbnailUrl: resultUrl } : {}),
        ...(providerSource ? { providerSource } : {}),
      });

      if (status === "completed") {
        addToast("Image generation complete!", "success");
      }
    });
  };

  const recentImageProjects = projects.filter((p) => p.type === "image");
  const latestCompleted = recentImageProjects.find((p) => p.status === "completed");

  const MAX_CHAR = 1000;
  const remainingChar = MAX_CHAR - prompt.length;

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
      {/* Left Column: Generation Controls Form */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-violet-400" /> Image Studio Controls
            </h2>
            <span className="text-xs text-zinc-400 font-mono">Prototype Mode</span>
          </div>

          {/* Provider & Privacy Disclosure */}
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
            <span>
              <strong>Provider Notice:</strong> Image generation uses a public Pollinations endpoint with automatic procedural fallback. Prompts are transmitted via URL parameters. Dynamic model allocation (`sana` / `flux`) is handled by the endpoint.
            </span>
          </div>

          {/* Prompt Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300">Prompt Description</label>
              <PromptEnhancer prompt={prompt} onEnhance={(enhanced) => setPrompt(enhanced)} />
            </div>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.substring(0, MAX_CHAR))}
                placeholder="Describe your visual scene in rich detail... e.g. A cybernetic obsidian valkyrie with bioluminescent blue trim..."
                className="w-full h-32 p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all resize-none"
              />
              <span className="absolute bottom-2.5 right-3 text-[10px] font-mono text-zinc-500">
                {remainingChar} left
              </span>
            </div>
          </div>

          {/* Model Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300">Select Model Preset</label>
            <ModelSelector
              models={IMAGE_MODELS}
              selectedModelId={selectedModelId}
              onSelectModel={handleModelChange}
            />
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300">Aspect Ratio Canvas</label>
            <RatioSelector selectedRatio={aspectRatio} onSelectRatio={setAspectRatio} />
          </div>

          {/* Quality Options */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300">Quality Preset</label>
            <div className="grid grid-cols-3 gap-2">
              {(["draft", "standard", "high"] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuality(q)}
                  className={`py-2 text-xs font-semibold rounded-xl border capitalize transition-colors ${
                    quality === q
                      ? "bg-violet-950/60 border-violet-500 text-violet-300"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Accordion */}
          <div className="border-t border-zinc-800/80 pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-xs font-bold text-zinc-400 hover:text-zinc-200"
            >
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-violet-400" /> Advanced Options
              </span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400">Negative Prompt</label>
                  <input
                    type="text"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="Elements to exclude e.g. blurry, distortion, low quality"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400">Seed (Optional)</label>
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    placeholder="Random seed integer e.g. 8492041"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <Button
            size="lg"
            variant="primary"
            onClick={handleGenerate}
            isLoading={!!activeProject}
            disabled={!prompt.trim()}
            leftIcon={<Wand2 className="w-5 h-5" />}
            className="w-full text-base font-bold shadow-xl glow-accent"
          >
            {activeProject ? "Generating Image..." : "Generate Image"}
          </Button>
        </div>
      </div>

      {/* Right Column: Preview & Output Canvas */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        {/* Active Processing Queue Panel */}
        {activeProject && (
          <QueuePanel
            project={activeProject}
            stageMessage={currentStageMessage}
            onViewDetails={() => navigate(`/projects/${activeProject.id}`)}
          />
        )}

        {/* Main Display Canvas */}
        <div className="flex-1 rounded-2xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col min-h-[420px] shadow-2xl relative">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" /> Interactive Canvas Output
            </h3>
            {latestCompleted && (
              <span className="text-xs text-zinc-400 font-mono">
                {latestCompleted.model} • {latestCompleted.aspectRatio}
              </span>
            )}
          </div>

          <div className="flex-1 relative flex items-center justify-center rounded-xl bg-zinc-950 border border-zinc-800/80 overflow-hidden group">
            {latestCompleted ? (
              <div className="relative w-full h-full flex items-center justify-center p-2">
                <img
                  src={latestCompleted.outputUrl}
                  alt={latestCompleted.title}
                  className="max-h-[500px] w-full object-contain rounded-lg shadow-2xl"
                />

                {/* Floating Canvas Actions */}
                <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(`/projects/${latestCompleted.id}`)}
                    leftIcon={<Maximize2 className="w-3.5 h-3.5" />}
                  >
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() =>
                      downloadMedia(
                        latestCompleted.outputUrl!,
                        `${latestCompleted.title.toLowerCase().replace(/\s+/g, "-")}.svg`
                      )
                    }
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >
                    Download 8K
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center space-y-3 max-w-sm">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mx-auto">
                  <ImageIcon className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-zinc-300 text-sm">No Active Preview</h4>
                <p className="text-xs text-zinc-500">
                  Enter a prompt on the left and click &quot;Generate Image&quot; to synthesize visual output.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Image Outputs Grid */}
        {recentImageProjects.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-zinc-300">Recent Image Generations</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {recentImageProjects.slice(0, 3).map((p) => (
                <MediaCard key={p.id} project={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

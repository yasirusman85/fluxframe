import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mic,
  Sparkles,
  Upload,
  User,
  Volume2,
  Music,
} from "lucide-react";
import { LIPSYNC_MODELS } from "../../lib/demo-assets";
import { useProjectStore } from "../../store/project-store";
import { useCreditStore } from "../../store/credit-store";
import { ModelSelector } from "../../components/generation/ModelSelector";
import { QueuePanel } from "../../components/generation/QueuePanel";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { simulateGeneration } from "../../lib/generation-engine";

export const LipSyncStudioPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, activeProcessingId, createProject, updateProject } = useProjectStore();
  const { deductCredits } = useCreditStore();

  const [model, setModel] = useState("higgsfield-speak-2");
  const [ttsPrompt, setTtsPrompt] = useState("");
  const [audioFile, setAudioFile] = useState<string | undefined>(undefined);
  const [avatarImage, setAvatarImage] = useState<string | undefined>(undefined);
  const [expressionIntensity, setExpressionIntensity] = useState(70);
  const [mouthAmplitude, setMouthAmplitude] = useState(80);

  const selectedModel = LIPSYNC_MODELS.find((m) => m.id === model) || LIPSYNC_MODELS[0];
  const activeProject = activeProcessingId ? projects.find((p) => p.id === activeProcessingId) : undefined;
  const latestCompleted = projects.find((p) => p.type === "lipsync" && p.status === "completed");

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setAvatarImage(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file.name);
    }
  };

  const handleGenerate = () => {
    if (!ttsPrompt.trim() && !audioFile) return;

    deductCredits(selectedModel.creditCost, `LipSync Studio (${selectedModel.name})`);

    const projectId = createProject({
      type: "lipsync",
      prompt: ttsPrompt ? `Speech: "${ttsPrompt.slice(0, 50)}..."` : `Audio Track: ${audioFile}`,
      model,
      aspectRatio: "16:9",
      duration: 5,
      quality: "high",
      initialImageUrl: avatarImage,
      audioUrl: audioFile,
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
              <Mic className="w-7 h-7 text-cyan-400" /> LipSync Studio
            </h1>
            <Badge variant="cyan">AI Character Dialogue</Badge>
          </div>
          <p className="text-xs text-zinc-400 max-w-xl">
            Phoneme-perfect lip-synchronization for uploaded portrait photos or digital actors. Connect speech audio or TTS text.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form */}
        <div className="lg:col-span-7 space-y-6">
          <ModelSelector
            models={LIPSYNC_MODELS}
            selectedModelId={model}
            onSelectModel={setModel}
            label="LipSync Audio Engine"
          />

          {/* Avatar Portrait Upload */}
          <div className="space-y-2 rounded-2xl bg-zinc-900/90 border border-zinc-800 p-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5 uppercase tracking-wider">
                <User className="w-4 h-4 text-cyan-400" /> Character Portrait Target
              </label>
              {avatarImage && (
                <button
                  onClick={() => setAvatarImage(undefined)}
                  className="text-xs text-rose-400 hover:underline font-semibold"
                >
                  Remove Portrait
                </button>
              )}
            </div>

            {avatarImage ? (
              <div className="relative aspect-square max-w-[200px] mx-auto rounded-2xl overflow-hidden border border-cyan-500/50 bg-zinc-950">
                <img src={avatarImage} alt="Avatar Target" className="w-full h-full object-cover" />
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-800 hover:border-cyan-500/50 rounded-xl bg-zinc-950/60 cursor-pointer transition-all space-y-2">
                <Upload className="w-6 h-6 text-cyan-400" />
                <span className="text-xs font-semibold text-zinc-300">
                  Upload Target Character Portrait
                </span>
                <span className="text-[11px] text-zinc-400">
                  High-res front-facing portrait photo
                </span>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* Audio Input Pipeline */}
          <div className="space-y-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 p-4">
            <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5 uppercase tracking-wider">
              <Volume2 className="w-4 h-4 text-cyan-400" /> Audio & Speech Input Pipeline
            </label>

            {/* TTS Text Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Text-to-Speech Dialogue</label>
              <textarea
                rows={3}
                value={ttsPrompt}
                onChange={(e) => setTtsPrompt(e.target.value)}
                placeholder="Type the dialogue script for your avatar to speak... e.g. Welcome to Higgsfield Studio! Today we are exploring state-of-the-art AI lip synchronization..."
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="text-center text-xs text-zinc-500 font-semibold">— OR —</div>

            {/* Audio File Upload */}
            {audioFile ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-cyan-500/40 text-xs">
                <span className="flex items-center gap-2 font-mono text-cyan-300">
                  <Music className="w-4 h-4" /> {audioFile}
                </span>
                <button
                  onClick={() => setAudioFile(undefined)}
                  className="text-xs text-rose-400 hover:underline"
                >
                  Clear Audio
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-zinc-800 hover:border-cyan-500/50 rounded-xl bg-zinc-950/60 cursor-pointer transition-all text-xs font-semibold text-zinc-300">
                <Upload className="w-4 h-4 text-cyan-400" /> Upload Voice Audio File (.mp3, .wav)
                <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* Refinement Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 p-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-zinc-300">
                <span>Facial Expression Intensity</span>
                <span className="font-mono text-cyan-400">{expressionIntensity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={expressionIntensity}
                onChange={(e) => setExpressionIntensity(Number(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-zinc-300">
                <span>Mouth Amplitude Motion</span>
                <span className="font-mono text-cyan-400">{mouthAmplitude}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={mouthAmplitude}
                onChange={(e) => setMouthAmplitude(Number(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Action Button */}
          <Button
            size="lg"
            variant="primary"
            fullWidth
            onClick={handleGenerate}
            disabled={!!activeProcessingId || (!ttsPrompt.trim() && !audioFile)}
            leftIcon={<Sparkles className="w-5 h-5" />}
          >
            Synthesize LipSync Avatar • {selectedModel.creditCost} Credits
          </Button>
        </div>

        {/* Right Output Panel */}
        <div className="lg:col-span-5 space-y-6">
          {activeProject && <QueuePanel project={activeProject} />}

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-zinc-300 flex items-center justify-between">
              <span>LipSync Output Preview</span>
              {latestCompleted && (
                <Badge variant="cyan" size="sm">
                  {latestCompleted.model}
                </Badge>
              )}
            </h3>

            {latestCompleted ? (
              <div className="relative aspect-square max-w-[400px] mx-auto rounded-3xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl group">
                <img
                  src={latestCompleted.outputUrl}
                  alt={latestCompleted.title}
                  className="w-full h-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-between p-4">
                  <Badge variant="cyan" size="sm">
                    LIPSYNC • 4K SYNC
                  </Badge>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => navigate(`/projects/${latestCompleted.id}`)}
                  >
                    Inspect Dialogue Asset
                  </Button>
                </div>
              </div>
            ) : (
              <div className="aspect-square rounded-3xl border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center p-8 text-center bg-zinc-950/60 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-zinc-600 flex items-center justify-center">
                  <Mic className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-zinc-300">No Dialogue Synced Yet</p>
                  <p className="text-xs text-zinc-400 max-w-xs">
                    Upload a portrait target, type dialogue speech, and generate a talking avatar.
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

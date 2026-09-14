import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Clapperboard,
  Image as ImageIcon,
  Store,
  Mic,
  TrendingUp,
  ArrowRight,
  Zap,
} from "lucide-react";
import { PRESET_PROMPTS } from "../../lib/demo-assets";
import { useProjectStore } from "../../store/project-store";
import { MediaCard } from "../../components/media/MediaCard";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";

export const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const { projects } = useProjectStore();

  const [activeCategory, setActiveCategory] = useState<string>("All");

  const recentProjects = projects.slice(0, 4);

  const filteredPresets = PRESET_PROMPTS.filter(
    (preset) => activeCategory === "All" || preset.category === activeCategory
  );

  const handleUsePreset = (preset: typeof PRESET_PROMPTS[0]) => {
    navigate(
      `/create/${preset.type}?prompt=${encodeURIComponent(preset.prompt)}&model=${preset.model}&ratio=${preset.aspectRatio}`
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-12">
      {/* Hero Featured Card Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-950 via-zinc-900 to-indigo-950 border border-violet-800/40 p-8 md:p-12 shadow-2xl glow-accent">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" /> Next-Gen AI Visual Creative Suite
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Turn prompts into <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-300">cinematic imagery</span> & 60fps motion
          </h1>
          <p className="text-sm md:text-base text-zinc-300 leading-relaxed">
            Synthesize 8K imagery, multi-axis cinema camera choreography, automated commercial ad videos, and phoneme-perfect lip sync avatars.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-4">
            <Button
              size="lg"
              variant="primary"
              onClick={() => navigate("/create/cinema")}
              leftIcon={<Clapperboard className="w-5 h-5" />}
            >
              Open Cinema Studio 4.0
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate("/create/image")}
              leftIcon={<ImageIcon className="w-5 h-5" />}
            >
              Open Image Studio
            </Button>
          </div>
        </div>

        {/* Ambient Decorative Shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Quick-Start Workspaces Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" /> Flagship Studios & Workspaces
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Cinema Studio */}
          <div
            onClick={() => navigate("/create/cinema")}
            className="group relative p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-violet-500/60 hover:bg-zinc-900 transition-all cursor-pointer space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-violet-950 text-violet-400 border border-violet-800/50 flex items-center justify-center">
                <Clapperboard className="w-6 h-6" />
              </div>
              <Badge variant="violet">Flagship V4</Badge>
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-violet-300 transition-colors">
              Cinema Studio 4.0
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Multi-axis camera motion, optical lens controls, and spatio-temporal video synthesis.
            </p>
            <div className="pt-2 text-xs font-bold text-violet-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Launch Cinema Studio &rarr;
            </div>
          </div>

          {/* Image Studio */}
          <div
            onClick={() => navigate("/create/image")}
            className="group relative p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-indigo-500/60 hover:bg-zinc-900 transition-all cursor-pointer space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800/50 flex items-center justify-center">
                <ImageIcon className="w-6 h-6" />
              </div>
              <Badge variant="zinc">6 AI Engines</Badge>
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
              Image Generation Studio
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Photorealistic portraits, sci-fi concept art, architecture, and live Pollinations endpoint.
            </p>
            <div className="pt-2 text-xs font-bold text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Launch Image Studio &rarr;
            </div>
          </div>

          {/* Marketing Studio */}
          <div
            onClick={() => navigate("/create/marketing")}
            className="group relative p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/60 hover:bg-zinc-900 transition-all cursor-pointer space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/50 flex items-center justify-center">
                <Store className="w-6 h-6" />
              </div>
              <Badge variant="emerald">Ad Builder</Badge>
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
              Marketing Studio
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Product links to TikTok UGC reviews, unboxing sequences, and commercial ad campaigns.
            </p>
            <div className="pt-2 text-xs font-bold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Launch Marketing Studio &rarr;
            </div>
          </div>

          {/* LipSync Studio */}
          <div
            onClick={() => navigate("/create/lipsync")}
            className="group relative p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-cyan-500/60 hover:bg-zinc-900 transition-all cursor-pointer space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/50 flex items-center justify-center">
                <Mic className="w-6 h-6" />
              </div>
              <Badge variant="cyan">AI Avatar</Badge>
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
              LipSync Studio
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Phoneme-perfect lip animation for target portraits with audio & TTS pipeline.
            </p>
            <div className="pt-2 text-xs font-bold text-cyan-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Launch LipSync Studio &rarr;
            </div>
          </div>
        </div>
      </div>

      {/* Featured Preset Prompts Gallery */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-violet-400" /> Featured Community Presets
            </h2>
            <p className="text-xs text-zinc-400">Click any preset to prefill generator controls</p>
          </div>

          {/* Preset Category Chips */}
          <div className="flex items-center gap-1.5 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 overflow-x-auto">
            {["All", "Sci-Fi", "Nature & Motion", "Automotive", "Commercial", "Architecture"].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeCategory === cat
                    ? "bg-violet-600 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPresets.map((preset) => (
            <div
              key={preset.id}
              onClick={() => handleUsePreset(preset)}
              className="group relative flex flex-col rounded-2xl bg-zinc-900 border border-zinc-800/80 overflow-hidden hover:border-violet-500/60 hover:shadow-xl transition-all cursor-pointer"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
                <img
                  src={preset.previewUrl}
                  alt={preset.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute top-2.5 left-2.5">
                  <Badge variant={preset.type === "cinema" ? "violet" : preset.type === "video" ? "rose" : "zinc"} size="sm">
                    {preset.type.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="p-4 flex flex-col justify-between flex-1 gap-3">
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-zinc-100 group-hover:text-violet-300 transition-colors">
                    {preset.title}
                  </h4>
                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {preset.prompt}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-xs font-semibold text-violet-400">
                  <span>Category: {preset.category}</span>
                  <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Try Prompt <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recently Created Projects */}
      {recentProjects.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Recent Generations
            </h2>
            <Button size="sm" variant="ghost" onClick={() => navigate("/projects")}>
              View All Library &rarr;
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentProjects.map((project) => (
              <MediaCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

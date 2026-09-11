import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Image as ImageIcon,
  Video as VideoIcon,
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

  const recentProjects = projects.slice(0, 4);

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
            <Sparkles className="w-3.5 h-3.5" /> Next-Gen AI Visual Studio
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Turn prompts into <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-300">cinematic imagery</span> & motion
          </h1>
          <p className="text-sm md:text-base text-zinc-300 leading-relaxed">
            Create high-fidelity 8K images and 60fps video animations using state-of-the-art synthetic models. Select a studio or start with a community preset.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-4">
            <Button
              size="lg"
              variant="primary"
              onClick={() => navigate("/create/image")}
              leftIcon={<ImageIcon className="w-5 h-5" />}
            >
              Open Image Studio
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate("/create/video")}
              leftIcon={<VideoIcon className="w-5 h-5" />}
            >
              Open Video Studio
            </Button>
          </div>
        </div>

        {/* Ambient Decorative Shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Quick-Start Tools Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" /> Quick-Start Workspaces
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => navigate("/create/image")}
            className="group relative p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-violet-500/60 hover:bg-zinc-900 transition-all cursor-pointer space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-violet-950 text-violet-400 border border-violet-800/50 flex items-center justify-center">
                <ImageIcon className="w-6 h-6" />
              </div>
              <Badge variant="violet">4 Models Available</Badge>
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-violet-300 transition-colors">
              Image Generation Studio
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Generate photorealistic portraits, futuristic sci-fi concept art, architectural renders, and stylized illustrations.
            </p>
            <div className="pt-2 text-xs font-bold text-violet-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Launch Image Studio &rarr;
            </div>
          </div>

          <div
            onClick={() => navigate("/create/video")}
            className="group relative p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-rose-500/60 hover:bg-zinc-900 transition-all cursor-pointer space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-rose-950 text-rose-400 border border-rose-800/50 flex items-center justify-center">
                <VideoIcon className="w-6 h-6" />
              </div>
              <Badge variant="rose">Motion V2 Engine</Badge>
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-rose-300 transition-colors">
              Video & Motion Studio
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Animate still photos, synthesize fluid camera panning, orbital dolly zooms, and cinematic slow-motion video.
            </p>
            <div className="pt-2 text-xs font-bold text-rose-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Launch Video Studio &rarr;
            </div>
          </div>
        </div>
      </div>

      {/* Featured Preset Prompts Gallery */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-violet-400" /> Featured Community Presets
            </h2>
            <p className="text-xs text-zinc-400">Click any preset to instantly prefill generator controls</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PRESET_PROMPTS.map((preset) => (
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
                  <Badge variant={preset.type === "video" ? "rose" : "violet"} size="sm">
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

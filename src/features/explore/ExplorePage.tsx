import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Clapperboard,
  Image as ImageIcon,
  Video as VideoIcon,
  Store,
  Mic,
  TrendingUp,
  ArrowRight,
  Zap,
  Wand2,
  Play,
  Cpu,
  SlidersHorizontal,
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
  const [composerPrompt, setComposerPrompt] = useState("");
  const [selectedStudio, setSelectedStudio] = useState<"cinema" | "image" | "video" | "marketing" | "lipsync">("cinema");
  const [composerRatio, setComposerRatio] = useState("16:9");

  const recentProjects = projects.slice(0, 4);

  const categories = [
    "All",
    "Trending Reels",
    "Cinematic",
    "Sci-Fi",
    "Nature & Motion",
    "Automotive",
    "Commercial",
    "Architecture",
    "Fantasy",
  ];

  const filteredPresets = PRESET_PROMPTS.filter((preset) => {
    if (activeCategory === "All") return true;
    if (activeCategory === "Trending Reels") return preset.type === "cinema" || preset.type === "video";
    return preset.category === activeCategory;
  });

  const handleUsePreset = (preset: typeof PRESET_PROMPTS[0]) => {
    const route = preset.type === "cinema" ? "cinema" : preset.type === "video" ? "video" : "image";
    navigate(
      `/create/${route}?prompt=${encodeURIComponent(preset.prompt)}&model=${preset.model}&ratio=${preset.aspectRatio}`
    );
  };

  const handleComposerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerPrompt.trim()) {
      navigate(`/create/${selectedStudio}`);
      return;
    }
    navigate(
      `/create/${selectedStudio}?prompt=${encodeURIComponent(composerPrompt)}&ratio=${composerRatio}`
    );
  };

  const handleMagicEnhance = () => {
    if (!composerPrompt.trim()) return;
    setComposerPrompt(
      `${composerPrompt.trim()}, 8K ultra cinematic lighting, volumetric atmosphere, 35mm lens, depth of field f/2.8, hyperrealistic detail`
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-16">
      {/* Top Hero Banner — Higgsfield Cyber Emerald Theme */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-emerald-950/40 via-zinc-950 to-zinc-950 border border-emerald-800/40 p-8 md:p-14 text-center shadow-2xl space-y-6">
        {/* Glowing Orbs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-10 right-10 w-72 h-72 bg-teal-400/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 space-y-4 max-w-4xl mx-auto">
          {/* Release Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold tracking-wide uppercase shadow-lg shadow-emerald-950/60">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" /> HIGGSFIELD CINEMA v4.0 NOW LIVE
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1]">
            Generative Cinema &{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              Visual Intelligence
            </span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Synthesize 8K imagery, multi-axis camera motion choreography, automated commercial ad campaigns, and phoneme-perfect lip-sync avatars.
          </p>

          {/* Studio Quick Switcher Bar */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-2">
            {[
              { id: "cinema", label: "Cinema Studio", badge: "V4.0", icon: Clapperboard, color: "text-emerald-400" },
              { id: "image", label: "Image Studio", badge: "6 Models", icon: ImageIcon, color: "text-teal-400" },
              { id: "video", label: "Video Studio", badge: "V2 Motion", icon: VideoIcon, color: "text-emerald-300" },
              { id: "marketing", label: "Marketing Ads", badge: "Commercial", icon: Store, color: "text-green-400" },
              { id: "lipsync", label: "LipSync Avatar", badge: "4K Sync", icon: Mic, color: "text-cyan-400" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/create/${s.id}`)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-emerald-500/60 hover:bg-zinc-800/90 text-xs font-bold text-zinc-200 transition-all shadow-md group"
              >
                <s.icon className={`w-4 h-4 ${s.color} group-hover:scale-110 transition-transform`} />
                <span>{s.label}</span>
                <span className="text-[10px] text-zinc-400 font-mono font-normal bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                  {s.badge}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Signature Docked Floating Prompt Composer */}
        <div className="relative z-20 max-w-3xl mx-auto pt-4">
          <form
            onSubmit={handleComposerSubmit}
            className="p-3 md:p-4 rounded-3xl bg-zinc-950/95 border border-emerald-500/40 shadow-2xl backdrop-blur-xl space-y-3 glow-accent text-left"
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-extrabold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Wand2 className="w-4 h-4 text-emerald-400" /> Instant Generation Composer
              </span>
              <button
                type="button"
                onClick={handleMagicEnhance}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
              >
                <Zap className="w-3.5 h-3.5" /> Magic Prompt
              </button>
            </div>

            <textarea
              rows={2}
              value={composerPrompt}
              onChange={(e) => setComposerPrompt(e.target.value)}
              placeholder="Describe what you want to create... e.g. Cybernetic warrior in obsidian armor, 85mm portrait, volumetric smoke, dramatic cinematic lighting..."
              className="w-full bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-3.5 text-xs md:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/70 transition-all resize-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              {/* Studio & Ratio Controls */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={selectedStudio}
                  onChange={(e) => setSelectedStudio(e.target.value as any)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="cinema">Cinema Studio (Kling 3.0 / Veo 3.1)</option>
                  <option value="image">Image Studio (FLUX Realism)</option>
                  <option value="video">Video Studio (Motion-v1)</option>
                  <option value="marketing">Marketing Studio (Commercial Ad)</option>
                  <option value="lipsync">LipSync Studio (Dialogue)</option>
                </select>

                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
                  {["16:9", "9:16", "1:1"].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setComposerRatio(r)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold transition-all ${
                        composerRatio === r
                          ? "bg-emerald-600 text-white"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                size="md"
                variant="primary"
                type="submit"
                leftIcon={<Sparkles className="w-4 h-4" />}
                className="font-bold"
              >
                Launch Studio & Generate
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Featured Flagship Models Showcase Reel */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" /> Multi-Model Flagship Catalog
          </h2>
          <span className="text-xs text-zinc-400">15+ AI Diffusion Engines Integrated</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              name: "Kling 3.0 Cinema",
              badge: "Flagship 60fps",
              desc: "Multi-axis camera physics, spatio-temporal video synthesis",
              type: "cinema",
              id: "kling-3-cinema",
              color: "from-emerald-950/60 to-zinc-950",
              borderColor: "border-emerald-500/40",
            },
            {
              name: "Google Veo 3.1 Pro",
              badge: "Google Core",
              desc: "High-fidelity broadcast video with natural prompt adherence",
              type: "cinema",
              id: "google-veo-3",
              color: "from-teal-950/60 to-zinc-950",
              borderColor: "border-teal-500/40",
            },
            {
              name: "Flux Realism v2",
              badge: "8K Photoreal",
              desc: "Extreme portrait detail, accurate lighting, complex textures",
              type: "image",
              id: "flux-realism-v2",
              color: "from-cyan-950/60 to-zinc-950",
              borderColor: "border-cyan-500/40",
            },
            {
              name: "WAN 2.6 Camera Control",
              badge: "3D Lens Optics",
              desc: "Native focal length & aperture rendering with zero warp",
              type: "cinema",
              id: "wan-2-6-camera",
              color: "from-emerald-900/60 to-zinc-950",
              borderColor: "border-emerald-500/40",
            },
          ].map((m) => (
            <div
              key={m.id}
              onClick={() => navigate(`/create/${m.type}?model=${m.id}`)}
              className={`p-5 rounded-3xl bg-gradient-to-b ${m.color} border ${m.borderColor} hover:border-emerald-400 hover:shadow-xl transition-all cursor-pointer space-y-3 flex flex-col justify-between group`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="emerald" size="sm">
                    {m.badge}
                  </Badge>
                  <span className="text-[10px] font-mono text-zinc-400">ENGINE</span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {m.name}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{m.desc}</p>
              </div>

              <div className="pt-2 text-xs font-bold text-emerald-400 flex items-center justify-between">
                <span>Create with {m.name.split(" ")[0]}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Community Showcase Masonry Feed */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" /> Community Prompt Showcase
            </h2>
            <p className="text-xs text-zinc-400">Click any generation to 1-click remix prompts and camera settings</p>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 p-1.5 rounded-2xl overflow-x-auto">
            <SlidersHorizontal className="w-4 h-4 text-zinc-500 ml-2 mr-1 shrink-0" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeCategory === cat
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/60"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Masonry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPresets.map((preset) => (
            <div
              key={preset.id}
              onClick={() => handleUsePreset(preset)}
              className="group relative flex flex-col rounded-3xl bg-zinc-900/90 border border-zinc-800/90 overflow-hidden hover:border-emerald-500/60 hover:shadow-2xl transition-all cursor-pointer"
            >
              {/* Media Preview Box */}
              <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
                <img
                  src={preset.previewUrl}
                  alt={preset.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Overlays */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <Badge variant={preset.type === "cinema" ? "emerald" : preset.type === "video" ? "rose" : "zinc"} size="sm">
                    {preset.type.toUpperCase()}
                  </Badge>
                  <span className="text-[10px] font-mono font-bold text-zinc-300 bg-black/60 px-2 py-0.5 rounded-full border border-white/10">
                    {preset.aspectRatio}
                  </span>
                </div>

                {/* Play Button Hover Effect */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-emerald-600/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Card Meta Details */}
              <div className="p-5 flex flex-col justify-between flex-1 gap-3">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-base text-zinc-100 group-hover:text-emerald-300 transition-colors">
                    {preset.title}
                  </h4>
                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {preset.prompt}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60 text-xs font-bold">
                  <span className="text-zinc-500">Model: <span className="text-zinc-300">{preset.model}</span></span>
                  <span className="text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Remix Prompt <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Workspace Generations */}
      {recentProjects.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Your Recent Generations
            </h2>
            <Button size="sm" variant="ghost" onClick={() => navigate("/projects")}>
              View All Vault &rarr;
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

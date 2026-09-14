import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Store,
  Sparkles,
  Link as LinkIcon,
  Upload,
  LayoutGrid,
  ShoppingBag,
  Smartphone,
  Tv,
} from "lucide-react";
import { useProjectStore } from "../../store/project-store";
import { useCreditStore } from "../../store/credit-store";
import { QueuePanel } from "../../components/generation/QueuePanel";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { simulateGeneration } from "../../lib/generation-engine";

const AD_TEMPLATES = [
  {
    id: "ugc-review",
    title: "TikTok UGC Product Review",
    aspectRatio: "9:16",
    description: "Authentic customer testimonial talking-head with dynamic subtitle overlays",
    badge: "9:16 Viral",
  },
  {
    id: "unboxing-reveal",
    title: "Cinematic Unboxing Sequence",
    aspectRatio: "9:16",
    description: "High-speed macro lens unboxing shot with floating feature Callout text",
    badge: "High Conversion",
  },
  {
    id: "spotlight-360",
    title: "360° Luxury Product Spotlight",
    aspectRatio: "16:9",
    description: "Studio lighting slow-motion camera orbit with caustic liquid water reflections",
    badge: "16:9 Desktop",
  },
  {
    id: "founder-story",
    title: "Founder Story & Brand Vision",
    aspectRatio: "9:16",
    description: "Inspiring narrative storytelling combining factory craftsmanship with product beauty",
    badge: "Brand Affinity",
  },
];

export const MarketingStudioPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, activeProcessingId, createProject, updateProject } = useProjectStore();
  const { deductCredits } = useCreditStore();

  const [productUrl, setProductUrl] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("ugc-review");
  const [format, setFormat] = useState("9:16");
  const [brandTone, setBrandTone] = useState("Energetic & Modern");
  const [productImage, setProductImage] = useState<string | undefined>(undefined);

  const activeProject = activeProcessingId ? projects.find((p) => p.id === activeProcessingId) : undefined;
  const latestCompleted = projects.find((p) => p.type === "marketing" && p.status === "completed");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setProductImage(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = () => {
    deductCredits(25, "Marketing Ad Builder");

    const templateObj = AD_TEMPLATES.find((t) => t.id === selectedTemplate);

    const projectId = createProject({
      type: "marketing",
      prompt: `Commercial Ad Campaign: ${templateObj?.title || "Product Reveal"} (${brandTone} Tone)`,
      model: "google-veo-3",
      aspectRatio: format,
      duration: 10,
      quality: "high",
      initialImageUrl: productImage,
      productUrl,
      marketingFormat: format,
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
              <Store className="w-7 h-7 text-emerald-400" /> Marketing Studio
            </h1>
            <Badge variant="emerald">Automated Commercial Builder</Badge>
          </div>
          <p className="text-xs text-zinc-400 max-w-xl">
            Convert product links or packshots into high-converting video ads, TikTok UGC reviews, and multi-platform social campaigns.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Input Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: Product Ingestion */}
          <div className="space-y-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 p-5">
            <h3 className="text-xs font-bold text-zinc-200 flex items-center gap-2 uppercase tracking-wider">
              <ShoppingBag className="w-4 h-4 text-emerald-400" /> Step 1: Product Asset Ingestion
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-zinc-400" /> Product E-Commerce URL
              </label>
              <input
                type="url"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://yourstore.com/products/lux-headphones"
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/70"
              />
            </div>

            <div className="text-center text-xs text-zinc-500 font-semibold">— OR —</div>

            {/* Packshot Upload */}
            {productImage ? (
              <div className="relative aspect-video rounded-xl overflow-hidden border border-emerald-500/50 bg-zinc-950 flex items-center justify-center">
                <img src={productImage} alt="Product Packshot" className="h-full object-contain p-2" />
                <button
                  onClick={() => setProductImage(undefined)}
                  className="absolute top-2 right-2 text-xs text-rose-400 bg-black/70 px-2 py-1 rounded"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-3 p-4 border border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-xl bg-zinc-950/60 cursor-pointer transition-all">
                <Upload className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-semibold text-zinc-300">
                  Upload Product Image Packshot
                </span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* Step 2: Ad Template Selection */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-zinc-200 flex items-center gap-2 uppercase tracking-wider">
              <LayoutGrid className="w-4 h-4 text-emerald-400" /> Step 2: Select Ad Creative Template
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AD_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => {
                      setSelectedTemplate(tmpl.id);
                      setFormat(tmpl.aspectRatio);
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                      isSelected
                        ? "bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-950/50"
                        : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-sm ${isSelected ? "text-emerald-300" : "text-white"}`}>
                        {tmpl.title}
                      </span>
                      <Badge variant={isSelected ? "emerald" : "zinc"} size="sm">
                        {tmpl.badge}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{tmpl.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Platform Format & Brand Tone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Platform Output Format</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { ratio: "9:16", icon: Smartphone, label: "Reels/TikTok" },
                  { ratio: "16:9", icon: Tv, label: "YouTube" },
                  { ratio: "1:1", icon: LayoutGrid, label: "Instagram" },
                ].map((item) => (
                  <button
                    key={item.ratio}
                    type="button"
                    onClick={() => setFormat(item.ratio)}
                    className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      format === item.ratio
                        ? "bg-emerald-600 text-white border border-emerald-400/50"
                        : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.ratio}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Brand Tone & Voice</label>
              <select
                value={brandTone}
                onChange={(e) => setBrandTone(e.target.value)}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Energetic & Modern">Energetic & Modern (TikTok)</option>
                <option value="Luxury & Minimalist">Luxury & Minimalist</option>
                <option value="Informative & Technical">Informative & Technical</option>
                <option value="Urgent & Promotional">Urgent & Promotional (Sale)</option>
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            size="lg"
            variant="primary"
            fullWidth
            onClick={handleGenerate}
            disabled={!!activeProcessingId}
            leftIcon={<Sparkles className="w-5 h-5" />}
          >
            Build Commercial Ad Video • 25 Credits
          </Button>
        </div>

        {/* Right Output Panel */}
        <div className="lg:col-span-5 space-y-6">
          {activeProject && <QueuePanel project={activeProject} />}

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-zinc-300 flex items-center justify-between">
              <span>Marketing Campaign Preview</span>
              {latestCompleted && (
                <Badge variant="emerald" size="sm">
                  {latestCompleted.marketingFormat || "9:16"}
                </Badge>
              )}
            </h3>

            {latestCompleted ? (
              <div className="relative aspect-[9/16] max-h-[500px] mx-auto rounded-3xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl group">
                <img
                  src={latestCompleted.outputUrl}
                  alt={latestCompleted.title}
                  className="w-full h-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <Badge variant="emerald" size="sm">
                      AD READY • {latestCompleted.marketingFormat}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-sm text-white">{latestCompleted.title}</h4>
                    <Button
                      size="sm"
                      variant="primary"
                      fullWidth
                      onClick={() => navigate(`/projects/${latestCompleted.id}`)}
                    >
                      Inspect Ad Assets
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-square rounded-3xl border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center p-8 text-center bg-zinc-950/60 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-zinc-600 flex items-center justify-center">
                  <Store className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-zinc-300">No Marketing Video Built</p>
                  <p className="text-xs text-zinc-400 max-w-xs">
                    Select a template, add product details, and build your commercial video ad.
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

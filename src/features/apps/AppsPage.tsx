import React, { useState } from "react";
import {
  Grid,
  Shirt,
  Store,
  Zap,
  Clapperboard,
  UserCheck,
  Sparkles,
  ArrowRight,
  Upload,
  CheckCircle2,
} from "lucide-react";
import { CREATIVE_APPS, type CreativeApp, generateVisualDataUrl } from "../../lib/demo-assets";
import { useCreditStore } from "../../store/credit-store";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";

export const AppsPage: React.FC = () => {
  const { deductCredits } = useCreditStore();
  const [selectedApp, setSelectedApp] = useState<CreativeApp | null>(null);
  const [activeTab, setActiveTab] = useState<"All" | "Fashion" | "Branding" | "Storyboarding">("All");
  const [appOutput, setAppOutput] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredApps = CREATIVE_APPS.filter(
    (app) => activeTab === "All" || app.category === activeTab
  );

  const handleRunApp = () => {
    if (!selectedApp) return;
    deductCredits(selectedApp.creditCost, `Creative App: ${selectedApp.name}`);
    setIsProcessing(true);
    setAppOutput(null);

    setTimeout(() => {
      setIsProcessing(false);
      setAppOutput(generateVisualDataUrl(selectedApp.name, "image", "1:1", Math.floor(Math.random() * 5)));
    }, 2000);
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Shirt":
        return Shirt;
      case "Store":
        return Store;
      case "Zap":
        return Zap;
      case "Clapperboard":
        return Clapperboard;
      case "UserCheck":
        return UserCheck;
      default:
        return Sparkles;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <Grid className="w-7 h-7 text-violet-400" /> Creative AI Apps & Turnkey Engines
            </h1>
            <Badge variant="violet">5 Specialized Engines</Badge>
          </div>
          <p className="text-xs text-zinc-400 max-w-xl">
            One-click viral AI applications. Run virtual try-on, logo motion synthesis, script storyboarding, and digital double training.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 p-1.5 rounded-2xl">
          {(["All", "Fashion", "Branding", "Storyboarding"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === cat
                  ? "bg-violet-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Apps Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredApps.map((app) => {
          const IconComp = getIcon(app.iconName);
          return (
            <div
              key={app.id}
              onClick={() => setSelectedApp(app)}
              className="group relative p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 hover:border-violet-500/60 hover:shadow-2xl transition-all cursor-pointer space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-violet-950/80 text-violet-400 border border-violet-800/50 flex items-center justify-center">
                    <IconComp className="w-6 h-6" />
                  </div>
                  <Badge variant="violet" size="sm">
                    {app.badge}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white group-hover:text-violet-300 transition-colors">
                    {app.name}
                  </h3>
                  <p className="text-xs font-semibold text-violet-400">{app.tagline}</p>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">{app.description}</p>
              </div>

              <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs font-bold">
                <span className="text-amber-400 font-mono">{app.creditCost} Credits</span>
                <span className="text-violet-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Launch App <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* App Execution Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl rounded-3xl bg-zinc-950 border border-zinc-800 p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-950 text-violet-400 border border-violet-800/50 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedApp.name}</h3>
                  <p className="text-xs text-violet-400 font-semibold">{selectedApp.tagline}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedApp(null);
                  setAppOutput(null);
                }}
                className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Modal Input */}
            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-800 hover:border-violet-500/50 rounded-2xl bg-zinc-900/60 cursor-pointer transition-all space-y-2">
                <Upload className="w-6 h-6 text-violet-400" />
                <span className="text-xs font-semibold text-zinc-300">
                  Upload Input Asset for {selectedApp.name}
                </span>
                <span className="text-[11px] text-zinc-400">
                  Select image or logo to process
                </span>
                <input type="file" className="hidden" />
              </label>

              {appOutput && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Output Generated Successfully!
                  </div>
                  <div className="aspect-square rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800">
                    <img src={appOutput} alt="App Output" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </div>

            {/* Action */}
            <Button
              size="lg"
              variant="primary"
              fullWidth
              onClick={handleRunApp}
              disabled={isProcessing}
              leftIcon={<Sparkles className="w-5 h-5" />}
            >
              {isProcessing ? "Processing App Pipeline..." : `Run ${selectedApp.name} • ${selectedApp.creditCost} Credits`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

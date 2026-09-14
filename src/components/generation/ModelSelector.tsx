import React, { useState } from "react";
import { Cpu, Sparkles, ChevronDown } from "lucide-react";
import type { ModelInfo } from "../../lib/demo-assets";
import { Badge } from "../ui/Badge";

interface ModelSelectorProps {
  models: ModelInfo[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  label?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModelId,
  onSelectModel,
  label = "Select AI Generation Engine",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedModel = models.find((m) => m.id === selectedModelId) || models[0];

  return (
    <div className="relative space-y-1.5">
      <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Cpu className="w-4 h-4 text-violet-400" /> {label}
        </span>
        <span className="text-[11px] text-zinc-400 font-normal">
          {models.length} Models Available
        </span>
      </label>

      {/* Selected Model Card Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-violet-500/60 transition-all text-left group"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-violet-950/80 border border-violet-800/50 flex items-center justify-center text-violet-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="truncate space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white group-hover:text-violet-300 transition-colors">
                {selectedModel?.name}
              </span>
              <Badge variant="violet" size="sm">
                {selectedModel?.badge}
              </Badge>
            </div>
            <p className="text-xs text-zinc-400 truncate leading-tight">
              {selectedModel?.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-2">
          <div className="text-right text-[11px] hidden sm:block">
            <div className="font-mono text-amber-400 font-bold">
              {selectedModel?.creditCost} Credits
            </div>
            <div className="text-zinc-500">{selectedModel?.speed}</div>
          </div>
          <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-40 mt-1 rounded-2xl bg-zinc-950 border border-zinc-800 p-2 shadow-2xl space-y-1 max-h-72 overflow-y-auto animate-fadeIn">
          {models.map((m) => {
            const isSelected = m.id === selectedModelId;
            return (
              <div
                key={m.id}
                onClick={() => {
                  onSelectModel(m.id);
                  setIsOpen(false);
                }}
                className={`flex items-start justify-between p-3 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? "bg-violet-950/60 border border-violet-500/50"
                    : "hover:bg-zinc-900 border border-transparent"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${isSelected ? "text-violet-300" : "text-white"}`}>
                      {m.name}
                    </span>
                    <Badge variant={isSelected ? "violet" : "zinc"} size="sm">
                      {m.badge}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{m.description}</p>
                </div>

                <div className="text-right text-[11px] shrink-0 ml-3">
                  <span className="font-mono font-bold text-amber-400">{m.creditCost} Credits</span>
                  <div className="text-zinc-500">{m.speed}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

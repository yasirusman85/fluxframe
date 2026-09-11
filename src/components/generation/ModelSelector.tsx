import React from "react";
import type { ModelInfo } from "../../lib/demo-assets";
import { Badge } from "../ui/Badge";
import { cn } from "../../lib/cn";
import { Check } from "lucide-react";

export interface ModelSelectorProps {
  models: ModelInfo[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModelId,
  onSelectModel,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {models.map((m) => {
        const isSelected = m.id === selectedModelId;
        return (
          <div
            key={m.id}
            onClick={() => onSelectModel(m.id)}
            className={cn(
              "flex flex-col justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200",
              isSelected
                ? "bg-violet-950/40 border-violet-500/80 shadow-md shadow-violet-950/40 glow-border"
                : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col">
                <span className="font-bold text-sm text-zinc-100 flex items-center gap-1.5">
                  {m.name}
                  {isSelected && <Check className="w-3.5 h-3.5 text-violet-400" />}
                </span>
                <span className="text-[11px] text-zinc-400 leading-tight mt-0.5 line-clamp-2">
                  {m.description}
                </span>
              </div>
              <Badge variant={isSelected ? "violet" : "zinc"} size="sm">
                {m.badge}
              </Badge>
            </div>

            <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-medium">
              <span>Speed: {m.speed}</span>
              <span>{m.qualityRating}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

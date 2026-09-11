import React from "react";
import { cn } from "../../lib/cn";

export interface RatioSelectorProps {
  selectedRatio: string;
  onSelectRatio: (ratio: string) => void;
}

const RATIOS = [
  { id: "16:9", label: "16:9", desc: "Landscape", iconClass: "w-6 h-3.5" },
  { id: "1:1", label: "1:1", desc: "Square", iconClass: "w-4 h-4" },
  { id: "9:16", label: "9:16", desc: "Portrait / Reel", iconClass: "w-3.5 h-6" },
  { id: "4:3", label: "4:3", desc: "Standard", iconClass: "w-5 h-4" },
  { id: "21:9", label: "21:9", desc: "Ultrawide", iconClass: "w-7 h-3" },
];

export const RatioSelector: React.FC<RatioSelectorProps> = ({
  selectedRatio,
  onSelectRatio,
}) => {
  return (
    <div className="grid grid-cols-5 gap-2">
      {RATIOS.map((r) => {
        const isSelected = r.id === selectedRatio;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelectRatio(r.id)}
            className={cn(
              "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-200",
              isSelected
                ? "bg-violet-950/60 border-violet-500 text-violet-300 shadow-md shadow-violet-950/40"
                : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
            )}
          >
            <div className="h-7 flex items-center justify-center">
              <div
                className={cn(
                  "rounded-xs border-2 transition-colors",
                  r.iconClass,
                  isSelected ? "border-violet-400 bg-violet-500/20" : "border-zinc-600 bg-zinc-800/40"
                )}
              />
            </div>
            <span className="text-xs font-bold mt-1">{r.label}</span>
            <span className="text-[9px] text-zinc-500 hidden sm:inline">{r.desc}</span>
          </button>
        );
      })}
    </div>
  );
};

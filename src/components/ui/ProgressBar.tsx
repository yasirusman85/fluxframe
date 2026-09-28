import React from "react";
import { cn } from "../../lib/cn";

export interface ProgressBarProps {
  value: number;
  indeterminate?: boolean;
  size?: "sm" | "md";
  label?: string;
  tone?: "brand" | "amber" | "rose";
  className?: string;
}

const TONES = { brand: "from-brand-500 to-cyan-400", amber: "from-amber-500 to-orange-400", rose: "from-rose-500 to-pink-400" };

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, indeterminate, size = "md", label, tone = "brand", className }) => (
  <div
    role="progressbar"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={indeterminate ? undefined : Math.round(value)}
    className={cn("w-full overflow-hidden rounded-full bg-zinc-900 border border-zinc-800", size === "sm" ? "h-1.5" : "h-2.5", className)}
  >
    <div
      className={cn("h-full rounded-full bg-gradient-to-r transition-[width] duration-300", TONES[tone], indeterminate && "w-1/3 animate-[shimmer_1.2s_linear_infinite]")}
      style={indeterminate ? undefined : { width: `${Math.max(0, Math.min(100, value))}%` }}
    />
  </div>
);

import React from "react";
import { cn } from "../../lib/cn";

export type BadgeVariant = "brand" | "neutral" | "amber" | "rose" | "sky" | "violet" | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
}

const VARIANTS: Record<BadgeVariant, string> = {
  brand: "bg-brand-500/15 text-brand-300 border-brand-500/30",
  neutral: "bg-zinc-800/80 text-zinc-300 border-zinc-700/60",
  amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  rose: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  sky: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  violet: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  outline: "bg-transparent text-zinc-400 border-zinc-700",
};

export const Badge: React.FC<BadgeProps> = ({ children, className, variant = "brand", size = "md", dot = false, ...props }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full border font-semibold whitespace-nowrap",
      size === "sm" ? "px-2 py-0.5 text-[10px] tracking-wide" : "px-2.5 py-1 text-xs",
      VARIANTS[variant],
      className,
    )}
    {...props}
  >
    {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden />}
    {children}
  </span>
);

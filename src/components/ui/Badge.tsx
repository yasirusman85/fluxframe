import React from "react";
import { cn } from "../../lib/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "violet" | "emerald" | "amber" | "rose" | "zinc" | "blue";
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = "violet",
  size = "md",
  ...props
}) => {
  const base = "inline-flex items-center gap-1 font-semibold rounded-full border transition-colors";

  const variants = {
    violet: "bg-violet-950/60 text-violet-300 border-violet-800/50",
    emerald: "bg-emerald-950/60 text-emerald-300 border-emerald-800/50",
    amber: "bg-amber-950/60 text-amber-300 border-amber-800/50",
    rose: "bg-rose-950/60 text-rose-300 border-rose-800/50",
    zinc: "bg-zinc-800/80 text-zinc-300 border-zinc-700/60",
    blue: "bg-sky-950/60 text-sky-300 border-sky-800/50",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
  };

  return (
    <span className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
};

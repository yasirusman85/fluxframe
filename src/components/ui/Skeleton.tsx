import React from "react";
import { cn } from "../../lib/cn";

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn("skeleton rounded-xl", className)} aria-hidden {...props} />
);

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ lines = 3, className }) => (
  <div className={cn("space-y-2", className)} aria-hidden>
    {Array.from({ length: lines }, (_, i) => (
      <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
    ))}
  </div>
);

export const Spinner: React.FC<{ size?: "sm" | "md" | "lg"; className?: string }> = ({ size = "md", className }) => {
  const dimension = size === "sm" ? "w-4 h-4 border-2" : size === "lg" ? "w-10 h-10 border-[3px]" : "w-6 h-6 border-2";
  return <span role="status" aria-label="Loading" className={cn("inline-block rounded-full border-zinc-700 border-t-brand-400 animate-spin", dimension, className)} />;
};

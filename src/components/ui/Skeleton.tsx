import React from "react";
import { cn } from "../../lib/cn";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-zinc-800/60", className)}
      {...props}
    />
  );
};

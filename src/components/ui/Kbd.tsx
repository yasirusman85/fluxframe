import React from "react";
import { cn } from "../../lib/cn";

export const Kbd: React.FC<React.HTMLAttributes<HTMLElement>> = ({ className, children, ...props }) => (
  <kbd className={cn("inline-flex items-center gap-0.5 rounded-md border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-400", className)} {...props}>
    {children}
  </kbd>
);

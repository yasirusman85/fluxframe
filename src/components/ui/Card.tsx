import React from "react";
import { cn } from "../../lib/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
}

const PADDING = { none: "", sm: "p-3", md: "p-5", lg: "p-6 md:p-8" };

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, padding = "md", interactive = false, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl bg-surface-1 border border-zinc-800/80 shadow-panel",
      interactive && "transition-colors hover:border-zinc-700 cursor-pointer",
      PADDING[padding],
      className,
    )}
    {...props}
  >
    {children}
  </div>
));
Card.displayName = "Card";

export const SectionTitle: React.FC<{ icon?: React.ReactNode; children: React.ReactNode; hint?: React.ReactNode; className?: string }> = ({ icon, children, hint, className }) => (
  <div className={cn("flex items-center justify-between gap-3", className)}>
    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
      {icon && <span className="text-brand-400 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>}
      {children}
    </h3>
    {hint && <span className="text-[11px] text-zinc-400">{hint}</span>}
  </div>
);

import React from "react";
import { cn } from "../../lib/cn";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  testId?: string;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className, testId, compact }) => (
  <div data-testid={testId} className={cn("flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-zinc-800 bg-surface-1/60", compact ? "p-6 gap-2" : "p-10 gap-3", className)}>
    {icon && <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-zinc-800 flex items-center justify-center text-zinc-400 [&>svg]:w-6 [&>svg]:h-6">{icon}</div>}
    <div className="space-y-1">
      <h3 className="text-sm font-bold text-zinc-200">{title}</h3>
      {description && <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">{description}</p>}
    </div>
    {action && <div className="pt-1">{action}</div>}
  </div>
);

import React from "react";
import { cn } from "../../lib/cn";

export interface PageHeaderProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  badge?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ icon, title, badge, description, actions, className }) => (
  <div className={cn("flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-zinc-800/80", className)}>
    <div className="space-y-1 min-w-0">
      <div className="flex items-center gap-2.5 flex-wrap">
        {icon && <span className="text-brand-400 [&>svg]:w-6 [&>svg]:h-6">{icon}</span>}
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white">{title}</h1>
        {badge}
      </div>
      {description && <p className="text-sm text-zinc-400 max-w-2xl">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </div>
);

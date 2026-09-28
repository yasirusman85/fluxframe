import React, { useRef } from "react";
import { cn } from "../../lib/cn";

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  size?: "sm" | "md";
  className?: string;
  /** data-testid becomes `${testIdPrefix}-${tab.id}` */
  testIdPrefix?: string;
  fullWidth?: boolean;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, value, onChange, ariaLabel, size = "md", className, testIdPrefix, fullWidth }) => {
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const enabled = tabs.filter((t) => !t.disabled);
    const index = enabled.findIndex((t) => t.id === value);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % enabled.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + enabled.length) % enabled.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = enabled.length - 1;
    else return;
    event.preventDefault();
    const target = enabled[next];
    onChange(target.id);
    listRef.current?.querySelector<HTMLElement>(`[data-tab-id="${target.id}"]`)?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn("inline-flex items-center gap-1 p-1 rounded-xl bg-surface-2 border border-zinc-800 overflow-x-auto max-w-full", fullWidth && "flex w-full", className)}
    >
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            data-tab-id={tab.id}
            data-testid={testIdPrefix ? `${testIdPrefix}-${tab.id}` : undefined}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors disabled:opacity-40",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
              fullWidth && "flex-1 justify-center",
              selected ? "bg-brand-500 text-zinc-950 shadow" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70",
            )}
          >
            {tab.icon && <span className="[&>svg]:w-4 [&>svg]:h-4">{tab.icon}</span>}
            {tab.label}
            {tab.badge !== undefined && (
              <span className={cn("rounded-full px-1.5 text-[10px] font-bold", selected ? "bg-zinc-950/20 text-zinc-950" : "bg-zinc-800 text-zinc-400")}>{tab.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

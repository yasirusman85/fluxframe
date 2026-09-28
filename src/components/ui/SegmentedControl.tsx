import React from "react";
import { cn } from "../../lib/cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  testId?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  columns?: number;
  size?: "sm" | "md";
  className?: string;
}

/** Grid of mutually exclusive choices (ratios, durations, quality…). */
export function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel, columns, size = "md", className }: SegmentedControlProps<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn("grid gap-1.5", className)} style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            disabled={option.disabled}
            data-testid={option.testId}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 rounded-xl border text-center transition-all disabled:opacity-40",
              size === "sm" ? "px-2 py-1.5 text-xs" : "px-2.5 py-2 text-sm",
              selected ? "bg-brand-500/15 border-brand-500/60 text-brand-200 shadow-[inset_0_0_0_1px_rgb(16_185_129/0.2)]" : "bg-surface-2 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
            )}
          >
            {option.icon && <span className={cn("[&>svg]:w-4 [&>svg]:h-4", selected ? "text-brand-300" : "text-zinc-400")}>{option.icon}</span>}
            <span className="font-semibold leading-tight">{option.label}</span>
            {option.description && <span className="text-[10px] text-zinc-400 leading-tight hidden sm:block">{option.description}</span>}
          </button>
        );
      })}
    </div>
  );
}

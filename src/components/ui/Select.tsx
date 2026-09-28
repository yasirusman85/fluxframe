import React, { useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  label?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  hint?: React.ReactNode;
  disabled?: boolean;
  size?: "sm" | "md";
  testId?: string;
  className?: string;
  ariaLabel?: string;
}

export const Select: React.FC<SelectProps> = ({ label, value, onChange, options, hint, disabled, size = "md", testId, className, ariaLabel }) => {
  const id = useId();
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-zinc-300">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={disabled}
          aria-label={ariaLabel}
          data-testid={testId}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full appearance-none rounded-xl bg-surface-2 border border-zinc-800 text-zinc-100 pr-9 focus:border-brand-500/70 focus:outline-none transition-colors disabled:opacity-50",
            size === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-2.5 text-sm",
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" aria-hidden />
      </div>
      {hint && <p className="text-[11px] text-zinc-400">{hint}</p>}
    </div>
  );
};

import React, { useId } from "react";
import { cn } from "../../lib/cn";

export interface SliderProps {
  label: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  hint?: React.ReactNode;
  disabled?: boolean;
  testId?: string;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({ label, value, min, max, step = 1, onChange, formatValue, hint, disabled, testId, className }) => {
  const id = useId();
  const progress = ((value - min) / (max - min)) * 100;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <label htmlFor={id} className="font-semibold text-zinc-300">
          {label}
        </label>
        <span className="font-mono text-brand-300 font-semibold tabular-nums">{formatValue ? formatValue(value) : value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        data-testid={testId}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ "--range-progress": `${progress}%` } as React.CSSProperties}
        className="w-full disabled:opacity-40"
      />
      {hint && <p className="text-[11px] text-zinc-400">{hint}</p>}
    </div>
  );
};

import React, { useId } from "react";
import { cn } from "../../lib/cn";

interface FieldChromeProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  trailing?: React.ReactNode;
}

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">, FieldChromeProps {
  leftIcon?: React.ReactNode;
  testId?: string;
  inputSize?: "sm" | "md";
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, hint, error, trailing, leftIcon, testId, inputSize = "md", className, id: idProp, ...props }, ref) => {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <div className="space-y-1.5">
      {(label || trailing) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <label htmlFor={id} className="text-xs font-semibold text-zinc-300">
              {label}
            </label>
          )}
          {trailing}
        </div>
      )}
      <div className="relative">
        {leftIcon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 [&>svg]:w-4 [&>svg]:h-4 pointer-events-none">{leftIcon}</span>}
        <input
          ref={ref}
          id={id}
          data-testid={testId}
          aria-invalid={error ? true : undefined}
          className={cn(
            "w-full rounded-xl bg-surface-2 border text-zinc-100 placeholder-zinc-400 focus:outline-none transition-colors disabled:opacity-50",
            inputSize === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-2.5 text-sm",
            leftIcon && "pl-9",
            error ? "border-rose-500/60 focus:border-rose-400" : "border-zinc-800 focus:border-brand-500/70",
            className,
          )}
          {...props}
        />
      </div>
      {error ? <p className="text-[11px] text-rose-400">{error}</p> : hint ? <p className="text-[11px] text-zinc-400">{hint}</p> : null}
    </div>
  );
});
Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, FieldChromeProps {
  testId?: string;
  showCount?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, hint, error, trailing, testId, showCount, className, id: idProp, maxLength, value, ...props }, ref) => {
  const generated = useId();
  const id = idProp ?? generated;
  const length = typeof value === "string" ? value.length : 0;
  return (
    <div className="space-y-1.5">
      {(label || trailing) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <label htmlFor={id} className="text-xs font-semibold text-zinc-300">
              {label}
            </label>
          )}
          {trailing}
        </div>
      )}
      <div className="relative">
        <textarea
          ref={ref}
          id={id}
          data-testid={testId}
          maxLength={maxLength}
          value={value}
          aria-invalid={error ? true : undefined}
          className={cn(
            "w-full rounded-xl bg-surface-2 border text-sm text-zinc-100 placeholder-zinc-400 px-3.5 py-3 focus:outline-none transition-colors resize-none disabled:opacity-50 leading-relaxed",
            error ? "border-rose-500/60 focus:border-rose-400" : "border-zinc-800 focus:border-brand-500/70",
            showCount && "pb-6",
            className,
          )}
          {...props}
        />
        {showCount && maxLength && (
          <span className="absolute bottom-2 right-3 text-[10px] font-mono text-zinc-400 tabular-nums" aria-hidden>
            {length}/{maxLength}
          </span>
        )}
      </div>
      {error ? <p className="text-[11px] text-rose-400">{error}</p> : hint ? <p className="text-[11px] text-zinc-400">{hint}</p> : null}
    </div>
  );
});
Textarea.displayName = "Textarea";

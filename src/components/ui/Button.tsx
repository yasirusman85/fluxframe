import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand-500 text-zinc-950 hover:bg-brand-400 border border-brand-400/40 shadow-[0_8px_24px_-10px_rgb(16_185_129/0.7)] font-semibold",
  secondary: "bg-zinc-800/90 text-zinc-100 hover:bg-zinc-700/90 border border-zinc-700/70",
  ghost: "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 border border-transparent",
  danger: "bg-rose-600/90 text-white hover:bg-rose-500 border border-rose-500/40",
  outline: "border border-zinc-700 text-zinc-200 hover:bg-zinc-800/60 hover:border-zinc-600",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2.5 rounded-xl",
  icon: "h-9 w-9 p-0 rounded-lg",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, variant = "primary", size = "md", isLoading = false, fullWidth = false, leftIcon, rightIcon, disabled, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150 select-none whitespace-nowrap",
        "disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  ),
);
Button.displayName = "Button";

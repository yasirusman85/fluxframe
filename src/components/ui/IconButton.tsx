import React from "react";
import { cn } from "../../lib/cn";

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Accessible name; also used as tooltip. */
  label: string;
  icon: React.ReactNode;
  size?: "sm" | "md";
  variant?: "ghost" | "secondary" | "primary" | "danger";
  active?: boolean;
}

const VARIANTS = {
  ghost: "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70",
  secondary: "bg-zinc-800/80 text-zinc-200 hover:bg-zinc-700 border border-zinc-700/70",
  primary: "bg-brand-500 text-zinc-950 hover:bg-brand-400",
  danger: "text-rose-400 hover:text-rose-200 hover:bg-rose-950/50",
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, icon, size = "md", variant = "ghost", active = false, className, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none",
        size === "sm" ? "h-8 w-8" : "h-9 w-9",
        VARIANTS[variant],
        active && "bg-brand-500/15 text-brand-300",
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  ),
);
IconButton.displayName = "IconButton";

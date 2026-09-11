import React from "react";
import { cn } from "../../lib/cn";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:opacity-50 disabled:pointer-events-none rounded-xl select-none active:scale-[0.98]";

    const variants = {
      primary:
        "bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-950/50 border border-violet-500/40 glow-accent",
      secondary:
        "bg-zinc-800/80 text-zinc-100 hover:bg-zinc-700/80 border border-zinc-700/60",
      ghost:
        "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50",
      danger:
        "bg-red-600/90 text-white hover:bg-red-500 border border-red-500/30",
      outline:
        "border border-zinc-800 text-zinc-300 hover:bg-zinc-800/60 hover:text-white",
    };

    const sizes = {
      sm: "text-xs px-3 py-1.5 gap-1.5 h-8",
      md: "text-sm px-4 py-2 gap-2 h-10",
      lg: "text-base px-6 py-3 gap-2.5 h-12 rounded-2xl",
      icon: "h-9 w-9 p-0 rounded-xl",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";

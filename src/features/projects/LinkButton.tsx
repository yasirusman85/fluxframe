import React from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/cn";

type LinkButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type LinkButtonSize = "sm" | "md";

const VARIANTS: Record<LinkButtonVariant, string> = {
  primary: "bg-brand-500 text-zinc-950 hover:bg-brand-400 border border-brand-400/40 font-semibold shadow-[0_8px_24px_-10px_rgb(16_185_129/0.7)]",
  secondary: "bg-zinc-800/90 text-zinc-100 hover:bg-zinc-700/90 border border-zinc-700/70",
  outline: "border border-zinc-700 text-zinc-200 hover:bg-zinc-800/60 hover:border-zinc-600",
  ghost: "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 border border-transparent",
};

const SIZES: Record<LinkButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
};

export interface LinkButtonProps {
  to: string;
  variant?: LinkButtonVariant;
  size?: LinkButtonSize;
  leftIcon?: React.ReactNode;
  className?: string;
  testId?: string;
  children: React.ReactNode;
}

/** A react-router `Link` that looks like the kit's `Button` (real navigation, no nested interactive elements). */
export const LinkButton: React.FC<LinkButtonProps> = ({ to, variant = "secondary", size = "md", leftIcon, className, testId, children }) => (
  <Link
    to={to}
    data-testid={testId}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors select-none [&>svg]:h-4 [&>svg]:w-4",
      VARIANTS[variant],
      SIZES[size],
      className,
    )}
  >
    {leftIcon}
    {children}
  </Link>
);

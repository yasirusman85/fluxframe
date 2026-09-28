import React from "react";
import { initialsOf } from "../../store/account-store";
import { cn } from "../../lib/cn";

const SIZES = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-xs",
  lg: "h-14 w-14 text-base",
};

function avatarGradient(hue: number): string {
  const h = ((hue % 360) + 360) % 360;
  return `linear-gradient(135deg, hsl(${h} 72% 44%) 0%, hsl(${(h + 48) % 360} 82% 58%) 100%)`;
}

export interface AvatarProps {
  name: string;
  /** 0..360 — drives the gradient so the avatar is stable per user. */
  hue: number;
  size?: keyof typeof SIZES;
  className?: string;
}

/** Initials avatar. Decorative: parents provide the accessible name. */
export const Avatar: React.FC<AvatarProps> = ({ name, hue, size = "md", className }) => (
  <span
    aria-hidden
    className={cn("inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white shadow-inner ring-1 ring-white/10", SIZES[size], className)}
    style={{ background: avatarGradient(hue) }}
  >
    {initialsOf(name)}
  </span>
);

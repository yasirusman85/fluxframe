import { initialsOf } from "../../store/account-store";
import { cn } from "../../lib/cn";

export interface AccountAvatarProps {
  name: string;
  /** 0..360 */
  hue: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  sm: "h-8 w-8 rounded-lg text-xs",
  md: "h-12 w-12 rounded-xl text-sm",
  lg: "h-16 w-16 rounded-2xl text-lg",
  xl: "h-20 w-20 rounded-2xl text-2xl",
};

export function AccountAvatar({ name, hue, size = "md", className }: AccountAvatarProps) {
  const start = ((hue % 360) + 360) % 360;
  const end = (start + 48) % 360;
  return (
    <span
      role="img"
      aria-label={`Avatar for ${name || "Higgsfield user"}`}
      style={{ background: `linear-gradient(135deg, hsl(${start} 72% 46%), hsl(${end} 70% 30%))`, textShadow: "0 1px 2px rgb(0 0 0 / 0.5)" }}
      className={cn("inline-flex shrink-0 select-none items-center justify-center font-extrabold text-white shadow-lg ring-1 ring-white/10", SIZES[size], className)}
    >
      {initialsOf(name)}
    </span>
  );
}

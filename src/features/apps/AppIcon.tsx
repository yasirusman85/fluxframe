import { Clapperboard, Shirt, Store, UserSquare, Zap } from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { CreativeApp } from "../../lib/catalog";

const ICONS = { Shirt, Store, Zap, Clapperboard, UserSquare } as const;

export interface AppIconProps extends LucideProps {
  name: CreativeApp["icon"];
}

/** Maps a catalog icon key to its lucide glyph. Decorative by default. */
export function AppIcon({ name, ...props }: AppIconProps) {
  const Icon = ICONS[name];
  return <Icon aria-hidden {...props} />;
}

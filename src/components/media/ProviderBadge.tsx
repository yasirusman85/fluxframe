import type { ComponentType, SVGProps } from "react";
import { Clapperboard, Globe, Megaphone, Mic, Shapes } from "lucide-react";
import type { ProviderSource } from "../../types/project";
import { useAccountStore } from "../../store/account-store";
import { Badge } from "../ui";
import type { BadgeVariant } from "../ui";

export interface ProviderBadgeProps {
  source?: ProviderSource;
  /** Tooltip text (e.g. why the procedural fallback was used). */
  detail?: string;
  size?: "sm" | "md";
}

interface ProviderMeta {
  label: string;
  variant: BadgeVariant;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  description: string;
}

const PROVIDERS: Record<ProviderSource, ProviderMeta> = {
  pollinations: { label: "Pollinations", variant: "brand", icon: Globe, description: "Real AI image from the public Pollinations endpoint" },
  procedural: { label: "Procedural fallback", variant: "amber", icon: Shapes, description: "Deterministic in-browser fallback used because the image endpoint was unavailable" },
  "motion-engine": { label: "Motion engine", variant: "sky", icon: Clapperboard, description: "Rendered in your browser by the FluxFrame motion engine" },
  "lipsync-engine": { label: "LipSync engine", variant: "sky", icon: Mic, description: "Rendered in your browser by the FluxFrame LipSync engine" },
  "ad-engine": { label: "Ad engine", variant: "sky", icon: Megaphone, description: "Rendered in your browser by the FluxFrame ad engine" },
};

/** Transparent "what actually produced this" chip. Hidden when the account preference turns provider badges off. */
export function ProviderBadge({ source, detail, size = "md" }: ProviderBadgeProps) {
  const showProviderBadges = useAccountStore((s) => s.preferences.showProviderBadges);
  if (!source || !showProviderBadges) return null;
  const meta = PROVIDERS[source];
  const Icon = meta.icon;
  return (
    <Badge variant={meta.variant} size={size} title={detail ?? meta.description} data-testid="provider-badge" data-provider={source}>
      <Icon className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} aria-hidden />
      {meta.label}
    </Badge>
  );
}

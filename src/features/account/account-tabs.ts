import { SUBSCRIPTION_TIERS } from "../../lib/catalog";

export const ACCOUNT_TABS = ["profile", "plans", "history", "api", "preferences", "storage"] as const;
export type AccountTab = (typeof ACCOUNT_TABS)[number];

export function isAccountTab(value: string | null | undefined): value is AccountTab {
  return typeof value === "string" && (ACCOUNT_TABS as readonly string[]).includes(value);
}

export function planName(planId: string): string {
  return SUBSCRIPTION_TIERS.find((tier) => tier.id === planId)?.name ?? "Free";
}

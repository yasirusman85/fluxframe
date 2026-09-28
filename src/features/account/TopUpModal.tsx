import { Link } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { Coins } from "lucide-react";
import { SUBSCRIPTION_TIERS } from "../../lib/catalog";
import type { SubscriptionTier } from "../../lib/catalog";
import { DEMO_REFILL_AMOUNT, useCreditStore } from "../../store/credit-store";
import { useUIStore } from "../../store/ui-store";
import { cn } from "../../lib/cn";
import { Badge, Button, Modal } from "../../components/ui";

/**
 * Global top-up dialog driven by `useCreditStore.topUpOpen`. Mount it once in
 * the app shell; `useGeneration` opens it when a run cannot be afforded.
 */
export function TopUpModal() {
  const { open, balance, planId, closeTopUp, grant, setPlan } = useCreditStore(
    useShallow((s) => ({ open: s.topUpOpen, balance: s.balance, planId: s.planId, closeTopUp: s.closeTopUp, grant: s.grant, setPlan: s.setPlan })),
  );
  const addToast = useUIStore((s) => s.addToast);

  const refill = () => {
    grant(DEMO_REFILL_AMOUNT, "Demo refill");
    addToast(`${DEMO_REFILL_AMOUNT} demo credits added.`, { type: "success" });
    closeTopUp();
  };

  const choose = (tier: SubscriptionTier) => {
    setPlan(tier.id);
    grant(tier.creditsMonthly, `Plan · ${tier.name}`);
    addToast(`${tier.creditsMonthly.toLocaleString()} credits added to your balance.`, { type: "success", title: `${tier.name} plan activated` });
    closeTopUp();
  };

  return (
    <Modal
      open={open}
      onClose={closeTopUp}
      testId="topup-modal"
      size="md"
      title="Top up credits"
      description="Billing is simulated. Credits are granted locally and nothing is charged."
      footer={
        <>
          <Link to="/account?tab=plans" onClick={closeTopUp} className="mr-auto text-xs font-semibold text-brand-300 hover:text-brand-200">
            Compare plans
          </Link>
          <Button variant="ghost" onClick={closeTopUp}>
            Close
          </Button>
          <Button data-testid="topup-refill" leftIcon={<Coins className="h-4 w-4" />} onClick={refill}>
            Demo refill +{DEMO_REFILL_AMOUNT}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-surface-2/60 px-4 py-3">
          <span className="text-sm text-zinc-300">Current balance</span>
          <span className="font-mono text-lg font-bold text-amber-300 tabular-nums">{balance.toLocaleString()}</span>
        </div>
        <ul role="list" className="space-y-2">
          {SUBSCRIPTION_TIERS.map((tier) => {
            const current = tier.id === planId;
            return (
              <li key={tier.id} className={cn("flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5", current ? "border-brand-500/50 bg-brand-500/5" : "border-zinc-800")}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-100">{tier.name}</span>
                    {current ? <Badge size="sm">Current</Badge> : tier.badge ? <Badge variant="amber" size="sm">{tier.badge}</Badge> : null}
                  </div>
                  <p className="text-xs text-zinc-400">
                    {tier.price} {tier.billingPeriod} · {tier.creditsMonthly.toLocaleString()} credits / month
                  </p>
                </div>
                <Button data-testid={`plan-select-${tier.id}`} size="sm" variant={current ? "secondary" : "outline"} disabled={current} onClick={() => choose(tier)}>
                  {current ? "Active" : "Choose"}
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
}

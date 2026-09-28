import { useShallow } from "zustand/react/shallow";
import { Check, Coins, Info } from "lucide-react";
import { SUBSCRIPTION_TIERS } from "../../lib/catalog";
import type { SubscriptionTier } from "../../lib/catalog";
import { DEMO_REFILL_AMOUNT, useCreditStore } from "../../store/credit-store";
import { useUIStore } from "../../store/ui-store";
import { cn } from "../../lib/cn";
import { Badge, Button, Card } from "../../components/ui";

export function PlansTab() {
  const { planId, balance, setPlan, grant } = useCreditStore(useShallow((s) => ({ planId: s.planId, balance: s.balance, setPlan: s.setPlan, grant: s.grant })));
  const addToast = useUIStore((s) => s.addToast);

  const choose = (tier: SubscriptionTier) => {
    setPlan(tier.id);
    grant(tier.creditsMonthly, `Plan · ${tier.name}`);
    addToast(`${tier.creditsMonthly.toLocaleString()} credits added to your balance.`, { type: "success", title: `${tier.name} plan activated` });
  };

  const refill = () => {
    grant(DEMO_REFILL_AMOUNT, "Demo refill");
    addToast(`${DEMO_REFILL_AMOUNT} demo credits added.`, { type: "success" });
  };

  return (
    <div className="space-y-6">
      <p className="flex items-start gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-xs leading-relaxed text-sky-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        Billing is simulated locally. Choosing a plan grants its monthly credits instantly; no payment is taken and nothing leaves your browser.
      </p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {SUBSCRIPTION_TIERS.map((tier) => {
          const current = tier.id === planId;
          return (
            <Card
              key={tier.id}
              data-testid={`plan-card-${tier.id}`}
              data-current={current || undefined}
              className={cn("flex flex-col gap-4", current && "border-brand-500/60 ring-1 ring-brand-500/30", !current && tier.isPopular && "border-zinc-700")}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-white">{tier.name}</h3>
                  <p className="text-xs text-zinc-400">{tier.creditsMonthly.toLocaleString()} credits / month</p>
                </div>
                {current ? (
                  <Badge size="sm">Current plan</Badge>
                ) : tier.badge ? (
                  <Badge variant="amber" size="sm">
                    {tier.badge}
                  </Badge>
                ) : null}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold tracking-tight text-white">{tier.price}</span>
                <span className="text-xs text-zinc-400">{tier.billingPeriod}</span>
              </div>
              <ul className="flex-1 space-y-1.5 text-xs text-zinc-300">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                data-testid={`plan-select-${tier.id}`}
                variant={current ? "secondary" : tier.isPopular ? "primary" : "outline"}
                disabled={current}
                fullWidth
                onClick={() => choose(tier)}
              >
                {current ? "Current plan" : `Choose ${tier.name}`}
              </Button>
            </Card>
          );
        })}
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white">Demo credits</h3>
          <p className="text-xs text-zinc-400">
            Balance <span className="font-mono font-semibold text-amber-300">{balance.toLocaleString()}</span>. Top up any time; this is a local sandbox.
          </p>
        </div>
        <Button data-testid="account-refill" variant="secondary" leftIcon={<Coins className="h-4 w-4" />} onClick={refill}>
          Demo refill +{DEMO_REFILL_AMOUNT}
        </Button>
      </Card>
    </div>
  );
}

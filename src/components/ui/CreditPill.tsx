import React from "react";
import { Coins, Plus, Sparkles, Zap } from "lucide-react";
import { useCreditStore } from "../../store/credit-store";
import { SUBSCRIPTION_TIERS } from "../../lib/demo-assets";
import { Button } from "./Button";
import { Badge } from "./Badge";

export const CreditPill: React.FC = () => {
  const { balance, isTopUpModalOpen, openTopUpModal, closeTopUpModal, addCredits, resetCredits } = useCreditStore();

  return (
    <>
      {/* Header Credit Counter Pill */}
      <div className="flex items-center gap-1 bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-700/60 rounded-full px-3 py-1 text-xs font-semibold shadow-sm transition-all">
        <button
          onClick={openTopUpModal}
          className="flex items-center gap-1.5 text-zinc-200 hover:text-white"
          title="Click to view credits & subscription plans"
        >
          <Coins className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="font-mono text-amber-300 font-bold">{balance.toLocaleString()}</span>
          <span className="text-[10px] text-zinc-400 font-normal">Credits</span>
        </button>

        <button
          onClick={openTopUpModal}
          className="ml-1 w-5 h-5 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center transition-colors"
          title="Top up credits"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Credit Top-Up Modal */}
      {isTopUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-zinc-950 border border-zinc-800 p-6 md:p-8 space-y-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    Credits & Billing <Badge variant="emerald">Prototype Mode</Badge>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Full client-side dummy economics enabled. Refill credits freely.
                  </p>
                </div>
              </div>

              <button
                onClick={closeTopUpModal}
                className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Current Balance Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-zinc-900 to-violet-950/40 border border-amber-500/30 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-zinc-400">Current Balance</div>
                <div className="text-3xl font-black text-amber-400 font-mono flex items-center gap-2">
                  {balance.toLocaleString()} <span className="text-xs text-amber-300 font-normal">Credits Available</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => addCredits(1000, "Prototype Fast Top-Up (+1,000)")}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  +1,000 Free Credits
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={resetCredits}
                  leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                >
                  Reset Balance
                </Button>
              </div>
            </div>

            {/* Subscription Plans Grid */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-violet-400" /> Subscription Plans & Credit Allocations
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {SUBSCRIPTION_TIERS.map((tier) => (
                  <div
                    key={tier.id}
                    className={`relative p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
                      tier.isPopular
                        ? "bg-violet-950/30 border-violet-500/60 shadow-lg shadow-violet-950/50"
                        : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    {tier.badge && (
                      <div className="absolute -top-3 right-4">
                        <Badge variant="violet" size="sm">
                          {tier.badge}
                        </Badge>
                      </div>
                    )}

                    <div className="space-y-2">
                      <h5 className="font-bold text-base text-white">{tier.name}</h5>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white">{tier.price}</span>
                        <span className="text-[11px] text-zinc-400">/{tier.billingPeriod}</span>
                      </div>
                      <div className="text-xs font-mono font-bold text-amber-400">
                        {tier.creditsMonthly.toLocaleString()} Credits / mo
                      </div>

                      <ul className="space-y-1.5 pt-2 text-[11px] text-zinc-400">
                        {tier.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-violet-400 font-bold">✓</span> {feat}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      size="sm"
                      variant={tier.isPopular ? "primary" : "secondary"}
                      fullWidth
                      onClick={() => {
                        addCredits(tier.creditsMonthly, `Subscribed to ${tier.name}`);
                        closeTopUpModal();
                      }}
                    >
                      {tier.price === "$0" ? "Current Plan" : `Select ${tier.name}`}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

import React, { useState } from "react";
import {
  User,
  Coins,
  ShieldCheck,
  Key,
  CreditCard,
  History,
  Sparkles,
  Copy,
  Plus,
} from "lucide-react";
import { SUBSCRIPTION_TIERS } from "../../lib/demo-assets";
import { useCreditStore } from "../../store/credit-store";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";

export const AccountPage: React.FC = () => {
  const { balance, totalEarned, history, addCredits } = useCreditStore();

  const [activeTab, setActiveTab] = useState<"profile" | "plans" | "history" | "api">("plans");
  const [displayName, setDisplayName] = useState("Yasir Usman");
  const [username, setUsername] = useState("yasirusman85");
  const [copiedKey, setCopiedKey] = useState(false);
  const [apiKeys, setApiKeys] = useState([
    { id: "key-1", name: "Production App Key", key: "hg_live_98a7f...d94a", createdAt: "2026-09-01" },
  ]);

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCreateApiKey = () => {
    const newKey = {
      id: `key-${Date.now()}`,
      name: "Development Key",
      key: `hg_live_${Math.random().toString(36).slice(2, 14)}`,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setApiKeys([...apiKeys, newKey]);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Account Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center font-black text-xl text-white shadow-xl">
            YU
          </div>
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              {displayName} <Badge variant="violet">PROTOTYPE MODE</Badge>
            </h1>
            <p className="text-xs text-zinc-400">@{username} • Free Prototype Subscription</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab("plans")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "plans" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            Plans & Billing
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "history" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            Credit History
          </button>
          <button
            onClick={() => setActiveTab("api")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "api" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            API Keys
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "profile" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            Profile
          </button>
        </div>
      </div>

      {/* Credit Balance Card Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 space-y-2">
          <div className="text-xs font-semibold text-zinc-400 flex items-center justify-between">
            <span>Available Balance</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400 font-mono">
            {balance.toLocaleString()}
          </div>
          <p className="text-[11px] text-zinc-500">Dummy credits • Refill anytime</p>
        </div>

        <div className="p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 space-y-2">
          <div className="text-xs font-semibold text-zinc-400 flex items-center justify-between">
            <span>Total Earned</span>
            <Sparkles className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {totalEarned.toLocaleString()}
          </div>
          <p className="text-[11px] text-zinc-500">Lifetime prototype allocation</p>
        </div>

        <div className="p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 space-y-2">
          <div className="text-xs font-semibold text-zinc-400 flex items-center justify-between">
            <span>Active Tier</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">Unlimited Prototype</div>
          <p className="text-[11px] text-emerald-400 font-semibold">Zero credit rate limits</p>
        </div>
      </div>

      {/* Tab Content: Plans */}
      {activeTab === "plans" && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-violet-400" /> Subscription Plans Comparison
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SUBSCRIPTION_TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`relative p-6 rounded-3xl border flex flex-col justify-between space-y-4 transition-all ${
                  tier.isPopular
                    ? "bg-violet-950/40 border-violet-500/60 shadow-xl shadow-violet-950/60"
                    : "bg-zinc-900/90 border-zinc-800"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-white">{tier.name}</h3>
                    {tier.badge && <Badge variant="violet" size="sm">{tier.badge}</Badge>}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{tier.price}</span>
                    <span className="text-xs text-zinc-400">/{tier.billingPeriod}</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-amber-400">
                    {tier.creditsMonthly.toLocaleString()} Credits / mo
                  </div>

                  <ul className="space-y-2 pt-3 text-xs text-zinc-300">
                    {tier.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-violet-400 font-bold">✓</span> {feat}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  size="md"
                  variant={tier.isPopular ? "primary" : "secondary"}
                  fullWidth
                  onClick={() => addCredits(tier.creditsMonthly, `Upgraded to ${tier.name}`)}
                >
                  Select Plan
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content: Credit History */}
      {activeTab === "history" && (
        <div className="space-y-4 rounded-3xl bg-zinc-900/90 border border-zinc-800 p-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" /> Credit Transaction Logs
          </h2>

          <div className="space-y-2">
            {history.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-white">{tx.description}</div>
                  <div className="text-[11px] text-zinc-500">{new Date(tx.timestamp).toLocaleString()}</div>
                </div>

                <div
                  className={`font-mono font-bold text-sm ${
                    tx.type === "deduction" ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  {tx.type === "deduction" ? `-${tx.amount}` : `+${tx.amount}`} Credits
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content: API Keys */}
      {activeTab === "api" && (
        <div className="space-y-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-cyan-400" /> Developer API Keys
              </h2>
              <p className="text-xs text-zinc-400">Manage API keys for programmatic generation access</p>
            </div>
            <Button size="sm" variant="primary" onClick={handleCreateApiKey} leftIcon={<Plus className="w-4 h-4" />}>
              Create New Key
            </Button>
          </div>

          <div className="space-y-3">
            {apiKeys.map((k) => (
              <div key={k.id} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                <div className="space-y-1">
                  <div className="font-bold text-sm text-white">{k.name}</div>
                  <div className="font-mono text-xs text-zinc-400">{k.key}</div>
                  <div className="text-[11px] text-zinc-500">Created on {k.createdAt}</div>
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCopyKey(k.key)}
                  leftIcon={<Copy className="w-3.5 h-3.5" />}
                >
                  {copiedKey ? "Copied!" : "Copy Key"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content: Profile */}
      {activeTab === "profile" && (
        <div className="space-y-6 max-w-xl rounded-3xl bg-zinc-900/90 border border-zinc-800 p-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-violet-400" /> Profile Settings
          </h2>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-xs text-white focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Username Handle</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-xs text-white focus:outline-none focus:border-violet-500"
              />
            </div>

            <Button size="md" variant="primary">
              Save Profile Settings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

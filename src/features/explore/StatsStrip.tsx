import React from "react";
import { Coins, Images, ShieldCheck } from "lucide-react";
import { useProjectStore } from "../../store/project-store";
import { useCreditStore } from "../../store/credit-store";

interface StatProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  hint: string;
}

const Stat: React.FC<StatProps> = ({ icon, value, label, hint }) => (
  <div className="flex items-center gap-4 rounded-2xl border border-zinc-800/80 bg-surface-1 p-4">
    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-surface-2 text-brand-300 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
    <div className="min-w-0">
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-extrabold tabular-nums tracking-tight text-white">{value}</span>
        <span className="text-sm font-semibold text-zinc-300">{label}</span>
      </div>
      <p className="text-xs text-zinc-400">{hint}</p>
    </div>
  </div>
);

export const StatsStrip: React.FC = () => {
  const projectCount = useProjectStore((s) => s.projects.length);
  const balance = useCreditStore((s) => s.balance);

  return (
    <section aria-label="Workspace at a glance" className="grid grid-cols-1 gap-3 border-t border-zinc-800/80 pt-8 sm:grid-cols-3">
      <Stat icon={<Images aria-hidden />} value={projectCount.toLocaleString()} label={projectCount === 1 ? "project" : "projects"} hint="In your local library" />
      <Stat icon={<Coins aria-hidden />} value={balance.toLocaleString()} label="credits" hint="Demo balance, stored on this device" />
      <Stat icon={<ShieldCheck aria-hidden />} value="100%" label="in-browser" hint="Renders and assets never leave your machine" />
    </section>
  );
};

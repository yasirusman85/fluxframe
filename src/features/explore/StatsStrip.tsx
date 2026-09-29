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
  <div className="flex items-center gap-4 rounded-lg border border-ink-line bg-ink-raised p-4">
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ink-line bg-ink text-accent [&>svg]:h-4 [&>svg]:w-4">
      {icon}
    </span>
    <div className="min-w-0">
      <div className="flex items-baseline gap-1.5">
        <span className="font-grotesk text-xl font-bold tabular-nums tracking-tight text-white">{value}</span>
        <span className="text-sm font-medium text-zinc-300">{label}</span>
      </div>
      <p className="text-xs text-zinc-500">{hint}</p>
    </div>
  </div>
);

/** Workspace-at-a-glance strip that closes the body content. */
export const StatsStrip: React.FC = () => {
  const projectCount = useProjectStore((s) => s.projects.length);
  const balance = useCreditStore((s) => s.balance);

  return (
    <section
      aria-label="Workspace at a glance"
      className="lf-container mb-16 grid grid-cols-1 gap-2 sm:grid-cols-3 lg:gap-3"
    >
      <Stat
        icon={<Images aria-hidden />}
        value={projectCount.toLocaleString()}
        label={projectCount === 1 ? "project" : "projects"}
        hint="In your local library"
      />
      <Stat icon={<Coins aria-hidden />} value={balance.toLocaleString()} label="credits" hint="Demo balance, stored on this device" />
      <Stat icon={<ShieldCheck aria-hidden />} value="100%" label="in-browser" hint="Renders and assets never leave your machine" />
    </section>
  );
};

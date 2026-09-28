import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { History, RotateCcw } from "lucide-react";
import { INITIAL_CREDITS, useCreditStore } from "../../store/credit-store";
import type { CreditTransaction } from "../../store/credit-store";
import { useUIStore } from "../../store/ui-store";
import { formatDateTime } from "../../lib/format";
import { cn } from "../../lib/cn";
import type { BadgeVariant } from "../../components/ui";
import { Badge, Button, Card, EmptyState, Modal, Tabs } from "../../components/ui";

type Filter = "all" | CreditTransaction["type"];

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "spend", label: "Spend" },
  { id: "grant", label: "Grants" },
  { id: "refund", label: "Refunds" },
];

const TYPE_BADGE: Record<CreditTransaction["type"], { label: string; variant: BadgeVariant }> = {
  spend: { label: "Spend", variant: "rose" },
  grant: { label: "Grant", variant: "brand" },
  refund: { label: "Refund", variant: "sky" },
};

export function HistoryTab() {
  const { history, balance, lifetimeGranted, lifetimeSpent, reset } = useCreditStore(
    useShallow((s) => ({ history: s.history, balance: s.balance, lifetimeGranted: s.lifetimeGranted, lifetimeSpent: s.lifetimeSpent, reset: s.reset })),
  );
  const addToast = useUIStore((s) => s.addToast);
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const rows = useMemo(() => (filter === "all" ? history : history.filter((t) => t.type === filter)), [history, filter]);
  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: history.length, spend: 0, grant: 0, refund: 0 };
    for (const t of history) result[t.type] += 1;
    return result;
  }, [history]);

  const confirmReset = () => {
    reset();
    setConfirmOpen(false);
    addToast(`Balance restored to ${INITIAL_CREDITS.toLocaleString()} credits.`, { type: "success", title: "Credits reset" });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Balance", value: balance, tone: "text-amber-300" },
          { label: "Lifetime granted", value: lifetimeGranted, tone: "text-brand-300" },
          { label: "Lifetime spent", value: lifetimeSpent, tone: "text-rose-300" },
        ].map((chip) => (
          <Card key={chip.label} padding="sm" className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{chip.label}</span>
            <span className={cn("font-mono text-lg font-bold tabular-nums", chip.tone)}>{chip.value.toLocaleString()}</span>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          ariaLabel="Filter transactions"
          size="sm"
          tabs={FILTERS.map((f) => ({ id: f.id, label: f.label, badge: counts[f.id] }))}
          value={filter}
          onChange={(id) => setFilter(id as Filter)}
          testIdPrefix="history-filter"
        />
        <Button data-testid="credits-reset" variant="outline" size="sm" leftIcon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setConfirmOpen(true)}>
          Reset credits
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState compact icon={<History />} title="No transactions here" description="Credits spent on generations, plan grants and refunds will show up in this list." />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <ul role="list" className="divide-y divide-zinc-800/80">
            {rows.map((t) => {
              const badge = TYPE_BADGE[t.type];
              const signed = `${t.type === "spend" ? "-" : "+"}${t.amount.toLocaleString()}`;
              return (
                <li key={t.id} data-testid="credit-history-row" data-type={t.type} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                  <Badge variant={badge.variant} size="sm" className="w-16 justify-center">
                    {badge.label}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-100">{t.description}</p>
                    <p className="text-xs text-zinc-400">
                      {formatDateTime(t.timestamp)}
                      {t.projectId && (
                        <>
                          {" · "}
                          <Link to={`/projects/${t.projectId}`} className="font-semibold text-brand-300 underline-offset-2 hover:text-brand-200 hover:underline">
                            View project
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                  <span className={cn("font-mono font-semibold tabular-nums", t.type === "spend" ? "text-rose-300" : "text-brand-300")}>{signed}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        testId="credits-reset-confirm"
        size="sm"
        title="Reset credits?"
        description={`Restores the ${INITIAL_CREDITS.toLocaleString()} welcome credits, clears this history and returns you to the Free plan.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" data-testid="credits-reset-confirm-button" onClick={confirmReset}>
              Reset credits
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-300">Projects and stored files are not affected. Only the simulated credit ledger is reset.</p>
      </Modal>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { AlertTriangle, Database, FileJson, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import type { GenerationProject, GenerationType } from "../../types/project";
import { TYPE_LABELS } from "../../types/project";
import { useProjectStore } from "../../store/project-store";
import { useUIStore } from "../../store/ui-store";
import { garbageCollectAssets, listAssetIds, storageEstimate } from "../../lib/asset-store";
import { formatBytes, pluralize } from "../../lib/format";
import { downloadBlob } from "../../lib/download";
import { cancelAllGenerations } from "../../lib/generation-runner";
import { Button, Card, Modal, ProgressBar, SectionTitle } from "../../components/ui";

const ASSET_FIELDS = ["outputAssetId", "thumbnailAssetId", "sourceAssetId", "keyframeAssetId", "audioAssetId"] as const;

function referencedAssetIds(projects: GenerationProject[]): Set<string> {
  const ids = new Set<string>();
  for (const project of projects) {
    for (const field of ASSET_FIELDS) {
      const value = project[field];
      if (value) ids.add(value);
    }
  }
  return ids;
}

type Estimate = { usage: number; quota: number } | null;

export function StorageTab() {
  const { projects, activeJobIds, clearAllProjects, resetToSamples } = useProjectStore(
    useShallow((s) => ({ projects: s.projects, activeJobIds: s.activeJobIds, clearAllProjects: s.clearAllProjects, resetToSamples: s.resetToSamples })),
  );
  const addToast = useUIStore((s) => s.addToast);

  const [estimate, setEstimate] = useState<Estimate | undefined>(undefined);
  const [assetCount, setAssetCount] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState<"gc" | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [nextEstimate, ids] = await Promise.all([storageEstimate(), listAssetIds()]);
      if (!alive) return;
      setEstimate(nextEstimate);
      setAssetCount(ids.length);
    })();
    return () => {
      alive = false;
    };
  }, [projects, tick]);

  const percent = estimate && estimate.quota > 0 ? (estimate.usage / estimate.quota) * 100 : 0;
  const countsByType = (Object.keys(TYPE_LABELS) as GenerationType[]).map((type) => ({ type, label: TYPE_LABELS[type], count: projects.filter((p) => p.type === type).length }));
  const hasActiveJobs = activeJobIds.length > 0;

  const collectGarbage = async () => {
    setBusy("gc");
    try {
      const removed = await garbageCollectAssets(referencedAssetIds(useProjectStore.getState().projects));
      addToast(removed === 0 ? "Nothing to remove. Every stored file belongs to a project." : `Removed ${pluralize(removed, "unreferenced file")}.`, { type: "success" });
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Could not clean up storage.", { type: "error" });
    } finally {
      setBusy(null);
      setTick((t) => t + 1);
    }
  };

  const clearLibrary = () => {
    cancelAllGenerations();
    clearAllProjects();
    setConfirmClear(false);
    addToast("Library cleared. Restore the samples any time from this tab.", { type: "success" });
  };

  const restoreSamples = () => {
    resetToSamples();
    addToast("Sample projects restored.", { type: "success" });
  };

  const exportMetadata = () => {
    const blob = new Blob([JSON.stringify(useProjectStore.getState().projects, null, 2)], { type: "application/json" });
    downloadBlob(blob, "fluxframe-projects.json");
    addToast("Project metadata exported.", { type: "success" });
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <SectionTitle icon={<Database />} hint={<span className="text-zinc-400">IndexedDB + localStorage</span>}>
          Browser storage
        </SectionTitle>
        <div data-testid="storage-usage" className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="font-semibold text-zinc-100">
              {estimate === undefined ? "Measuring…" : estimate === null ? "Storage estimate unavailable in this browser" : `${formatBytes(estimate.usage)} of ${formatBytes(estimate.quota)}`}
            </span>
            {estimate ? <span className="font-mono text-xs text-zinc-400">{percent < 0.1 ? "<0.1" : percent.toFixed(1)}% used</span> : null}
          </div>
          <ProgressBar value={percent} indeterminate={estimate === undefined} label="Storage used" size="sm" />
        </div>
        <dl className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {countsByType.map((entry) => (
            <div key={entry.type} className="rounded-xl border border-zinc-800 bg-surface-2/60 px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{entry.label}</dt>
              <dd className="font-mono text-lg font-bold tabular-nums text-zinc-100">{entry.count}</dd>
            </div>
          ))}
          <div className="rounded-xl border border-zinc-800 bg-surface-2/60 px-3 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Stored files</dt>
            <dd className="font-mono text-lg font-bold tabular-nums text-zinc-100">{assetCount ?? "…"}</dd>
          </div>
        </dl>
      </Card>

      <Card className="space-y-4">
        <SectionTitle>Maintenance</SectionTitle>
        <div className="flex flex-wrap gap-2">
          <Button data-testid="storage-gc" variant="outline" isLoading={busy === "gc"} disabled={hasActiveJobs} leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => void collectGarbage()}>
            Remove unreferenced files
          </Button>
          <Button data-testid="storage-restore-samples" variant="secondary" leftIcon={<Sparkles className="h-4 w-4" />} onClick={restoreSamples}>
            Restore samples
          </Button>
          <Button data-testid="storage-export" variant="secondary" leftIcon={<FileJson className="h-4 w-4" />} onClick={exportMetadata}>
            Export project metadata (JSON)
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-zinc-400">
          {hasActiveJobs
            ? "Clean-up is paused while a generation is running so files that are still being written are not removed."
            : "Clean-up deletes stored files that no project references any more. Restoring samples replaces the library with the showcase projects. The export contains metadata only, not media."}
        </p>
      </Card>

      <Card className="space-y-3 border-rose-500/30">
        <SectionTitle icon={<AlertTriangle className="text-rose-400" />}>Danger zone</SectionTitle>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs leading-relaxed text-zinc-400">Deletes every project and its stored files in this browser, and cancels anything still generating.</p>
          <Button data-testid="storage-clear" variant="danger" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmClear(true)}>
            Clear library
          </Button>
        </div>
      </Card>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        testId="storage-clear-confirm"
        size="sm"
        title="Clear the whole library?"
        description={`${pluralize(projects.length, "project")} and their files will be deleted. This cannot be undone.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button variant="danger" data-testid="storage-clear-confirm-button" onClick={clearLibrary}>
              Clear library
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-300">Credits, plans and preferences are kept. Export the metadata first if you want a record of your prompts.</p>
      </Modal>
    </div>
  );
}

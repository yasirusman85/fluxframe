import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, LayoutGrid } from "lucide-react";
import { CREATIVE_APPS } from "../../lib/catalog";
import type { CreativeApp } from "../../lib/catalog";
import { pluralize } from "../../lib/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useProjectStore } from "../../store/project-store";
import { Badge, EmptyState, PageHeader, Tabs } from "../../components/ui";
import { MediaCard } from "../../components/media/MediaCard";
import { AppIcon } from "./AppIcon";
import { AppRunModal } from "./AppRunModal";

const ALL = "All";
const RECENT_LIMIT = 8;

export function AppsPage() {
  useDocumentTitle("Creative Apps");
  const [category, setCategory] = useState<string>(ALL);
  const [selected, setSelected] = useState<CreativeApp | null>(null);
  const [open, setOpen] = useState(false);
  const projects = useProjectStore((s) => s.projects);

  const categories = useMemo(() => [ALL, ...Array.from(new Set(CREATIVE_APPS.map((app) => app.category)))], []);
  const visible = useMemo(() => (category === ALL ? CREATIVE_APPS : CREATIVE_APPS.filter((app) => app.category === category)), [category]);
  const recent = useMemo(() => projects.filter((p) => p.origin === "app").slice(0, RECENT_LIMIT), [projects]);

  const openApp = useCallback((app: CreativeApp) => {
    setSelected(app);
    setOpen(true);
  }, []);
  const closeModal = useCallback(() => setOpen(false), []);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-4 md:p-6 lg:p-8 animate-fade-in">
      <PageHeader
        icon={<LayoutGrid />}
        title="Creative Apps"
        badge={<Badge variant="neutral">{pluralize(CREATIVE_APPS.length, "app")}</Badge>}
        description="One-tap creative workflows built on the studios. Fill in a few fields and the app composes the prompt, picks the engine and saves the result to your library."
      />

      <Tabs
        ariaLabel="Filter apps by category"
        tabs={categories.map((id) => ({ id, label: id, badge: id === ALL ? CREATIVE_APPS.length : CREATIVE_APPS.filter((app) => app.category === id).length }))}
        value={category}
        onChange={setCategory}
        testIdPrefix="app-filter"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((app) => (
          <button
            key={app.id}
            type="button"
            data-testid={`app-card-${app.id}`}
            aria-haspopup="dialog"
            onClick={() => openApp(app)}
            className="group flex h-full flex-col rounded-2xl border border-zinc-800/80 bg-surface-1 p-5 text-left shadow-panel transition-colors hover:border-brand-500/50 hover:bg-surface-2"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-brand-500/20 bg-brand-500/10 text-brand-300 transition-colors group-hover:bg-brand-500/15">
                <AppIcon name={app.icon} className="h-5 w-5" />
              </span>
              <Badge variant="neutral" size="sm">
                {app.badge}
              </Badge>
            </div>
            <h3 className="mt-4 text-base font-bold text-white">{app.name}</h3>
            <p className="text-sm text-brand-200">{app.tagline}</p>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">{app.description}</p>
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-800 pt-3 text-xs text-zinc-400">
              <span>
                {app.creditCost} credits · {pluralize(app.steps, "step")} · {app.outputKind}
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-brand-300 group-hover:text-brand-200">
                Open <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </div>
          </button>
        ))}
      </div>

      <section aria-labelledby="recent-app-outputs" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="recent-app-outputs" className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Recent app outputs
          </h2>
          <Link to="/projects" className="text-xs font-semibold text-brand-300 hover:text-brand-200">
            Open library
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            compact
            icon={<LayoutGrid />}
            title="No app outputs yet"
            description="Run any app above. Finished outputs are saved to your library and show up here."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {recent.map((project) => (
              <MediaCard key={project.id} project={project} size="sm" />
            ))}
          </div>
        )}
      </section>

      <AppRunModal app={selected} open={open} onClose={closeModal} />
    </div>
  );
}

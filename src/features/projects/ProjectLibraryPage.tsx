import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckSquare, LayoutGrid, Library, List, MoreHorizontal, RotateCcw, Search, Sparkles, Trash2 } from "lucide-react";
import type { GenerationProject } from "../../types/project";
import { Badge, Button, EmptyState, IconButton, Input, Modal, PageHeader, Select, Tabs } from "../../components/ui";
import { MediaCard } from "../../components/media/MediaCard";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useProjectStore } from "../../store/project-store";
import { useUIStore } from "../../store/ui-store";
import { storageEstimate } from "../../lib/asset-store";
import { downloadProject } from "../../lib/download";
import { cancelAllGenerations } from "../../lib/generation-runner";
import { formatBytes, pluralize } from "../../lib/format";
import { LinkButton } from "./LinkButton";
import { ProjectListRow } from "./ProjectListRow";
import { useDebouncedValue } from "./useDebouncedValue";
import type { LibraryView } from "./library-utils";
import {
  FILTER_LABELS,
  LIBRARY_FILTERS,
  LIBRARY_PAGE_SIZE,
  SORT_OPTIONS,
  countByFilter,
  filterProjects,
  parseFilter,
  parseSort,
  readStoredView,
  sortProjects,
  storeView,
} from "./library-utils";

const SEARCH_DEBOUNCE_MS = 150;

interface LibraryMenuProps {
  onClear: () => void;
  onRestore: () => void;
}

/** Overflow menu for the destructive / restorative library actions. */
const LibraryMenu: React.FC<LibraryMenuProps> = ({ onClear, onRestore }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  const itemClass = "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white";

  return (
    <div ref={rootRef} className="relative">
      <IconButton
        size="sm"
        variant="secondary"
        label="More library actions"
        aria-haspopup="menu"
        aria-expanded={open}
        icon={<MoreHorizontal className="h-4 w-4" aria-hidden />}
        onClick={() => setOpen((value) => !value)}
        data-testid="library-more"
      />
      {open && (
        <div role="menu" aria-label="Library actions" className="animate-fade-in absolute right-0 z-30 mt-1 w-52 rounded-xl border border-zinc-800 bg-surface-2 p-1 shadow-panel">
          <button type="button" role="menuitem" className={itemClass} onClick={() => run(onClear)} data-testid="library-clear">
            <Trash2 className="h-3.5 w-3.5 text-rose-400" aria-hidden />
            Clear library
          </button>
          <button type="button" role="menuitem" className={itemClass} onClick={() => run(onRestore)} data-testid="library-restore-samples">
            <RotateCcw className="h-3.5 w-3.5 text-brand-400" aria-hidden />
            Restore samples
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * The project library: filter tabs, debounced search, sorting, grid/list
 * views, multi-select bulk delete and paging. Filters live in the query
 * string so `/projects?filter=favorites` is a real, shareable deep link.
 */
export const ProjectLibraryPage: React.FC = () => {
  useDocumentTitle("Library");
  const [searchParams, setSearchParams] = useSearchParams();

  const projects = useProjectStore((s) => s.projects);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const deleteProjects = useProjectStore((s) => s.deleteProjects);
  const toggleFavorite = useProjectStore((s) => s.toggleFavorite);
  const clearAllProjects = useProjectStore((s) => s.clearAllProjects);
  const resetToSamples = useProjectStore((s) => s.resetToSamples);
  const addToast = useUIStore((s) => s.addToast);

  const filter = parseFilter(searchParams.get("filter"));
  const [sort, setSort] = useState(() => parseSort(searchParams.get("sort")));
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const [view, setView] = useState<LibraryView>(readStoredView);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [limit, setLimit] = useState(LIBRARY_PAGE_SIZE);
  const [usage, setUsage] = useState<number | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<GenerationProject | null>(null);

  const counts = useMemo(() => countByFilter(projects), [projects]);
  const visible = useMemo(() => sortProjects(filterProjects(projects, filter, debouncedQuery), sort), [projects, filter, debouncedQuery, sort]);
  const page = useMemo(() => visible.slice(0, limit), [visible, limit]);

  // A new filter/search/sort always starts back at the first page.
  useEffect(() => setLimit(LIBRARY_PAGE_SIZE), [filter, debouncedQuery, sort]);

  // Drop selected ids that no longer exist (deleted elsewhere, library cleared).
  useEffect(() => {
    setSelected((current) => {
      const live = current.filter((id) => projects.some((project) => project.id === id));
      return live.length === current.length ? current : live;
    });
  }, [projects]);

  useEffect(() => {
    let alive = true;
    void storageEstimate().then((estimate) => {
      if (alive && estimate) setUsage(estimate.usage);
    });
    return () => {
      alive = false;
    };
  }, [projects.length]);

  const changeFilter = useCallback(
    (next: string) => {
      const value = parseFilter(next);
      const params = new URLSearchParams(searchParams);
      if (value === "all") params.delete("filter");
      else params.set("filter", value);
      setSearchParams(params);
    },
    [searchParams, setSearchParams],
  );

  const changeView = (next: LibraryView) => {
    setView(next);
    storeView(next);
  };

  const toggleSelect = useCallback((id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  }, []);

  const exitSelection = () => {
    setSelecting(false);
    setSelected([]);
  };

  const download = useCallback(
    (project: GenerationProject) => {
      downloadProject(project).catch((err: unknown) => addToast(err instanceof Error ? err.message : "Download failed.", { type: "error" }));
    },
    [addToast],
  );

  const bulkDelete = () => {
    const count = selected.length;
    deleteProjects(selected);
    setConfirmBulk(false);
    exitSelection();
    addToast(`${pluralize(count, "project")} deleted.`, { type: "info" });
  };

  const confirmSingleDelete = () => {
    if (!pendingDelete) return;
    deleteProject(pendingDelete.id);
    addToast(`“${pendingDelete.title}” deleted.`, { type: "info" });
    setPendingDelete(null);
  };

  const clearLibrary = () => {
    cancelAllGenerations();
    clearAllProjects();
    setConfirmClear(false);
    exitSelection();
    addToast("Library cleared. Restore the samples any time from the ⋯ menu.", { type: "success" });
  };

  const restoreSamples = () => {
    resetToSamples();
    exitSelection();
    addToast("Sample projects restored.", { type: "success" });
  };

  const clearFilters = () => {
    setQuery("");
    changeFilter("all");
  };

  const clipCount = projects.length - counts.image;
  const description =
    `${pluralize(projects.length, "project")} · ${pluralize(counts.image, "image")} · ${pluralize(clipCount, "clip")}` +
    (usage ? ` · ${formatBytes(usage)} used` : "");

  const filtered = filter !== "all" || debouncedQuery.trim().length > 0;

  return (
    <div className="animate-fade-in mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        icon={<Library aria-hidden />}
        title="Library"
        badge={
          <Badge variant="neutral" size="sm">
            Stored in this browser
          </Badge>
        }
        description={description}
        actions={
          <LinkButton to="/create/image" variant="primary" leftIcon={<Sparkles aria-hidden />} testId="library-create">
            New generation
          </LinkButton>
        }
      />

      <div className="glass sticky top-0 z-20 -mx-4 space-y-3 border-b border-zinc-800/80 px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Tabs
          ariaLabel="Filter projects"
          size="sm"
          testIdPrefix="library-filter"
          value={filter}
          onChange={changeFilter}
          tabs={LIBRARY_FILTERS.map((id) => ({ id, label: FILTER_LABELS[id], badge: counts[id] }))}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[200px] flex-1">
            <Input
              testId="library-search"
              inputSize="sm"
              type="search"
              aria-label="Search projects"
              placeholder="Search title, prompt, model or tag…"
              leftIcon={<Search aria-hidden />}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Select
            testId="library-sort"
            ariaLabel="Sort projects"
            size="sm"
            className="min-w-[7rem] flex-1 sm:w-44 sm:flex-none"
            value={sort}
            onChange={(value) => setSort(parseSort(value))}
            options={SORT_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          />
          <div className="flex items-center gap-0.5 rounded-xl border border-zinc-800 bg-surface-2 p-0.5">
            <IconButton
              size="sm"
              label="Grid view"
              aria-pressed={view === "grid"}
              active={view === "grid"}
              icon={<LayoutGrid className="h-4 w-4" aria-hidden />}
              onClick={() => changeView("grid")}
              data-testid="library-view-grid"
            />
            <IconButton
              size="sm"
              label="List view"
              aria-pressed={view === "list"}
              active={view === "list"}
              icon={<List className="h-4 w-4" aria-hidden />}
              onClick={() => changeView("list")}
              data-testid="library-view-list"
            />
          </div>
          <Button
            size="sm"
            variant={selecting ? "secondary" : "outline"}
            aria-pressed={selecting}
            leftIcon={<CheckSquare className="h-3.5 w-3.5" aria-hidden />}
            onClick={() => (selecting ? exitSelection() : setSelecting(true))}
            data-testid="library-select-toggle"
          >
            Select
          </Button>
          <LibraryMenu onClear={() => setConfirmClear(true)} onRestore={restoreSamples} />
        </div>

        {selecting && (
          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800/80 pt-3">
            <span className="text-xs font-semibold text-zinc-200" data-testid="library-selected-count" aria-live="polite">
              {selected.length} selected
            </span>
            <Button size="sm" variant="ghost" onClick={() => setSelected(page.map((project) => project.id))}>
              Select all visible
            </Button>
            <span className="flex-1" />
            <Button
              size="sm"
              variant="danger"
              disabled={selected.length === 0}
              leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden />}
              onClick={() => setConfirmBulk(true)}
              data-testid="library-bulk-delete"
            >
              Delete
            </Button>
            <Button size="sm" variant="outline" onClick={exitSelection}>
              Done
            </Button>
          </div>
        )}
      </div>

      {projects.length === 0 ? (
        <EmptyState
          testId="library-empty"
          icon={<Library aria-hidden />}
          title="No projects yet"
          description={<span className="text-zinc-400">Everything you generate is stored in this browser and shows up here. Start with a text-to-image render.</span>}
          action={
            <LinkButton to="/create/image" variant="primary" leftIcon={<Sparkles aria-hidden />} testId="library-empty-cta">
              Open the Image Studio
            </LinkButton>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          testId="library-empty"
          icon={<Search aria-hidden />}
          title="Nothing matches"
          description={<span className="text-zinc-400">No project matches this filter and search. Widen the search or switch back to all projects.</span>}
          action={
            <Button variant="secondary" onClick={clearFilters} data-testid="library-clear-filters">
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-zinc-400" aria-live="polite">
            Showing {page.length} of {pluralize(visible.length, "project")}
            {filtered ? ` · ${FILTER_LABELS[filter]}${debouncedQuery.trim() ? ` · “${debouncedQuery.trim()}”` : ""}` : ""}
          </p>

          {view === "grid" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
              {page.map((project) => (
                <MediaCard
                  key={project.id}
                  project={project}
                  selectable={selecting}
                  selected={selected.includes(project.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
          ) : (
            <ul className="space-y-2" aria-label="Projects">
              {page.map((project) => (
                <ProjectListRow
                  key={project.id}
                  project={project}
                  selectable={selecting}
                  selected={selected.includes(project.id)}
                  onToggleSelect={toggleSelect}
                  onToggleFavorite={toggleFavorite}
                  onDownload={download}
                  onDelete={setPendingDelete}
                />
              ))}
            </ul>
          )}

          {visible.length > page.length && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => setLimit((current) => current + LIBRARY_PAGE_SIZE)} data-testid="library-load-more">
                Load {Math.min(LIBRARY_PAGE_SIZE, visible.length - page.length)} more
              </Button>
            </div>
          )}
        </div>
      )}

      <Modal
        open={confirmBulk}
        onClose={() => setConfirmBulk(false)}
        size="sm"
        title="Delete selected projects?"
        description="Their stored files are removed from this browser too."
        testId="library-bulk-delete-modal"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmBulk(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={bulkDelete} data-testid="library-bulk-delete-confirm">
              Delete {selected.length}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-zinc-300">
          {pluralize(selected.length, "project")} will be deleted permanently. This cannot be undone.
        </p>
      </Modal>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        size="sm"
        title="Clear the library?"
        description="Every project and its stored files are removed from this browser."
        testId="library-clear-modal"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={clearLibrary} data-testid="library-clear-confirm">
              Clear library
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-zinc-300">
          This deletes all {pluralize(projects.length, "project")} and cancels anything still generating. You can restore the sample projects afterwards.
        </p>
      </Modal>

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        size="sm"
        title="Delete this project?"
        testId="library-delete-modal"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={confirmSingleDelete} data-testid="library-delete-confirm">
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-zinc-300">
          “{pendingDelete?.title}” and its stored file are removed from this browser. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
};

export default ProjectLibraryPage;

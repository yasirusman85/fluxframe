import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Clapperboard, Coins, FolderOpen, Image as ImageIcon, PanelLeft, Search, Sparkles, Wand2 } from "lucide-react";
import { ROUTES } from "../../app/routes";
import { ALL_MODELS, SHOWCASE_PRESETS } from "../../lib/catalog";
import { STUDIO_ROUTES, TYPE_LABELS } from "../../types/project";
import { buildStudioUrl } from "../../lib/query-params";
import { useProjectStore } from "../../store/project-store";
import { useCreditStore } from "../../store/credit-store";
import { useUIStore } from "../../store/ui-store";
import { cn } from "../../lib/cn";
import { Badge } from "../ui/Badge";
import { Kbd } from "../ui/Kbd";
import { Modal } from "../ui/Modal";

/** Render order. Pages first so a page always outranks an engine or a prompt. */
const GROUPS = ["Pages", "Engines", "Prompts", "Projects", "Actions"] as const;
type PaletteGroup = (typeof GROUPS)[number];

/** Groups worth showing before anything has been typed. */
const IDLE_GROUPS: readonly PaletteGroup[] = ["Pages", "Actions"];

const LIMITS: Record<PaletteGroup, number> = { Pages: 12, Engines: 5, Prompts: 5, Projects: 5, Actions: 6 };

interface PaletteItem {
  id: string;
  group: PaletteGroup;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  badge?: string;
  keywords?: string[];
  run: () => void;
}

/**
 * Exact and prefix title hits always beat keyword or description hits, so
 * typing "cinema" puts "Cinema Studio" at the top of the Pages group — and
 * therefore at the top of the list.
 */
function scoreItem(item: PaletteItem, query: string): number {
  if (!query) return 0;
  const title = item.title.toLowerCase();
  if (title === query) return 120;
  if (title.startsWith(query)) return 100;
  if (title.split(/\s+/).some((word) => word.startsWith(query))) return 80;
  if (title.includes(query)) return 60;
  if (item.keywords?.some((keyword) => keyword.startsWith(query))) return 40;
  if ((item.subtitle ?? "").toLowerCase().includes(query)) return 20;
  if (item.keywords?.some((keyword) => keyword.includes(query))) return 10;
  return -1;
}

/**
 * ⌘K launcher: pages, engines, showcase prompts, your projects and a few
 * shell actions. Opening is owned by `useUIStore.commandPaletteOpen` so the
 * header button and the global shortcut share one source of truth.
 */
export const CommandPalette: React.FC = () => {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const openTopUp = useCreditStore((s) => s.openTopUp);
  const projects = useProjectStore((s) => s.projects);
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listId = useId();
  const optionId = (index: number) => `${listId}-option-${index}`;

  const items = useMemo<PaletteItem[]>(() => {
    const pages: PaletteItem[] = ROUTES.map((route) => ({
      id: `page:${route.id}`,
      group: "Pages",
      title: route.title,
      subtitle: route.description,
      icon: route.icon,
      badge: route.badge,
      keywords: route.keywords,
      run: () => navigate(route.path),
    }));

    const engines: PaletteItem[] = ALL_MODELS.map((model) => ({
      id: `engine:${model.id}`,
      group: "Engines",
      title: model.name,
      subtitle: model.description,
      icon: Sparkles,
      badge: TYPE_LABELS[model.type],
      keywords: [model.id, model.type, model.qualityLabel.toLowerCase()],
      run: () => navigate(`/create/${model.type}?model=${model.id}`),
    }));

    const prompts: PaletteItem[] = SHOWCASE_PRESETS.map((preset) => ({
      id: `prompt:${preset.id}`,
      group: "Prompts",
      title: preset.title,
      subtitle: preset.prompt,
      icon: Wand2,
      badge: preset.category,
      keywords: [preset.category.toLowerCase(), preset.type],
      run: () =>
        navigate(
          buildStudioUrl(STUDIO_ROUTES[preset.type], {
            prompt: preset.prompt,
            model: preset.model,
            ratio: preset.aspectRatio,
            camera: preset.cameraPreset,
          }),
        ),
    }));

    const projectItems: PaletteItem[] = projects.map((project) => ({
      id: `project:${project.id}`,
      group: "Projects",
      title: project.title,
      subtitle: project.prompt,
      icon: FolderOpen,
      badge: TYPE_LABELS[project.type],
      keywords: [project.type],
      run: () => navigate(`/projects/${project.id}`),
    }));

    const actions: PaletteItem[] = [
      { id: "action:sidebar", group: "Actions", title: "Toggle sidebar", subtitle: "Collapse or expand the navigation rail", icon: PanelLeft, keywords: ["collapse", "expand", "nav"], run: toggleSidebar },
      { id: "action:credits", group: "Actions", title: "Open credits", subtitle: "Top up your balance or change plan", icon: Coins, keywords: ["billing", "plan", "balance", "top up"], run: openTopUp },
      { id: "action:new-image", group: "Actions", title: "New image", subtitle: "Start a fresh text-to-image generation", icon: ImageIcon, keywords: ["create", "generate", "picture"], run: () => navigate("/create/image") },
      { id: "action:new-cinema", group: "Actions", title: "New cinema clip", subtitle: "Start a fresh camera-motion clip", icon: Clapperboard, keywords: ["create", "generate", "motion", "clip"], run: () => navigate("/create/cinema") },
    ];

    return [...pages, ...engines, ...prompts, ...projectItems, ...actions];
  }, [navigate, openTopUp, projects, toggleSidebar]);

  const sections = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const visible = needle ? GROUPS : IDLE_GROUPS;
    return visible
      .map((group) => ({
        group,
        items: items
          .filter((item) => item.group === group)
          .map((item) => ({ item, score: scoreItem(item, needle) }))
          .filter((scored) => scored.score >= 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, LIMITS[group])
          .map((scored) => scored.item),
      }))
      .filter((section) => section.items.length > 0);
  }, [items, query]);

  const flat = useMemo(() => sections.flatMap((section) => section.items), [sections]);
  const indexById = useMemo(() => new Map(flat.map((item, index) => [item.id, index])), [flat]);
  // -1 means "the user has not moved yet": the first result is shown as the
  // highlight, and the first ArrowDown lands on it rather than skipping it.
  const highlighted = flat.length === 0 ? -1 : Math.min(Math.max(activeIndex, 0), flat.length - 1);

  useEffect(() => {
    if (open) return;
    setQuery("");
    setActiveIndex(-1);
  }, [open]);

  useEffect(() => setActiveIndex(-1), [query]);

  useEffect(() => {
    if (!open || highlighted < 0) return;
    optionRefs.current[highlighted]?.scrollIntoView?.({ block: "nearest" });
  }, [highlighted, open]);

  const close = () => setOpen(false);

  const move = (delta: number) => {
    if (flat.length === 0) return;
    setActiveIndex((current) => {
      if (current < 0) return delta > 0 ? 0 : flat.length - 1;
      return (current + delta + flat.length) % flat.length;
    });
  };

  const activate = (item?: PaletteItem) => {
    const target = item ?? flat[highlighted];
    if (!target) return;
    close();
    target.run();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      activate();
    }
  };

  optionRefs.current = [];

  return (
    <Modal open={open} onClose={close} hideHeader size="lg" testId="command-palette" initialFocusRef={inputRef}>
      <div className="space-y-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-surface-2 px-3">
          <Search className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
          <input
            ref={inputRef}
            data-testid="command-palette-input"
            type="text"
            role="combobox"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            aria-label="Search pages, engines, prompts and projects"
            aria-expanded={flat.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={highlighted >= 0 ? optionId(highlighted) : undefined}
            placeholder="Search pages, engines, prompts, projects…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            className="h-12 min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-400"
          />
          <Kbd className="hidden sm:inline-flex">esc</Kbd>
        </div>

        <div
          id={listId}
          role="listbox"
          aria-label="Command results"
          className={cn("-mx-1 max-h-[46vh] space-y-3 overflow-y-auto px-1", flat.length === 0 && "hidden")}
        >
          {sections.map((section) => (
            <div key={section.group} role="group" aria-label={section.group}>
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400" aria-hidden>
                {section.group}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const index = indexById.get(item.id) ?? 0;
                  const Icon = item.icon;
                  const selected = index === highlighted;
                  return (
                    <button
                      key={item.id}
                      ref={(element) => {
                        optionRefs.current[index] = element;
                      }}
                      type="button"
                      role="option"
                      id={optionId(index)}
                      data-testid="command-palette-item"
                      aria-selected={selected}
                      tabIndex={-1}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => activate(item)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition-colors",
                        selected ? "border-brand-500/30 bg-brand-500/12" : "border-transparent hover:bg-zinc-800/50",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                          selected ? "border-brand-500/30 bg-brand-500/10 text-brand-300" : "border-zinc-800 bg-surface-2 text-zinc-400",
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-sm font-semibold", selected ? "text-brand-100" : "text-zinc-100")}>{item.title}</span>
                        {item.subtitle && <span className="block truncate text-xs text-zinc-400">{item.subtitle}</span>}
                      </span>
                      {item.badge && (
                        <Badge size="sm" variant="neutral">
                          {item.badge}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {flat.length === 0 && (
          <p className="px-2 py-8 text-center text-sm text-zinc-400">
            No results for <span className="font-semibold text-zinc-200">“{query.trim()}”</span>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-zinc-800 pt-3 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            navigate
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd>
            open
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>esc</Kbd>
            close
          </span>
        </div>
      </div>
    </Modal>
  );
};

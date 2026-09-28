import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Check, ChevronDown, Cpu, Globe } from "lucide-react";
import type { ModelInfo } from "../../lib/catalog";
import { cn } from "../../lib/cn";
import { Badge } from "../ui";

export interface ModelSelectorProps {
  models: ModelInfo[];
  value: string;
  onChange: (id: string) => void;
  /** Visible label; defaults to a visually hidden "Model". */
  label?: string;
  /** Root test id; defaults to "model-selector". */
  testId?: string;
}

function EngineLine({ engine }: { engine: ModelInfo["engine"] }) {
  const pollinations = engine === "pollinations";
  const Icon = pollinations ? Globe : Cpu;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400">
      <Icon className="h-3 w-3" aria-hidden />
      {pollinations ? "via Pollinations" : "In-browser engine"}
    </span>
  );
}

function ModelDetails({ model, nameId }: { model: ModelInfo; nameId?: string }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span id={nameId} className="truncate text-sm font-semibold text-zinc-100">
          {model.name}
        </span>
        <Badge size="sm" variant={model.isPopular ? "brand" : "neutral"}>
          {model.badge}
        </Badge>
      </div>
      <p className="truncate text-xs text-zinc-400">{model.description}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
        <span className="font-mono font-semibold text-amber-300">{model.creditCost} credits</span>
        <span className="text-zinc-400">{model.speed}</span>
        <EngineLine engine={model.engine} />
      </div>
    </div>
  );
}

/** Accessible listbox-style dropdown for picking an engine. */
export function ModelSelector({ models, value, onChange, label, testId }: ModelSelectorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const valueId = `${baseId}-value`;
  const listId = `${baseId}-listbox`;

  const selectedIndex = Math.max(
    0,
    models.findIndex((model) => model.id === value),
  );
  const selected = models.find((model) => model.id === value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  const close = useCallback((refocus = false) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const openList = () => {
    setActiveIndex(selectedIndex);
    setOpen(true);
  };

  const select = (id: string) => {
    onChange(id);
    close(true);
  };

  // Roving focus: the active option owns focus while the list is open.
  useEffect(() => {
    if (!open) return;
    optionRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  // Click outside closes.
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openList();
    }
  };

  const onListKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const count = models.length;
    if (count === 0) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % count);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + count) % count);
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(count - 1);
        break;
      case "Enter":
      case " ": {
        event.preventDefault();
        const model = models[activeIndex];
        if (model) select(model.id);
        break;
      }
      case "Escape":
        event.preventDefault();
        close(true);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
    }
  };

  return (
    <div ref={rootRef} data-testid={testId ?? "model-selector"} className="relative space-y-1.5">
      <span id={labelId} className={label ? "block text-xs font-semibold text-zinc-300" : "sr-only"}>
        {label ?? "Model"}
      </span>
      <button
        ref={triggerRef}
        type="button"
        data-testid="model-selector-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${labelId} ${valueId}`}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border bg-surface-2 px-3.5 py-2.5 text-left transition-colors",
          open ? "border-brand-500/70" : "border-zinc-800 hover:border-zinc-700",
        )}
      >
        {selected ? (
          <ModelDetails model={selected} nameId={valueId} />
        ) : (
          <span id={valueId} className="flex-1 text-sm text-zinc-400">
            Choose a model
          </span>
        )}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-zinc-400 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div
          role="listbox"
          id={listId}
          aria-labelledby={labelId}
          tabIndex={-1}
          onKeyDown={onListKeyDown}
          className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-zinc-700/80 bg-surface-2 p-1 shadow-2xl animate-slide-up"
        >
          {models.map((model, index) => {
            const isSelected = model.id === value;
            const isActive = index === activeIndex;
            return (
              <div
                key={model.id}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                role="option"
                id={`${baseId}-option-${index}`}
                aria-selected={isSelected}
                tabIndex={isActive ? 0 : -1}
                data-testid={`model-option-${model.id}`}
                onClick={() => select(model.id)}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 outline-none transition-colors",
                  isActive && "bg-zinc-800/70",
                  isSelected && "bg-brand-500/10",
                )}
              >
                <ModelDetails model={model} />
                <Check className={cn("mt-0.5 h-4 w-4 shrink-0 text-brand-400", !isSelected && "invisible")} aria-hidden />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

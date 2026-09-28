import { useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { ChevronsLeftRight } from "lucide-react";
import { cn } from "../../lib/cn";

export interface ImageCompareProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel: string;
  afterLabel: string;
  className?: string;
}

const KEY_STEP = 5;
const clamp = (value: number) => Math.min(100, Math.max(0, value));

/** Before/after reveal slider. Drag anywhere, or focus the handle and use the arrow keys. */
export function ImageCompare({ beforeUrl, afterUrl, beforeLabel, afterLabel, className }: ImageCompareProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);

  const positionFromPointer = (clientX: number) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    setPosition(clamp(((clientX - rect.left) / rect.width) * 100));
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(true);
    positionFromPointer(event.clientX);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    positionFromPointer(event.clientX);
  };

  const endDrag = () => setDragging(false);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        setPosition((current) => clamp(current - KEY_STEP));
        break;
      case "ArrowRight":
      case "ArrowUp":
        setPosition((current) => clamp(current + KEY_STEP));
        break;
      case "Home":
        setPosition(0);
        break;
      case "End":
        setPosition(100);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const rounded = Math.round(position);

  return (
    <div
      ref={boxRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={cn("relative aspect-video select-none overflow-hidden rounded-xl bg-surface-2 touch-none", dragging ? "cursor-grabbing" : "cursor-col-resize", className)}
    >
      <img src={beforeUrl} alt={beforeLabel} draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      <img
        src={afterUrl}
        alt={afterLabel}
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 0 0 ${position}%)` }}
      />

      <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-zinc-100 backdrop-blur">{beforeLabel}</span>
      <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-zinc-100 backdrop-blur">{afterLabel}</span>

      <div aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/90 shadow-[0_0_0_1px_rgb(0_0_0/0.4)]" style={{ left: `calc(${position}% - 1px)` }} />
      <div
        role="slider"
        tabIndex={0}
        aria-label={`Reveal ${afterLabel}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rounded}
        aria-valuetext={`${rounded}% ${beforeLabel}, ${100 - rounded}% ${afterLabel}`}
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        className="absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/70 text-white shadow-lg backdrop-blur transition-transform hover:scale-105"
        style={{ left: `${position}%` }}
      >
        <ChevronsLeftRight className="h-4 w-4" aria-hidden />
      </div>
    </div>
  );
}

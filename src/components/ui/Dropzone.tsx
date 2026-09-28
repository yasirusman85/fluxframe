import React, { useId, useRef, useState } from "react";
import { FileAudio, ImagePlus, Loader2, X } from "lucide-react";
import { cn } from "../../lib/cn";

export interface DropzoneProps {
  accept: "image" | "audio";
  onFile: (file: File) => void | Promise<void>;
  /** Object URL of the current image (image mode). */
  previewUrl?: string;
  /** Name of the current file (audio mode, or image without preview). */
  fileName?: string;
  onClear?: () => void;
  label: string;
  hint?: string;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
  /** Root gets `testId`, the hidden input gets `${testId}-input`. */
  testId?: string;
  /** CSS aspect-ratio for the preview box, e.g. "16 / 9". */
  aspect?: string;
}

export const Dropzone: React.FC<DropzoneProps> = ({ accept, onFile, previewUrl, fileName, onClear, label, hint, disabled, compact, className, testId, aspect = "16 / 9" }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file || disabled) return;
    setError(null);
    setBusy(true);
    try {
      await onFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load that file.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const hasFile = Boolean(previewUrl || fileName);
  const Icon = accept === "image" ? ImagePlus : FileAudio;

  return (
    <div className={cn("space-y-1.5", className)} data-testid={testId}>
      {/*
       * Accessibility: the file input is the real control (focusable, named by
       * the <label> that wraps the whole drop area). Using role="button" on the
       * container instead would nest interactive elements and leave the input
       * unnamed, which axe reports as nested-interactive + critical.
       */}
      <div
        className="relative"
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept === "image" ? "image/*" : "audio/*"}
          className="peer sr-only"
          data-testid={testId ? `${testId}-input` : undefined}
          disabled={disabled}
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "relative flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed text-center transition-colors cursor-pointer overflow-hidden",
            "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-400",
            compact ? "p-3" : "p-5",
            dragging ? "border-brand-400 bg-brand-500/10" : "border-zinc-700 bg-surface-2/70 hover:border-brand-500/60 hover:bg-surface-2",
            disabled && "opacity-50 cursor-not-allowed",
            hasFile && accept === "image" && previewUrl && "p-0 border-solid border-brand-500/40",
          )}
          style={hasFile && accept === "image" && previewUrl ? { aspectRatio: aspect } : undefined}
        >
          {busy ? (
            <span className="flex items-center gap-2 py-2 text-xs text-zinc-300">
              <Loader2 className="w-4 h-4 animate-spin text-brand-400" aria-hidden /> Processing file…
            </span>
          ) : hasFile && accept === "image" && previewUrl ? (
            <img src={previewUrl} alt={fileName ?? "Selected image"} className="absolute inset-0 w-full h-full object-cover" />
          ) : hasFile ? (
            <span className="flex items-center gap-2 text-xs font-medium text-brand-200">
              <Icon className="w-4 h-4" aria-hidden /> <span className="truncate max-w-[220px]">{fileName}</span>
            </span>
          ) : (
            <>
              <Icon className={cn("text-brand-400", compact ? "w-5 h-5" : "w-7 h-7")} aria-hidden />
              <span className="text-xs font-semibold text-zinc-200">{label}</span>
              {hint && <span className="text-[11px] text-zinc-400">{hint}</span>}
            </>
          )}
        </label>
        {/* Sibling of the label, never a child: a button inside a label is also nested-interactive. */}
        {hasFile && onClear && !busy && (
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold text-zinc-200 transition-colors hover:bg-rose-600 hover:text-white"
            aria-label={`Remove ${fileName ?? "file"}`}
          >
            <X className="w-3 h-3" aria-hidden /> Remove
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-[11px] text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
};

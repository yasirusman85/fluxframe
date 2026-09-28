import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useUIStore } from "../../store/ui-store";
import { IconButton } from "../ui/IconButton";

/** Full-screen media preview bound to `useUIStore().lightbox`. */
export const Lightbox: React.FC = () => {
  const item = useUIStore((s) => s.lightbox);
  const closeLightbox = useUIStore((s) => s.closeLightbox);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!item) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => closeRef.current?.focus());
    // Capture phase so the lightbox (top-most layer) wins over any open modal.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      closeLightbox();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown, true);
      restoreFocusRef.current?.focus?.();
    };
  }, [item, closeLightbox]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {item && (
        <motion.div
          key="lightbox"
          data-testid="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={item.title ? `Preview: ${item.title}` : "Media preview"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={closeLightbox}
          className="fixed inset-0 z-[75] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm sm:p-8"
        >
          <IconButton
            ref={closeRef}
            data-testid="lightbox-close"
            label="Close preview"
            icon={<X className="h-5 w-5" />}
            variant="secondary"
            onClick={closeLightbox}
            className="absolute right-4 top-4 z-10 shadow-lg"
          />
          <motion.figure
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-full max-w-full flex-col items-center gap-3"
          >
            {item.kind === "video" ? (
              <video src={item.url} controls autoPlay playsInline className="max-h-[90vh] max-w-full rounded-xl bg-black shadow-2xl" aria-label={item.title ?? "Video preview"}>
                <track kind="captions" srcLang="en" label="No dialogue" src="data:text/vtt,WEBVTT" />
              </video>
            ) : (
              <img src={item.url} alt={item.title ?? "Preview"} className="max-h-[90vh] max-w-full rounded-xl object-contain shadow-2xl" />
            )}
            {item.title && <figcaption className="max-w-xl truncate text-center text-sm text-zinc-300">{item.title}</figcaption>}
          </motion.figure>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

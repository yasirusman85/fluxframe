import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useUIStore } from "../../store/ui-store";
import type { ToastType } from "../../store/ui-store";
import { cn } from "../../lib/cn";

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-brand-400" />,
  error: <AlertCircle className="w-5 h-5 text-rose-400" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
  info: <Info className="w-5 h-5 text-sky-400" />,
};

const BORDERS: Record<ToastType, string> = {
  success: "border-brand-500/40",
  error: "border-rose-500/40",
  warning: "border-amber-500/40",
  info: "border-sky-500/40",
};

export const ToastContainer: React.FC = () => {
  const toasts = useUIStore((s) => s.toasts);
  const dismissToast = useUIStore((s) => s.dismissToast);

  return (
    <div className="fixed bottom-4 right-4 z-[80] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none" aria-live="polite" aria-atomic="false">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            role={toast.type === "error" ? "alert" : "status"}
            data-testid="toast"
            data-toast-type={toast.type}
            className={cn("pointer-events-auto glass flex items-start gap-3 p-3.5 rounded-xl border shadow-2xl text-sm", BORDERS[toast.type])}
          >
            <span className="shrink-0 mt-0.5">{ICONS[toast.type]}</span>
            <div className="flex-1 min-w-0">
              {toast.title && <div className="font-semibold text-zinc-100">{toast.title}</div>}
              <div className="text-zinc-300 leading-snug">{toast.message}</div>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    dismissToast(toast.id);
                  }}
                  className="mt-1.5 text-xs font-semibold text-brand-300 hover:text-brand-200"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button type="button" onClick={() => dismissToast(toast.id)} className="shrink-0 text-zinc-400 hover:text-white transition-colors" aria-label="Dismiss notification">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "../../store/ui-store";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "../../lib/cn";

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={cn(
              "pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-lg text-sm font-medium",
              toast.type === "success" &&
                "bg-zinc-900/90 border-emerald-500/40 text-emerald-300 shadow-emerald-950/40",
              toast.type === "error" &&
                "bg-zinc-900/90 border-red-500/40 text-red-300 shadow-red-950/40",
              toast.type === "info" &&
                "bg-zinc-900/90 border-violet-500/40 text-violet-300 shadow-violet-950/40"
            )}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
              {toast.type === "error" && <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
              {toast.type === "info" && <Info className="w-5 h-5 text-violet-400 shrink-0" />}
              <span className="text-zinc-200">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

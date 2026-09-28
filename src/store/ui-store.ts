import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createId } from "../lib/ids";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration: number;
  action?: ToastAction;
}

export interface ToastOptions {
  type?: ToastType;
  title?: string;
  /** ms; 0 keeps the toast until dismissed. */
  duration?: number;
  action?: ToastAction;
}

export interface LightboxItem {
  url: string;
  title?: string;
  kind: "image" | "video";
}

export interface UIState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  commandPaletteOpen: boolean;
  toasts: ToastItem[];
  lightbox: LightboxItem | null;

  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  addToast: (message: string, options?: ToastOptions) => string;
  dismissToast: (id: string) => void;
  openLightbox: (item: LightboxItem) => void;
  closeLightbox: () => void;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      commandPaletteOpen: false,
      toasts: [],
      lightbox: null,

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

      addToast: (message, options = {}) => {
        const id = createId("toast");
        const duration = options.duration ?? (options.type === "error" ? 6000 : 4000);
        const toast: ToastItem = { id, type: options.type ?? "info", title: options.title, message, duration, action: options.action };
        set((state) => ({ toasts: [...state.toasts.slice(-4), toast] }));
        if (duration > 0) {
          timers.set(
            id,
            setTimeout(() => get().dismissToast(id), duration),
          );
        }
        return id;
      },

      dismissToast: (id) => {
        const timer = timers.get(id);
        if (timer) clearTimeout(timer);
        timers.delete(id);
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      },

      openLightbox: (item) => set({ lightbox: item }),
      closeLightbox: () => set({ lightbox: null }),
    }),
    {
      name: "fluxframe-ui-v1",
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);

/** Convenience for non-React code. */
export const toast = (message: string, options?: ToastOptions) => useUIStore.getState().addToast(message, options);

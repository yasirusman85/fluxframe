import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast, useUIStore } from "../src/store/ui-store";

const ui = () => useUIStore.getState();

beforeEach(() => {
  vi.useFakeTimers();
  useUIStore.setState({ toasts: [], lightbox: null, sidebarCollapsed: false, mobileNavOpen: false, commandPaletteOpen: false });
});

afterEach(() => {
  // Restore spies before swapping the fake timers out, otherwise a spy on
  // `clearTimeout` would be put back on top of the real implementation.
  vi.restoreAllMocks();
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("addToast", () => {
  it("returns an id and defaults to an info toast lasting 4 s", () => {
    const id = ui().addToast("Saved");

    expect(id).toMatch(/^toast_/);
    expect(ui().toasts).toHaveLength(1);
    expect(ui().toasts[0]).toMatchObject({ id, type: "info", message: "Saved", duration: 4000 });
    expect(ui().toasts[0].title).toBeUndefined();
  });

  it("gives error toasts 6 s", () => {
    ui().addToast("Boom", { type: "error" });
    expect(ui().toasts[0].duration).toBe(6000);
  });

  it("keeps success and warning toasts at the 4 s default", () => {
    ui().addToast("Done", { type: "success" });
    ui().addToast("Careful", { type: "warning" });
    expect(ui().toasts.map((t) => t.duration)).toEqual([4000, 4000]);
    expect(ui().toasts.map((t) => t.type)).toEqual(["success", "warning"]);
  });

  it("honours an explicit duration, title and action", () => {
    const onClick = vi.fn();
    ui().addToast("Open it", { duration: 1000, title: "Ready", action: { label: "View", onClick } });

    const item = ui().toasts[0];
    expect(item.duration).toBe(1000);
    expect(item.title).toBe("Ready");
    expect(item.action?.label).toBe("View");
    item.action?.onClick();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("auto-dismisses once the duration elapses", () => {
    ui().addToast("Saved");
    vi.advanceTimersByTime(3999);
    expect(ui().toasts).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(ui().toasts).toHaveLength(0);
  });

  it("keeps a toast with duration 0 until it is dismissed", () => {
    const id = ui().addToast("Sticky", { duration: 0 });
    vi.advanceTimersByTime(60_000);
    expect(ui().toasts).toHaveLength(1);
    ui().dismissToast(id);
    expect(ui().toasts).toHaveLength(0);
  });

  it("retains at most five toasts", () => {
    const ids = Array.from({ length: 7 }, (_, i) => ui().addToast(`Toast ${i}`, { duration: 0 }));
    expect(ui().toasts).toHaveLength(5);
    expect(ui().toasts.map((t) => t.id)).toEqual(ids.slice(2));
    expect(ui().toasts[0].message).toBe("Toast 2");
  });
});

describe("dismissToast", () => {
  it("removes the toast and clears its pending timer", () => {
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");
    const id = ui().addToast("Saved");

    ui().dismissToast(id);

    expect(ui().toasts).toHaveLength(0);
    expect(clearSpy).toHaveBeenCalled();
    vi.advanceTimersByTime(10_000);
    expect(ui().toasts).toHaveLength(0);
  });

  it("does not disturb other toasts", () => {
    const first = ui().addToast("First", { duration: 0 });
    const second = ui().addToast("Second", { duration: 0 });
    ui().dismissToast(first);
    expect(ui().toasts.map((t) => t.id)).toEqual([second]);
  });

  it("ignores unknown ids", () => {
    ui().addToast("Saved", { duration: 0 });
    ui().dismissToast("toast_missing");
    expect(ui().toasts).toHaveLength(1);
  });
});

describe("sidebar, mobile nav and command palette", () => {
  it("toggles the sidebar", () => {
    expect(ui().sidebarCollapsed).toBe(false);
    ui().toggleSidebar();
    expect(ui().sidebarCollapsed).toBe(true);
    ui().toggleSidebar();
    expect(ui().sidebarCollapsed).toBe(false);
  });

  it("sets the sidebar explicitly", () => {
    ui().setSidebarCollapsed(true);
    expect(ui().sidebarCollapsed).toBe(true);
  });

  it("controls the mobile drawer", () => {
    ui().setMobileNavOpen(true);
    expect(ui().mobileNavOpen).toBe(true);
    ui().setMobileNavOpen(false);
    expect(ui().mobileNavOpen).toBe(false);
  });

  it("opens and toggles the command palette", () => {
    ui().setCommandPaletteOpen(true);
    expect(ui().commandPaletteOpen).toBe(true);
    ui().toggleCommandPalette();
    expect(ui().commandPaletteOpen).toBe(false);
  });
});

describe("lightbox", () => {
  it("opens with an item and closes back to null", () => {
    ui().openLightbox({ url: "blob:abc", title: "Neon skyline", kind: "image" });
    expect(ui().lightbox).toEqual({ url: "blob:abc", title: "Neon skyline", kind: "image" });

    ui().openLightbox({ url: "blob:def", kind: "video" });
    expect(ui().lightbox?.kind).toBe("video");

    ui().closeLightbox();
    expect(ui().lightbox).toBeNull();
  });
});

describe("toast() helper", () => {
  it("adds a toast from non-React code", () => {
    const id = toast("Generation failed", { type: "error", title: "Oops" });
    expect(id).toMatch(/^toast_/);
    expect(ui().toasts[0]).toMatchObject({ id, type: "error", title: "Oops", message: "Generation failed", duration: 6000 });
  });

  it("defaults to an info toast", () => {
    toast("Hello");
    expect(ui().toasts[0].type).toBe("info");
  });
});

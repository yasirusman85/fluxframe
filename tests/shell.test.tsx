import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROUTES, routeForPath } from "../src/app/routes";
import { Sidebar } from "../src/components/app-shell/Sidebar";
import { CommandPalette } from "../src/components/app-shell/CommandPalette";
import { useUIStore } from "../src/store/ui-store";

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));

// Only `useNavigate` is stubbed; MemoryRouter, Link and useLocation stay real.
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderSidebar(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar />
    </MemoryRouter>,
  );
}

/** The Modal portals into document.body, so queries go through `screen`. */
function renderPalette() {
  useUIStore.setState({ commandPaletteOpen: true });
  return render(
    <MemoryRouter>
      <CommandPalette />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  useUIStore.setState({ sidebarCollapsed: false, mobileNavOpen: false, commandPaletteOpen: false, toasts: [], lightbox: null });
});

describe("routeForPath", () => {
  it("resolves the navigation entry for every kind of location", () => {
    expect(routeForPath("/")?.id).toBe("explore");
    expect(routeForPath("/create/cinema")?.title).toBe("Cinema Studio");
    expect(routeForPath("/create/lipsync")?.title).toBe("LipSync Studio");
    expect(routeForPath("/apps")?.title).toBe("Creative Apps");
    expect(routeForPath("/account")?.title).toBe("Account");
  });

  it("separates Library from Favorites by query string", () => {
    expect(routeForPath("/projects")?.id).toBe("projects");
    expect(routeForPath("/projects", "?filter=favorites")?.id).toBe("favorites");
    expect(routeForPath("/projects", "?filter=favorites")?.title).toBe("Favorites");
    expect(routeForPath("/projects", "?filter=image")?.id).toBe("projects");
  });

  it("maps project details to the synthetic Project entry and unknown paths to undefined", () => {
    expect(routeForPath("/projects/abc")?.title).toBe("Project");
    expect(routeForPath("/projects/proj_123")?.id).toBe("project");
    expect(routeForPath("/does-not-exist")).toBeUndefined();
  });
});

describe("Sidebar", () => {
  it("renders a nav link for every route", () => {
    renderSidebar();
    expect(screen.getAllByTestId("sidebar")).toHaveLength(1);
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    for (const route of ROUTES) {
      expect(screen.getByTestId(`nav-link-${route.id}`)).toBeInTheDocument();
    }
  });

  it("marks the current studio with aria-current", () => {
    renderSidebar("/create/image");
    expect(screen.getByTestId("nav-link-image")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("nav-link-explore")).not.toHaveAttribute("aria-current");
    expect(screen.getByTestId("nav-link-video")).not.toHaveAttribute("aria-current");
  });

  it("gives Favorites the active state instead of Library on ?filter=favorites", () => {
    renderSidebar("/projects?filter=favorites");
    expect(screen.getByTestId("nav-link-favorites")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("nav-link-projects")).not.toHaveAttribute("aria-current");
  });

  it("keeps Library active on a project detail route", () => {
    renderSidebar("/projects/proj_1");
    expect(screen.getByTestId("nav-link-projects")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("nav-link-favorites")).not.toHaveAttribute("aria-current");
  });
});

describe("CommandPalette", () => {
  it("shows pages and actions before anything is typed", () => {
    renderPalette();
    const items = screen.getAllByTestId("command-palette-item");
    expect(items.length).toBeGreaterThan(ROUTES.length);
    expect(items[0]).toHaveTextContent("Explore");
  });

  it("filters by query and ranks the matching page first", () => {
    renderPalette();
    fireEvent.change(screen.getByTestId("command-palette-input"), { target: { value: "cinema" } });
    const items = screen.getAllByTestId("command-palette-item");
    expect(items[0]).toHaveTextContent("Cinema Studio");
    expect(items.every((item) => item.textContent?.toLowerCase().includes("cinema"))).toBe(false);
  });

  it("navigates with ArrowDown + Enter and closes", () => {
    renderPalette();
    const input = screen.getByTestId("command-palette-input");
    fireEvent.change(input, { target: { value: "cinema" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockNavigate).toHaveBeenCalledWith("/create/cinema");
    expect(useUIStore.getState().commandPaletteOpen).toBe(false);
  });

  it("moves the highlight with the arrow keys", () => {
    renderPalette();
    const input = screen.getByTestId("command-palette-input");
    fireEvent.change(input, { target: { value: "studio" } });
    const items = screen.getAllByTestId("command-palette-item");
    expect(items[0]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getAllByTestId("command-palette-item")[1]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(screen.getAllByTestId("command-palette-item")[0]).toHaveAttribute("aria-selected", "true");
  });

  it("shows an empty state for a query with no matches", () => {
    renderPalette();
    fireEvent.change(screen.getByTestId("command-palette-input"), { target: { value: "zzqqxx" } });
    expect(screen.queryAllByTestId("command-palette-item")).toHaveLength(0);
    expect(screen.getByText(/No results for/i)).toBeInTheDocument();
  });
});

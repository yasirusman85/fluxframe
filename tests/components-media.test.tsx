import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GenerationProject, ProviderSource } from "../src/types/project";
import { useProjectStore } from "../src/store/project-store";
import { ProviderBadge } from "../src/components/media/ProviderBadge";
import { MediaCard } from "../src/components/media/MediaCard";
import { ImageCompare } from "../src/components/media/ImageCompare";
import { OutputCanvas } from "../src/components/media/OutputCanvas";

vi.mock("../src/lib/generation-runner", () => ({
  retryGeneration: vi.fn(() => Promise.resolve()),
  cancelGeneration: vi.fn(),
}));

function makeProject(overrides: Partial<GenerationProject> = {}): GenerationProject {
  const now = new Date().toISOString();
  return {
    id: "proj_media",
    type: "image",
    mediaKind: "image",
    title: "Glass spire",
    prompt: "Futuristic skyscraper built from iridescent glass prisms",
    model: "hyperdetail-ultra",
    aspectRatio: "9:16",
    quality: "high",
    status: "completed",
    progress: 100,
    favorite: false,
    createdAt: now,
    updatedAt: now,
    seed: 7,
    creditCost: 10,
    thumbnailUrl: "https://example.com/spire-thumb.jpg",
    outputUrl: "https://example.com/spire.jpg",
    outputMimeType: "image/jpeg",
    providerSource: "pollinations",
    ...overrides,
  };
}

describe("ProviderBadge", () => {
  it.each<[ProviderSource, string]>([
    ["pollinations", "Pollinations"],
    ["procedural", "Procedural fallback"],
    ["motion-engine", "Motion engine"],
    ["lipsync-engine", "LipSync engine"],
    ["ad-engine", "Ad engine"],
  ])("labels %s as %s", (source, label) => {
    const { unmount } = render(<ProviderBadge source={source} detail="why" />);
    const badge = screen.getByTestId("provider-badge");
    expect(badge).toHaveTextContent(label);
    expect(badge).toHaveAttribute("data-provider", source);
    expect(badge).toHaveAttribute("title", "why");
    unmount();
  });

  it("renders nothing without a source", () => {
    render(<ProviderBadge />);
    expect(screen.queryByTestId("provider-badge")).not.toBeInTheDocument();
  });
});

/** Mirrors how pages render cards: the project comes from the store so updates flow back in. */
function StoreCard({ id, selectable, selected, onToggleSelect }: { id: string; selectable?: boolean; selected?: boolean; onToggleSelect?: (id: string) => void }) {
  const project = useProjectStore((s) => s.projects.find((p) => p.id === id));
  if (!project) return null;
  return <MediaCard project={project} selectable={selectable} selected={selected} onToggleSelect={onToggleSelect} />;
}

describe("MediaCard", () => {
  beforeEach(() => {
    useProjectStore.setState({ projects: [makeProject()], activeJobIds: [] });
  });

  it("renders title and type and toggles favorite", () => {
    render(
      <MemoryRouter>
        <StoreCard id="proj_media" />
      </MemoryRouter>,
    );
    const card = screen.getByTestId("media-card");
    expect(card).toHaveAttribute("data-project-id", "proj_media");
    expect(screen.getByRole("heading", { name: "Glass spire" })).toBeInTheDocument();
    expect(screen.getByText("Image")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Glass spire" })).toHaveAttribute("href", "/projects/proj_media");
    expect(screen.getByTestId("provider-badge")).toHaveTextContent("Pollinations");

    const favorite = screen.getByTestId("media-card-favorite");
    expect(favorite).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(favorite);
    expect(useProjectStore.getState().getProject("proj_media")?.favorite).toBe(true);
    expect(screen.getByTestId("media-card-favorite")).toHaveAttribute("aria-pressed", "true");
  });

  it("shows a checkbox in selection mode and toggles instead of navigating", () => {
    const onToggleSelect = vi.fn();
    render(
      <MemoryRouter>
        <StoreCard id="proj_media" selectable onToggleSelect={onToggleSelect} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("media-card-select")).not.toBeChecked();
    fireEvent.click(screen.getByRole("link"));
    expect(onToggleSelect).toHaveBeenCalledTimes(1);
    expect(onToggleSelect).toHaveBeenCalledWith("proj_media");
    fireEvent.click(screen.getByTestId("media-card-select"));
    expect(onToggleSelect).toHaveBeenCalledTimes(2);
  });

  it("renders a failure overlay with a retry action", () => {
    useProjectStore.setState({ projects: [makeProject({ status: "failed", progress: 0, errorMessage: "Rate limited" })] });
    render(
      <MemoryRouter>
        <StoreCard id="proj_media" />
      </MemoryRouter>,
    );
    expect(screen.getByText("Rate limited")).toBeInTheDocument();
    expect(screen.getByTestId("media-card-retry")).toBeInTheDocument();
    expect(screen.queryByTestId("media-card-download")).not.toBeInTheDocument();
  });
});

describe("ImageCompare", () => {
  it("moves the divider with the arrow keys", () => {
    render(<ImageCompare beforeUrl="https://example.com/a.jpg" afterUrl="https://example.com/b.jpg" beforeLabel="Original" afterLabel="Enhanced" />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuenow", "50");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(slider).toHaveAttribute("aria-valuenow", "55");
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(slider).toHaveAttribute("aria-valuenow", "45");
    fireEvent.keyDown(slider, { key: "End" });
    expect(slider).toHaveAttribute("aria-valuenow", "100");
    fireEvent.keyDown(slider, { key: "Home" });
    expect(slider).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByAltText("Original")).toBeInTheDocument();
    expect(screen.getByAltText("Enhanced")).toBeInTheDocument();
  });
});

describe("OutputCanvas", () => {
  it("renders the empty, processing and ready states", () => {
    const { rerender } = render(
      <MemoryRouter>
        <OutputCanvas emptyTitle="Nothing yet" emptyDescription="Generate something" />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("output-canvas")).toHaveAttribute("data-state", "empty");
    expect(screen.getByText("Nothing yet")).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <OutputCanvas activeJob={makeProject({ id: "job", status: "processing", progress: 30 })} emptyTitle="Nothing yet" emptyDescription="Generate something" />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("output-canvas")).toHaveAttribute("data-state", "processing");
    expect(screen.getByTestId("queue-panel")).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <OutputCanvas project={makeProject()} emptyTitle="Nothing yet" emptyDescription="Generate something" />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("output-canvas")).toHaveAttribute("data-state", "ready");
    expect(screen.getByTestId("output-image")).toHaveAttribute("src", "https://example.com/spire.jpg");
    expect(screen.getByTestId("download-button")).toBeInTheDocument();
    expect(screen.getByTestId("provider-badge")).toHaveTextContent("Pollinations");
  });
});

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GenerationProject } from "../src/types/project";
import { IMAGE_MODELS, PROMPT_ENHANCERS } from "../src/lib/catalog";
import { ModelSelector } from "../src/components/generation/ModelSelector";
import { RatioSelector } from "../src/components/generation/RatioSelector";
import { DurationSelector } from "../src/components/generation/DurationSelector";
import { PromptEnhancer } from "../src/components/generation/PromptEnhancer";
import { QueuePanel } from "../src/components/generation/QueuePanel";
import { cancelGeneration, retryGeneration } from "../src/lib/generation-runner";

vi.mock("../src/lib/generation-runner", () => ({
  retryGeneration: vi.fn(() => Promise.resolve()),
  cancelGeneration: vi.fn(),
}));

function makeProject(overrides: Partial<GenerationProject> = {}): GenerationProject {
  const now = new Date().toISOString();
  return {
    id: "proj_test",
    type: "image",
    mediaKind: "image",
    title: "Neon skyline",
    prompt: "neon skyline at dusk",
    model: "flux-realism-v2",
    aspectRatio: "16:9",
    quality: "high",
    status: "completed",
    progress: 100,
    favorite: false,
    createdAt: now,
    updatedAt: now,
    seed: 1,
    creditCost: 5,
    ...overrides,
  };
}

describe("ModelSelector", () => {
  it("opens on click and selects the second model with ArrowDown + Enter", () => {
    const onChange = vi.fn();
    render(<ModelSelector models={IMAGE_MODELS} value={IMAGE_MODELS[0].id} onChange={onChange} label="Model" />);

    const trigger = screen.getByTestId("model-selector-trigger");
    expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    fireEvent.click(trigger);
    const listbox = screen.getByRole("listbox");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("option")).toHaveLength(IMAGE_MODELS.length);
    expect(screen.getByTestId(`model-option-${IMAGE_MODELS[0].id}`)).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId(`model-option-${IMAGE_MODELS[0].id}`)).toHaveFocus();
    expect(screen.getAllByText("via Pollinations").length).toBeGreaterThan(0);

    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(screen.getByTestId(`model-option-${IMAGE_MODELS[1].id}`)).toHaveFocus();
    fireEvent.keyDown(listbox, { key: "Enter" });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(IMAGE_MODELS[1].id);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes on Escape and on an outside click", () => {
    render(<ModelSelector models={IMAGE_MODELS} value={IMAGE_MODELS[0].id} onChange={() => undefined} />);
    const trigger = screen.getByTestId("model-selector-trigger");

    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("uses a custom root test id and selects with a click", () => {
    const onChange = vi.fn();
    render(<ModelSelector models={IMAGE_MODELS} value={IMAGE_MODELS[0].id} onChange={onChange} testId="cinema-model" />);
    expect(screen.getByTestId("cinema-model")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("model-selector-trigger"));
    fireEvent.click(screen.getByTestId(`model-option-${IMAGE_MODELS[2].id}`));
    expect(onChange).toHaveBeenCalledWith(IMAGE_MODELS[2].id);
  });
});

describe("RatioSelector", () => {
  it("renders all six ratios and marks the selected one with aria-pressed", () => {
    const onChange = vi.fn();
    render(<RatioSelector value="1:1" onChange={onChange} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(6);
    expect(screen.getByTestId("ratio-1:1")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("ratio-16:9")).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByTestId("ratio-9:16"));
    expect(onChange).toHaveBeenCalledWith("9:16");
  });

  it("filters to the given ratios", () => {
    render(<RatioSelector value="16:9" onChange={() => undefined} ratios={["16:9", "9:16"]} />);
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });
});

describe("DurationSelector", () => {
  it("renders the catalog durations and emits numbers", () => {
    const onChange = vi.fn();
    render(<DurationSelector value={5} onChange={onChange} />);
    expect(screen.getByTestId("duration-5")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByTestId("duration-10"));
    expect(onChange).toHaveBeenCalledWith(10);
  });
});

describe("PromptEnhancer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("appends the enhancer once after the loading delay", () => {
    const onEnhance = vi.fn();
    const { rerender } = render(<PromptEnhancer prompt="a cat" onEnhance={onEnhance} />);
    const button = screen.getByTestId("enhance-button");
    expect(button).toBeEnabled();

    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Enhancing…");
    act(() => {
      vi.advanceTimersByTime(400);
    });

    const expected = `A cat, ${PROMPT_ENHANCERS.cinematic}`;
    expect(onEnhance).toHaveBeenCalledTimes(1);
    expect(onEnhance).toHaveBeenCalledWith(expected);

    rerender(<PromptEnhancer prompt={expected} onEnhance={onEnhance} />);
    expect(screen.getByTestId("enhance-button")).toBeDisabled();
  });

  it("is disabled when the prompt is empty and honours the style key", () => {
    const onEnhance = vi.fn();
    const { rerender } = render(<PromptEnhancer prompt="   " onEnhance={onEnhance} />);
    expect(screen.getByTestId("enhance-button")).toBeDisabled();

    rerender(<PromptEnhancer prompt="running shoe" onEnhance={onEnhance} style="product" />);
    fireEvent.click(screen.getByTestId("enhance-button"));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(onEnhance).toHaveBeenCalledWith(`Running shoe, ${PROMPT_ENHANCERS.product}`);
  });
});

describe("QueuePanel", () => {
  it("renders Retry for failed projects and calls retryGeneration", () => {
    const project = makeProject({ status: "failed", progress: 0, errorMessage: "The endpoint timed out." });
    render(<QueuePanel project={project} />);
    const root = screen.getByTestId("queue-panel");
    expect(root).toHaveAttribute("data-status", "failed");
    expect(screen.getByRole("alert")).toHaveTextContent("The endpoint timed out.");
    expect(screen.queryByTestId("queue-cancel")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("queue-retry"));
    expect(retryGeneration).toHaveBeenCalledWith("proj_test");
  });

  it("shows progress and Cancel while processing, and View when completed", () => {
    const onView = vi.fn();
    const { rerender } = render(<QueuePanel project={makeProject({ status: "processing", progress: 42, stageMessage: "Rendering frames" })} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "42");
    expect(screen.getByText("Rendering frames")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("queue-cancel"));
    expect(cancelGeneration).toHaveBeenCalledWith("proj_test");

    rerender(<QueuePanel project={makeProject({ status: "completed" })} onView={onView} />);
    fireEvent.click(screen.getByTestId("queue-view"));
    expect(onView).toHaveBeenCalled();
  });

  it("renders the compact single-row variant", () => {
    render(<QueuePanel project={makeProject({ status: "queued", progress: 0 })} compact />);
    expect(screen.getByTestId("queue-panel")).toHaveAttribute("data-status", "queued");
    expect(screen.getByTestId("queue-cancel")).toBeInTheDocument();
  });
});

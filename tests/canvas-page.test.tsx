import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CanvasPage } from "../src/features/canvas/CanvasPage";
import { useCanvasStore, starterGraph, DEFAULT_VIEWPORT } from "../src/features/canvas/canvas-store";

describe("CanvasPage", () => {
  it("renders the starter graph, toolbar and ports", () => {
    useCanvasStore.setState({ ...starterGraph(), viewport: { ...DEFAULT_VIEWPORT }, selectedNodeId: undefined, selectedEdgeId: undefined });
    render(
      <MemoryRouter>
        <CanvasPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("canvas-root")).toBeInTheDocument();
    expect(screen.getAllByTestId("canvas-node")).toHaveLength(3);
    expect(screen.getAllByTestId("canvas-edge")).toHaveLength(2);
    expect(screen.getAllByTestId("node-port-out")).toHaveLength(2);
    expect(screen.getAllByTestId("node-port-in")).toHaveLength(2);
    expect(screen.getByTestId("canvas-zoom-label")).toHaveTextContent("100%");
    expect(screen.getAllByTestId("node-run")).toHaveLength(2);

    fireEvent.click(screen.getByTestId("canvas-add-text"));
    expect(screen.getAllByTestId("canvas-node")).toHaveLength(4);
    expect(screen.getByTestId("node-text-input")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("canvas-zoom-in"));
    expect(screen.getByTestId("canvas-zoom-label")).toHaveTextContent("125%");

    // Selecting a node fills the inspector.
    fireEvent.click(screen.getByTestId("node-inspector-toggle"));
    expect(screen.getByTestId("node-inspector")).toBeInTheDocument();
  });

  it("renders the empty overlay when the board is cleared", () => {
    useCanvasStore.setState({ nodes: [], edges: [], viewport: { ...DEFAULT_VIEWPORT }, selectedNodeId: undefined, selectedEdgeId: undefined });
    render(
      <MemoryRouter>
        <CanvasPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("canvas-empty")).toBeInTheDocument();
    expect(screen.getByTestId("canvas-run-all")).toBeDisabled();
  });
});

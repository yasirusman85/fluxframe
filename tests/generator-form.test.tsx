import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "../src/components/ui/Button";

describe("Generator Form UI Validation", () => {
  it("disables generate button when prompt is empty", () => {
    const prompt = "";
    render(
      <Button disabled={!prompt.trim()} size="lg">
        Generate Image
      </Button>
    );

    const button = screen.getByRole("button", { name: /generate image/i });
    expect(button).toBeDisabled();
  });

  it("enables generate button when prompt contains text", () => {
    const prompt = "A futuristic glowing crystal tower";
    render(
      <Button disabled={!prompt.trim()} size="lg">
        Generate Image
      </Button>
    );

    const button = screen.getByRole("button", { name: /generate image/i });
    expect(button).not.toBeDisabled();
  });
});

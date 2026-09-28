import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_REFILL_AMOUNT, INITIAL_CREDITS, useCreditStore } from "../src/store/credit-store";

const credits = () => useCreditStore.getState();

beforeEach(() => {
  credits().reset();
  useCreditStore.setState({ topUpOpen: false });
});

describe("initial state", () => {
  it("starts with the welcome grant", () => {
    expect(credits().balance).toBe(INITIAL_CREDITS);
    expect(credits().lifetimeGranted).toBe(INITIAL_CREDITS);
    expect(credits().lifetimeSpent).toBe(0);
    expect(credits().planId).toBe("free");
    expect(credits().topUpOpen).toBe(false);
    expect(credits().history).toHaveLength(1);
    expect(credits().history[0]).toMatchObject({ type: "grant", amount: INITIAL_CREDITS, description: "Welcome credits" });
    expect(DEMO_REFILL_AMOUNT).toBeGreaterThan(0);
  });
});

describe("canAfford", () => {
  it("compares against the balance inclusively", () => {
    expect(credits().canAfford(0)).toBe(true);
    expect(credits().canAfford(INITIAL_CREDITS)).toBe(true);
    expect(credits().canAfford(INITIAL_CREDITS + 1)).toBe(false);
  });
});

describe("spend", () => {
  it("debits the balance and records a transaction", () => {
    expect(credits().spend(50, "Image · Neon skyline", "proj_1")).toBe(true);
    expect(credits().balance).toBe(INITIAL_CREDITS - 50);
    expect(credits().lifetimeSpent).toBe(50);
    expect(credits().history[0]).toMatchObject({ type: "spend", amount: 50, description: "Image · Neon skyline", projectId: "proj_1" });
    expect(credits().history[0].timestamp).toBeTruthy();
  });

  it("refuses to overdraw and leaves everything untouched", () => {
    credits().spend(900, "first", "proj_1");
    const before = credits().history.length;

    expect(credits().spend(200, "too much", "proj_2")).toBe(false);
    expect(credits().balance).toBe(INITIAL_CREDITS - 900);
    expect(credits().lifetimeSpent).toBe(900);
    expect(credits().history).toHaveLength(before);
  });

  it("treats a free generation as a successful no-op", () => {
    expect(credits().spend(0, "free")).toBe(true);
    expect(credits().spend(-5, "negative")).toBe(true);
    expect(credits().balance).toBe(INITIAL_CREDITS);
    expect(credits().history).toHaveLength(1);
  });

  it("allows spending the balance down to exactly zero", () => {
    expect(credits().spend(INITIAL_CREDITS, "all of it")).toBe(true);
    expect(credits().balance).toBe(0);
    expect(credits().canAfford(1)).toBe(false);
  });
});

describe("grant", () => {
  it("credits the balance and lifetime total", () => {
    credits().grant(DEMO_REFILL_AMOUNT, "Demo refill");
    expect(credits().balance).toBe(INITIAL_CREDITS + DEMO_REFILL_AMOUNT);
    expect(credits().lifetimeGranted).toBe(INITIAL_CREDITS + DEMO_REFILL_AMOUNT);
    expect(credits().history[0]).toMatchObject({ type: "grant", amount: DEMO_REFILL_AMOUNT, description: "Demo refill" });
  });

  it("ignores non-positive grants", () => {
    credits().grant(0, "nothing");
    credits().grant(-10, "negative");
    expect(credits().balance).toBe(INITIAL_CREDITS);
    expect(credits().history).toHaveLength(1);
  });
});

describe("refund", () => {
  it("returns the credits and unwinds lifetimeSpent", () => {
    credits().spend(120, "Cinema · Hero orbit", "proj_1");
    credits().refund(120, "Refund · Hero orbit", "proj_1");

    expect(credits().balance).toBe(INITIAL_CREDITS);
    expect(credits().lifetimeSpent).toBe(0);
    expect(credits().history[0]).toMatchObject({ type: "refund", amount: 120, projectId: "proj_1" });
  });

  it("floors lifetimeSpent at zero", () => {
    credits().spend(50, "small spend");
    credits().refund(500, "over-refund");
    expect(credits().lifetimeSpent).toBe(0);
    expect(credits().balance).toBe(INITIAL_CREDITS - 50 + 500);
  });

  it("ignores non-positive refunds", () => {
    credits().refund(0, "nothing");
    expect(credits().history).toHaveLength(1);
  });
});

describe("history", () => {
  it("is newest first", () => {
    credits().spend(10, "spend one");
    credits().grant(20, "grant two");
    credits().refund(5, "refund three");

    expect(credits().history.map((t) => t.type)).toEqual(["refund", "grant", "spend", "grant"]);
    expect(credits().history.map((t) => t.description)).toEqual(["refund three", "grant two", "spend one", "Welcome credits"]);
  });

  it("gives every transaction a unique id", () => {
    for (let i = 0; i < 20; i++) credits().grant(1, `grant ${i}`);
    const ids = credits().history.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toMatch(/^tx_/);
  });

  it("is capped at 200 entries", () => {
    for (let i = 0; i < 210; i++) credits().grant(1, `grant ${i}`);
    expect(credits().history).toHaveLength(200);
    expect(credits().history[0].description).toBe("grant 209");
    expect(credits().history.some((t) => t.description === "Welcome credits")).toBe(false);
  });
});

describe("plan and top-up modal", () => {
  it("switches plans", () => {
    credits().setPlan("pro");
    expect(credits().planId).toBe("pro");
  });

  it("opens and closes the top-up modal", () => {
    credits().openTopUp();
    expect(credits().topUpOpen).toBe(true);
    credits().closeTopUp();
    expect(credits().topUpOpen).toBe(false);
  });

  it("reset restores the starting balance, plan and history", () => {
    credits().spend(300, "spend");
    credits().setPlan("ultra");
    credits().reset();

    expect(credits().balance).toBe(INITIAL_CREDITS);
    expect(credits().lifetimeSpent).toBe(0);
    expect(credits().lifetimeGranted).toBe(INITIAL_CREDITS);
    expect(credits().planId).toBe("free");
    expect(credits().history).toHaveLength(1);
  });
});

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createId } from "../lib/ids";

export const INITIAL_CREDITS = 1000;
export const DEMO_REFILL_AMOUNT = 500;

export interface CreditTransaction {
  id: string;
  type: "spend" | "grant" | "refund";
  amount: number;
  description: string;
  projectId?: string;
  timestamp: string;
}

export interface CreditState {
  balance: number;
  lifetimeGranted: number;
  lifetimeSpent: number;
  planId: string;
  history: CreditTransaction[];
  topUpOpen: boolean;

  canAfford: (amount: number) => boolean;
  /** Returns false (and does nothing) when the balance is insufficient. */
  spend: (amount: number, description: string, projectId?: string) => boolean;
  grant: (amount: number, description: string) => void;
  refund: (amount: number, description: string, projectId?: string) => void;
  setPlan: (planId: string) => void;
  openTopUp: () => void;
  closeTopUp: () => void;
  reset: () => void;
}

const MAX_HISTORY = 200;

function tx(type: CreditTransaction["type"], amount: number, description: string, projectId?: string): CreditTransaction {
  return { id: createId("tx"), type, amount, description, projectId, timestamp: new Date().toISOString() };
}

const initialHistory = () => [tx("grant", INITIAL_CREDITS, "Welcome credits")];

export const useCreditStore = create<CreditState>()(
  persist(
    (set, get) => ({
      balance: INITIAL_CREDITS,
      lifetimeGranted: INITIAL_CREDITS,
      lifetimeSpent: 0,
      planId: "free",
      history: initialHistory(),
      topUpOpen: false,

      canAfford: (amount) => get().balance >= amount,

      spend: (amount, description, projectId) => {
        if (amount <= 0) return true;
        if (get().balance < amount) return false;
        set((state) => ({
          balance: state.balance - amount,
          lifetimeSpent: state.lifetimeSpent + amount,
          history: [tx("spend", amount, description, projectId), ...state.history].slice(0, MAX_HISTORY),
        }));
        return true;
      },

      grant: (amount, description) => {
        if (amount <= 0) return;
        set((state) => ({
          balance: state.balance + amount,
          lifetimeGranted: state.lifetimeGranted + amount,
          history: [tx("grant", amount, description), ...state.history].slice(0, MAX_HISTORY),
        }));
      },

      refund: (amount, description, projectId) => {
        if (amount <= 0) return;
        set((state) => ({
          balance: state.balance + amount,
          lifetimeSpent: Math.max(0, state.lifetimeSpent - amount),
          history: [tx("refund", amount, description, projectId), ...state.history].slice(0, MAX_HISTORY),
        }));
      },

      setPlan: (planId) => set({ planId }),
      openTopUp: () => set({ topUpOpen: true }),
      closeTopUp: () => set({ topUpOpen: false }),
      reset: () => set({ balance: INITIAL_CREDITS, lifetimeGranted: INITIAL_CREDITS, lifetimeSpent: 0, planId: "free", history: initialHistory() }),
    }),
    {
      name: "fluxframe-credits-v2",
      version: 2,
      partialize: (state) => ({
        balance: state.balance,
        lifetimeGranted: state.lifetimeGranted,
        lifetimeSpent: state.lifetimeSpent,
        planId: state.planId,
        history: state.history,
      }),
    },
  ),
);

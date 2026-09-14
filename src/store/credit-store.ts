import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CreditTransaction {
  id: string;
  type: "deduction" | "topup" | "grant";
  amount: number;
  description: string;
  timestamp: string;
}

interface CreditState {
  balance: number;
  totalEarned: number;
  planTier: "prototype" | "starter" | "pro" | "ultra";
  isTopUpModalOpen: boolean;
  history: CreditTransaction[];
  
  // Actions
  deductCredits: (amount: number, description: string) => boolean;
  addCredits: (amount: number, description: string) => void;
  openTopUpModal: () => void;
  closeTopUpModal: () => void;
  resetCredits: () => void;
}

export const useCreditStore = create<CreditState>()(
  persist(
    (set, get) => ({
      balance: 5000,
      totalEarned: 5000,
      planTier: "prototype",
      isTopUpModalOpen: false,
      history: [
        {
          id: "tx-init",
          type: "grant",
          amount: 5000,
          description: "Initial Prototype Mode Credits",
          timestamp: new Date().toISOString(),
        },
      ],

      deductCredits: (amount: number, description: string) => {
        const { balance, history } = get();
        // Dummy credits — decrement but if it goes below 0 auto refill in prototype mode
        const newBalance = Math.max(0, balance - amount);
        const newTx: CreditTransaction = {
          id: `tx-${Date.now()}`,
          type: "deduction",
          amount,
          description,
          timestamp: new Date().toISOString(),
        };
        set({
          balance: newBalance === 0 ? 5000 : newBalance,
          history: [newTx, ...history].slice(0, 50),
        });
        return true;
      },

      addCredits: (amount: number, description: string) => {
        const { balance, totalEarned, history } = get();
        const newTx: CreditTransaction = {
          id: `tx-${Date.now()}`,
          type: "topup",
          amount,
          description,
          timestamp: new Date().toISOString(),
        };
        set({
          balance: balance + amount,
          totalEarned: totalEarned + amount,
          history: [newTx, ...history].slice(0, 50),
        });
      },

      openTopUpModal: () => set({ isTopUpModalOpen: true }),
      closeTopUpModal: () => set({ isTopUpModalOpen: false }),
      resetCredits: () =>
        set({
          balance: 5000,
          history: [
            {
              id: `tx-${Date.now()}`,
              type: "grant",
              amount: 5000,
              description: "Reset Prototype Credits",
              timestamp: new Date().toISOString(),
            },
          ],
        }),
    }),
    {
      name: "higgsfield-credit-store-v1",
    }
  )
);

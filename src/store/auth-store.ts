import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

type AuthMode = "login" | "signup";

interface AuthState {
  users: AuthUser[];
  currentUserId: string | null;
  authOpen: boolean;
  authMode: AuthMode;
  returnTo: string | null;
  openAuth: (mode?: AuthMode, returnTo?: string) => void;
  closeAuth: () => void;
  signUp: (name: string, email: string, password: string) => Promise<AuthUser>;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

async function digest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      users: [],
      currentUserId: null,
      authOpen: false,
      authMode: "login",
      returnTo: null,
      openAuth: (authMode = "login", returnTo) => set({ authOpen: true, authMode, returnTo: returnTo ?? null }),
      closeAuth: () => set({ authOpen: false, returnTo: null }),
      signUp: async (name, email, password) => {
        const cleanEmail = normalizeEmail(email);
        if (get().users.some((user) => user.email === cleanEmail)) throw new Error("An account with this email already exists.");
        const user: AuthUser = {
          id: crypto.randomUUID(),
          name: name.trim(),
          email: cleanEmail,
          passwordHash: await digest(password),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ users: [...state.users, user], currentUserId: user.id, authOpen: false }));
        return user;
      },
      login: async (email, password) => {
        const cleanEmail = normalizeEmail(email);
        const passwordHash = await digest(password);
        const user = get().users.find((candidate) => candidate.email === cleanEmail && candidate.passwordHash === passwordHash);
        if (!user) throw new Error("Incorrect email or password.");
        set({ currentUserId: user.id, authOpen: false });
        return user;
      },
      logout: () => set({ currentUserId: null }),
    }),
    {
      name: "higgsfield-auth-v1",
      partialize: ({ users, currentUserId }) => ({ users, currentUserId }),
    },
  ),
);

export const selectCurrentUser = (state: AuthState) => state.users.find((user) => user.id === state.currentUserId) ?? null;


import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GenerationType } from "../types/project";
import { createId } from "../lib/ids";

export interface ApiKey {
  id: string;
  name: string;
  /** Full key; only the prefix is shown after creation. */
  key: string;
  createdAt: string;
  lastUsedAt?: string;
  revoked: boolean;
}

export interface Preferences {
  autoplayPreviews: boolean;
  defaultStudio: GenerationType;
  showProviderBadges: boolean;
  confirmDeletes: boolean;
}

export interface AccountState {
  displayName: string;
  handle: string;
  email: string;
  bio: string;
  /** 0..360, drives the avatar gradient. */
  avatarHue: number;
  apiKeys: ApiKey[];
  preferences: Preferences;

  updateProfile: (patch: Partial<Pick<AccountState, "displayName" | "handle" | "email" | "bio" | "avatarHue">>) => void;
  createApiKey: (name: string) => ApiKey;
  revokeApiKey: (id: string) => void;
  deleteApiKey: (id: string) => void;
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
}

function generateKey(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return `ff_live_${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}

export function maskApiKey(key: string): string {
  return `${key.slice(0, 12)}…${key.slice(-4)}`;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "FF";
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      displayName: "Yasir Usman",
      handle: "yasirusman85",
      email: "",
      bio: "Building cinematic things with FluxFrame.",
      avatarHue: 160,
      apiKeys: [],
      preferences: {
        autoplayPreviews: true,
        defaultStudio: "cinema",
        showProviderBadges: true,
        confirmDeletes: true,
      },

      updateProfile: (patch) => set((state) => ({ ...state, ...patch })),

      createApiKey: (name) => {
        const apiKey: ApiKey = { id: createId("key"), name: name.trim() || "Untitled key", key: generateKey(), createdAt: new Date().toISOString(), revoked: false };
        set((state) => ({ apiKeys: [apiKey, ...state.apiKeys] }));
        return apiKey;
      },

      revokeApiKey: (id) => set((state) => ({ apiKeys: state.apiKeys.map((k) => (k.id === id ? { ...k, revoked: true } : k)) })),

      deleteApiKey: (id) => set((state) => ({ apiKeys: state.apiKeys.filter((k) => k.id !== id) })),

      setPreference: (key, value) => set((state) => ({ preferences: { ...state.preferences, [key]: value } })),
    }),
    { name: "fluxframe-account-v1" },
  ),
);

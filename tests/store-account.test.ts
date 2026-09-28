import { beforeEach, describe, expect, it } from "vitest";
import { initialsOf, maskApiKey, useAccountStore } from "../src/store/account-store";

const account = () => useAccountStore.getState();

const DEFAULTS = {
  displayName: "Yasir Usman",
  handle: "yasirusman85",
  email: "",
  bio: "Building cinematic things with FluxFrame.",
  avatarHue: 160,
  apiKeys: [],
  preferences: {
    autoplayPreviews: true,
    defaultStudio: "cinema" as const,
    showProviderBadges: true,
    confirmDeletes: true,
  },
};

beforeEach(() => {
  useAccountStore.setState({ ...DEFAULTS, apiKeys: [], preferences: { ...DEFAULTS.preferences } });
});

describe("defaults", () => {
  it("ships with a profile, no API keys and sensible preferences", () => {
    expect(account().displayName).toBe("Yasir Usman");
    expect(account().handle).toBe("yasirusman85");
    expect(account().bio.length).toBeGreaterThan(0);
    expect(account().avatarHue).toBe(160);
    expect(account().apiKeys).toEqual([]);
    expect(account().preferences).toEqual(DEFAULTS.preferences);
  });
});

describe("updateProfile", () => {
  it("patches only the supplied fields", () => {
    account().updateProfile({ displayName: "Ada Lovelace", email: "ada@example.com" });

    expect(account().displayName).toBe("Ada Lovelace");
    expect(account().email).toBe("ada@example.com");
    expect(account().handle).toBe("yasirusman85");
    expect(account().bio).toBe(DEFAULTS.bio);
  });

  it("accepts a new avatar hue and an empty patch", () => {
    account().updateProfile({ avatarHue: 320 });
    expect(account().avatarHue).toBe(320);
    account().updateProfile({});
    expect(account().avatarHue).toBe(320);
    expect(account().displayName).toBe("Yasir Usman");
  });

  it("keeps the store's actions callable afterwards", () => {
    account().updateProfile({ handle: "ada" });
    expect(typeof account().createApiKey).toBe("function");
    expect(account().handle).toBe("ada");
  });
});

describe("createApiKey", () => {
  it("mints a prefixed key and prepends it", () => {
    const first = account().createApiKey("CI pipeline");

    expect(first.key.startsWith("ff_live_")).toBe(true);
    expect(first.key).toHaveLength("ff_live_".length + 32);
    expect(first.key.slice("ff_live_".length)).toMatch(/^[a-z0-9]{32}$/);
    expect(first.name).toBe("CI pipeline");
    expect(first.revoked).toBe(false);
    expect(first.id).toMatch(/^key_/);
    expect(Number.isNaN(Date.parse(first.createdAt))).toBe(false);
    expect(account().apiKeys).toEqual([first]);

    const second = account().createApiKey("Local");
    expect(account().apiKeys.map((k) => k.id)).toEqual([second.id, first.id]);
    expect(second.key).not.toBe(first.key);
  });

  it("trims the name and falls back when it is blank", () => {
    expect(account().createApiKey("  Staging  ").name).toBe("Staging");
    expect(account().createApiKey("   ").name).toBe("Untitled key");
    expect(account().createApiKey("").name).toBe("Untitled key");
  });
});

describe("maskApiKey", () => {
  it("shows the prefix and the last four characters only", () => {
    const key = account().createApiKey("CI").key;
    const masked = maskApiKey(key);

    expect(masked).toBe(`${key.slice(0, 12)}…${key.slice(-4)}`);
    expect(masked.startsWith("ff_live_")).toBe(true);
    expect(masked.endsWith(key.slice(-4))).toBe(true);
    expect(masked).toHaveLength(17);
    expect(masked).not.toBe(key);
  });
});

describe("revokeApiKey / deleteApiKey", () => {
  it("revokes a key without removing it", () => {
    const key = account().createApiKey("CI");
    account().revokeApiKey(key.id);

    expect(account().apiKeys).toHaveLength(1);
    expect(account().apiKeys[0].revoked).toBe(true);
    expect(account().apiKeys[0].key).toBe(key.key);
  });

  it("deletes a key outright", () => {
    const keep = account().createApiKey("Keep");
    const drop = account().createApiKey("Drop");
    account().deleteApiKey(drop.id);

    expect(account().apiKeys.map((k) => k.id)).toEqual([keep.id]);
  });

  it("ignores unknown ids", () => {
    const key = account().createApiKey("CI");
    account().revokeApiKey("key_missing");
    account().deleteApiKey("key_missing");
    expect(account().apiKeys).toEqual([key]);
  });
});

describe("setPreference", () => {
  it("updates one preference and leaves the rest alone", () => {
    account().setPreference("autoplayPreviews", false);

    expect(account().preferences.autoplayPreviews).toBe(false);
    expect(account().preferences.showProviderBadges).toBe(true);
    expect(account().preferences.confirmDeletes).toBe(true);
    expect(account().preferences.defaultStudio).toBe("cinema");
  });

  it("changes the default studio", () => {
    account().setPreference("defaultStudio", "lipsync");
    expect(account().preferences.defaultStudio).toBe("lipsync");
  });
});

describe("initialsOf", () => {
  it("takes the first letter of the first two words", () => {
    expect(initialsOf("Yasir Usman")).toBe("YU");
    expect(initialsOf("ada lovelace byron")).toBe("AL");
    expect(initialsOf("  john   doe  ")).toBe("JD");
  });

  it("returns a single letter for a single word", () => {
    expect(initialsOf("Cher")).toBe("C");
    expect(initialsOf("x")).toBe("X");
  });

  it("falls back to FF when there is no name", () => {
    expect(initialsOf("")).toBe("FF");
    expect(initialsOf("   ")).toBe("FF");
  });
});

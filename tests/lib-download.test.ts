import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadBlob, downloadProject, extensionForMime, filenameForProject } from "../src/lib/download";
import { putAsset } from "../src/lib/asset-store";
import { makeProject } from "./helpers/fixtures";

interface CapturedAnchor {
  href: string;
  download: string;
  rel: string;
  inDocument: boolean;
}

let clicks: CapturedAnchor[] = [];

function installSpies() {
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    clicks.push({ href: this.href, download: this.download, rel: this.rel, inDocument: document.body.contains(this) });
  });
  const createObjectURL = vi.spyOn(URL, "createObjectURL");
  const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL");
  return { click, createObjectURL, revokeObjectURL };
}

let spies: ReturnType<typeof installSpies>;

beforeEach(() => {
  clicks = [];
  spies = installSpies();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("extensionForMime", () => {
  it("maps the formats FluxFrame produces", () => {
    expect(extensionForMime("image/jpeg")).toBe("jpg");
    expect(extensionForMime("image/jpg")).toBe("jpg");
    expect(extensionForMime("image/png")).toBe("png");
    expect(extensionForMime("image/webp")).toBe("webp");
    expect(extensionForMime("image/svg+xml")).toBe("svg");
    expect(extensionForMime("video/mp4")).toBe("mp4");
    expect(extensionForMime("video/webm")).toBe("webm");
    expect(extensionForMime("video/webm;codecs=vp9")).toBe("webm");
    expect(extensionForMime("audio/wav")).toBe("wav");
    expect(extensionForMime("audio/mpeg")).toBe("mp3");
    expect(extensionForMime("audio/mp3")).toBe("mp3");
  });

  it("falls back to the subtype, then to bin", () => {
    expect(extensionForMime("application/pdf")).toBe("pdf");
    expect(extensionForMime("text/plain;charset=utf-8")).toBe("plain");
    expect(extensionForMime(undefined)).toBe("bin");
    expect(extensionForMime("")).toBe("bin");
    expect(extensionForMime("nonsense")).toBe("bin");
  });
});

describe("filenameForProject", () => {
  it("combines the brand, slug, id suffix and extension", () => {
    const project = makeProject({ id: "proj_abc123456789", title: "My Cool Shot!", outputMimeType: "image/jpeg" });
    expect(filenameForProject(project)).toBe("fluxframe-my-cool-shot-456789.jpg");
  });

  it("lets an explicit MIME type win over the stored one", () => {
    const project = makeProject({ id: "proj_zzzzzz", title: "Clip", outputMimeType: "image/jpeg" });
    expect(filenameForProject(project, "video/webm")).toBe("fluxframe-clip-zzzzzz.webm");
  });

  it("falls back to 'untitled' and 'bin' when there is nothing to slug", () => {
    const project = makeProject({ id: "proj_123456", title: "!!!", outputMimeType: undefined });
    expect(filenameForProject(project)).toBe("fluxframe-untitled-123456.bin");
  });
});

describe("downloadBlob", () => {
  it("creates an object URL, clicks an anchor and revokes the URL later", () => {
    vi.useFakeTimers();
    const blob = new Blob(["hello"], { type: "text/plain" });

    downloadBlob(blob, "notes.txt");

    expect(spies.createObjectURL).toHaveBeenCalledTimes(1);
    expect(spies.createObjectURL).toHaveBeenCalledWith(blob);
    expect(spies.click).toHaveBeenCalledTimes(1);
    expect(clicks[0].download).toBe("notes.txt");
    expect(clicks[0].rel).toBe("noopener");
    expect(clicks[0].inDocument).toBe(true);
    expect(document.body.querySelector("a")).toBeNull();

    const objectUrl = spies.createObjectURL.mock.results[0].value as string;
    expect(spies.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10_000);
    expect(spies.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(spies.revokeObjectURL).toHaveBeenCalledWith(objectUrl);
  });
});

describe("downloadProject", () => {
  it("prefers a stored asset over the output URL", async () => {
    const blob = new Blob([new Uint8Array(64)], { type: "image/png" });
    const assetId = await putAsset(blob, "image");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const project = makeProject({
      id: "proj_aaaaaa",
      title: "Stored output",
      outputAssetId: assetId,
      outputUrl: "https://example.test/remote.jpg",
      outputMimeType: "image/jpeg",
    });

    await downloadProject(project);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(clicks).toHaveLength(1);
    expect(clicks[0].download).toBe("fluxframe-stored-output-aaaaaa.png");
    expect(spies.createObjectURL).toHaveBeenCalledWith(blob);
  });

  it("falls back to the output URL when the asset is gone", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Blob([new Uint8Array(8)], { type: "video/webm" }), { status: 200, headers: { "content-type": "video/webm" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const project = makeProject({
      id: "proj_bbbbbb",
      title: "Missing asset",
      outputAssetId: "asset_does_not_exist",
      outputUrl: "https://example.test/clip.webm",
    });

    await downloadProject(project);

    expect(fetchMock).toHaveBeenCalledWith("https://example.test/clip.webm", { mode: "cors" });
    expect(clicks).toHaveLength(1);
    expect(clicks[0].download).toBe("fluxframe-missing-asset-bbbbbb.webm");
  });

  it("handles data URLs without a CORS request", async () => {
    const project = makeProject({
      id: "proj_cccccc",
      title: "Data url",
      outputAssetId: undefined,
      outputUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      outputMimeType: "image/png",
    });

    await downloadProject(project);

    expect(clicks).toHaveLength(1);
    expect(clicks[0].download).toBe("fluxframe-data-url-cccccc.png");
  });

  it("opens the URL in a new tab when the fetch fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("blocked by CORS"));
    vi.stubGlobal("fetch", fetchMock);
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    const project = makeProject({ outputAssetId: undefined, outputUrl: "https://example.test/blocked.jpg" });

    await downloadProject(project);

    expect(openSpy).toHaveBeenCalledWith("https://example.test/blocked.jpg", "_blank", "noopener");
    expect(clicks).toHaveLength(0);
  });

  it("opens a new tab when the response is not ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("nope", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    const project = makeProject({ outputAssetId: undefined, outputUrl: "https://example.test/missing.jpg" });

    await downloadProject(project);

    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it("throws when the project has no output at all", async () => {
    const project = makeProject({ outputAssetId: undefined, outputUrl: undefined });
    await expect(downloadProject(project)).rejects.toThrow(/no output/i);
    expect(clicks).toHaveLength(0);
  });
});

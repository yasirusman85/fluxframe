import { describe, it, vi } from "vitest";
import { writeFileSync } from "node:fs";
import * as runner from "../src/lib/generation-runner";
import { productNameFromUrl } from "../src/lib/catalog";
import { slugify, timeAgo, formatBytes } from "../src/lib/format";

vi.mock("../src/lib/generation-runner", { spy: true });
vi.mock("../src/lib/pipelines", () => ({ getPipeline: vi.fn() }));

describe("probe2", () => {
  it("prints environment facts", async () => {
    const facts: Record<string, unknown> = {};
    facts.windowIsGlobal = window === (globalThis as unknown);
    vi.stubGlobal("probeValue", 42);
    facts.stubInWindow = "probeValue" in window;
    facts.stubOnGlobal = (globalThis as unknown as { probeValue?: number }).probeValue;
    facts.stubViaWindow = (window as unknown as { probeValue?: number }).probeValue;
    vi.unstubAllGlobals();
    facts.friendlyErrorIsMock = vi.isMockFunction(runner.friendlyError);
    facts.friendlyErrorPassThrough = runner.friendlyError(new Error("boom"));
    try {
      const r = await fetch("data:image/png;base64,iVBORw0KGgo=");
      const b = await r.blob();
      facts.dataUrlBlobType = b.type;
      facts.dataUrlBlobSize = b.size;
    } catch (e) {
      facts.dataUrlErr = String(e);
    }
    try {
      const res = new Response(new Blob([new Uint8Array(100)], { type: "image/jpeg" }), { status: 200, headers: { "content-type": "image/jpeg" } });
      facts.responseCt = res.headers.get("content-type");
      facts.responseOk = res.ok;
      facts.responseBlobType = (await res.blob()).type;
    } catch (e) {
      facts.responseErr = String(e);
    }
    facts.productNames = {
      slugYear: productNameFromUrl("https://shop.example.com/products/aero-runner-2024"),
      bareDomain: productNameFromUrl("nike.com"),
      wwwDomain: productNameFromUrl("www.acme.com/"),
      empty: productNameFromUrl(""),
      spaces: productNameFromUrl("not a url"),
      colons: productNameFromUrl("https://::::"),
      html: productNameFromUrl("https://store.com/items/widget.html"),
      short: productNameFromUrl("https://store.com/a"),
      underscore: productNameFromUrl("https://x.io/p/pro_max+ultra"),
    };
    facts.slugs = {
      leading: slugify("--foo__bar--"),
      accents: slugify("Héllo Wörld!"),
      emoji: slugify("Emoji 🚀 rocket"),
      long: slugify("a b ".repeat(30), 20),
      punct: slugify("Hello, World!"),
    };
    const now = Date.UTC(2024, 2, 15, 12, 0, 0);
    facts.timeAgo = {
      s44: timeAgo(new Date(now - 44_000).toISOString(), now),
      s45: timeAgo(new Date(now - 45_000).toISOString(), now),
      d10: timeAgo(new Date(now - 10 * 86_400_000).toISOString(), now),
    };
    facts.bytes = { mb5: formatBytes(5 * 1024 * 1024), kb10: formatBytes(10240), tb3: formatBytes(3 * 1024 ** 4), k1536: formatBytes(1536) };
    const t0 = Date.now();
    await new Promise<number>((resolve) => requestAnimationFrame(resolve));
    facts.rafMs = Date.now() - t0;
    vi.useFakeTimers();
    facts.perfUnderFake = typeof performance.now();
    vi.useRealTimers();
    writeFileSync("/private/tmp/claude-501/-Users-dev-Documents-higgsfield/6d3ed6de-d500-4efd-acc7-d029f75c08ea/scratchpad/facts2.json", JSON.stringify(facts, null, 2));
  });
});

/** The base of legal works: rules every preload row must meet, the
 *  us-government tag, URL-as-citation uploads, and no fetch anywhere in the
 *  works or upload code. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import classics from "../fixtures/programme-classics.json";
import preload from "../fixtures/works-preload.json";
import { catalogueOf, type ProgrammeFile } from "../src/lib/programme";
import { acceptUpload, allowsFullText, hasFullText, type WorksFile } from "../src/lib/works";

const WORKS = (preload as WorksFile).works;
const ROOT = join(__dirname, "..");

describe("base works rules", () => {
  it("every row with a source_url or attribution names its source with https and a public-domain or us-government licence", () => {
    for (const w of WORKS) {
      if (w.source_url || w.attribution) {
        expect(w.attribution, w.id).toMatch(/https:\/\//);
        expect(w.source_url, w.id).toMatch(/^https:\/\//);
        expect(["public-domain", "us-government"], w.id).toContain(w.license);
      }
    }
  });

  it("a body is an excerpt, never a book: every text is short", () => {
    for (const w of WORKS) if (w.text) expect(w.text.split(/\s+/).length, w.id).toBeLessThanOrEqual(400);
  });

  it("us-government is a documented tag that allows full text", () => {
    expect(allowsFullText("us-government")).toBe(true);
    const spec = readFileSync(join(ROOT, "..", "specs", "WORKS.md"), "utf8");
    expect(spec).toMatch(/us-government/);
    expect(spec).toMatch(/17 U\.S\.C\./);
  });

  it("the classics catalogue has the six fields and only the three declared bridges; metrology stands alone", () => {
    const cat = catalogueOf([classics as ProgrammeFile]);
    expect([...cat.fields.keys()].sort()).toEqual(["electricity", "electromagnetism", "heredity", "metrology", "natural-history", "optics"]);
    const edges = [...cat.bridges.values()].map((b) => [b.left, b.right].sort().join("—")).sort();
    expect(edges).toEqual(["electricity—electromagnetism", "electromagnetism—optics", "heredity—natural-history"]);
    expect([...cat.bridges.values()].some((b) => b.left === "metrology" || b.right === "metrology")).toBe(false);
  });
});

describe("upload with a URL", () => {
  it("a URL without text is a stub (nothing fetched); a URL with text and rights is a body", () => {
    const stub = acceptUpload({ title: "A cited work", license: "public-domain", claimsBytes: false, source_url: "https://www.gutenberg.org/ebooks/0" });
    expect(stub.ok).toBe(true);
    if (stub.ok) {
      expect(stub.work.source_url).toBe("https://www.gutenberg.org/ebooks/0");
      expect(stub.work.bytes).toBe(false);
      expect(hasFullText(stub.work)).toBe(false);
    }
    const body = acceptUpload({ title: "A cited excerpt", license: "us-government", claimsBytes: false, rights: true, source_url: "https://www.nist.gov/", text: "an excerpt the tenant has rights to" });
    expect(body.ok).toBe(true);
    if (body.ok) expect(hasFullText(body.work)).toBe(true);
  });
});

describe("no fetch", () => {
  it("the works, bench, note and upload code never call fetch, XMLHttpRequest or a download API", () => {
    const files = ["src/lib/works.ts", "src/lib/bench.ts", "src/lib/analysisNote.ts", "src/lib/metrics.ts", "src/lib/programme.ts", "src/components/WorksPanel.tsx", "src/components/BenchActions.tsx", "src/components/ResultCard.tsx", "src/state/ProgrammeContext.tsx"];
    for (const f of files) {
      const text = readFileSync(join(ROOT, f), "utf8");
      expect(text, f).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|navigator\.sendBeacon|new WebSocket|import\(\s*["']http/);
    }
  });
});

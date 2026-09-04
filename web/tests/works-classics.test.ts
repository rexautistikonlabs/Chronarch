/** The base of public-domain / U.S. government works: the brief's strings
 *  exactly, and Compare across the classics bridges yields notes with both
 *  excerpts and a pinned Jaccard computed from these exact texts. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import classics from "../fixtures/programme-classics.json";
import toy from "../fixtures/programme-toy.json";
import zero from "../fixtures/programme-zero.json";
import preload from "../fixtures/works-preload.json";
import { buildNote } from "../src/lib/analysisNote";
import { runAction } from "../src/lib/bench";
import { comparePair } from "../src/lib/metrics";
import { catalogueOf, type ProgrammeFile } from "../src/lib/programme";
import { worksMap, type WorksFile } from "../src/lib/works";

const FILES = [zero as ProgrammeFile, toy as ProgrammeFile, classics as ProgrammeFile];
const cat = catalogueOf(FILES);
const map = worksMap((preload as WorksFile).works);
const norm = (s: string) => s.replace(/\s+/g, " ").trim();

const BRIEF: Record<string, { license: string; field: string; source_url: string; text: string }> = {
  "work-darwin-1859": {"license": "public-domain", "field": "natural-history", "source_url": "https://www.gutenberg.org/ebooks/1228", "text": "When on board H.M.S. 'Beagle,' as naturalist, I was much struck with certain facts in the distribution of the inhabitants of South America, and in the geological relations of the present to the past inhabitants of that continent. These facts seemed to me to throw some light on the origin of species—that mystery of mysteries, as it has been called by one of our greatest philosophers."},
  "work-newton-opticks": {"license": "public-domain", "field": "optics", "source_url": "https://www.gutenberg.org/ebooks/33504", "text": "By the Rays of Light I understand its least Parts, and those as well Successive in the same Lines, as Contemporary in several Lines."},
  "work-faraday-ere-v1": {"license": "public-domain", "field": "electricity", "source_url": "https://www.gutenberg.org/ebooks/14986", "text": "I have been induced by various circumstances to collect in One Volume the Fourteen Series of Experimental Researches in Electricity, which have appeared in the Philosophical Transactions during the last seven years."},
  "work-maxwell-elem": {"license": "public-domain", "field": "electromagnetism", "source_url": "https://www.gutenberg.org/ebooks/69914", "text": "The aim of the following treatise is different from that of my larger treatise on electricity and magnetism."},
  "work-mendel-1866-de": {"license": "public-domain", "field": "heredity", "source_url": "https://www.gutenberg.org/ebooks/40854", "text": "Einleitende Bemerkungen. Künstliche Befruchtungen, welche an Zierpflanzen deshalb vorgenommen wurden, um neue Farben-Varianten zu erzielen, waren die Veranlassung zu den Versuchen, die hier besprochen werden sollen."},
  "work-nist-tn1297": {"license": "us-government", "field": "metrology", "source_url": "https://www.nist.gov/pml/nist-technical-note-1297", "text": "Guidelines for Evaluating and Expressing the Uncertainty of NIST Measurement Results."},
};

describe("the six base rows are the brief's strings", () => {
  for (const [id, row] of Object.entries(BRIEF)) {
    it(id, () => {
      const w = map.get(id)!;
      expect(w).toBeTruthy();
      expect(w.source).toBe("preload");
      expect(w.bytes).toBe("present");
      expect(w.license).toBe(row.license);
      expect(["public-domain", "us-government"]).toContain(w.license);
      expect(w.field).toBe(row.field);
      expect(w.source_url).toBe(row.source_url);
      expect(w.source_url).toMatch(/^https:\/\//);
      expect(w.attribution).toMatch(/https:\/\//);
      expect(norm(w.text!)).toBe(norm(row.text)); // exact, whitespace-normalised only
    });
  }
  it("the Programme Zero stand-ins stay", () => {
    expect(map.get("work-pz-ledger-structure")?.text).toMatch(/An assumption ledger/);
    expect(map.get("work-pz-register-structure")?.text).toMatch(/A falsification register/);
  });
});

describe("Compare across the classics bridges", () => {
  it("Darwin + Mendel (natural-history — heredity): a match note with both excerpts and the pinned Jaccard", () => {
    const r = runAction("compare", [map.get("work-darwin-1859")!, map.get("work-mendel-1866-de")!], cat, FILES, map);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.child.kind).toBe("match");
    expect(r.child.path).toEqual(["bridge-natural-history-heredity"]);
    expect(r.metrics).not.toBeNull();
    expect(r.metrics!.leftCount).toBe(50);
    expect(r.metrics!.rightCount).toBe(26);
    expect(r.metrics!.shared).toHaveLength(0);
    expect(r.metrics!.jaccard).toBeCloseTo(0 / 76, 12);
    const note = buildNote(r, map, FILES);
    expect(note.appendix.snippets.map((s) => s.text).join(" ")).toMatch(/When on board H\.M\.S\. 'Beagle,'/);
    expect(note.appendix.snippets.map((s) => s.text).join(" ")).toMatch(/Einleitende Bemerkungen\./);
    expect(note.findings[0]!.cites).toContain("metric:jaccard");
    expect(comparePair(map.get("work-darwin-1859")!.text!, map.get("work-mendel-1866-de")!.text!).jaccard).toBe(r.metrics!.jaccard);
  });

  it("Faraday + Maxwell (electricity — electromagnetism): a match note with both excerpts", () => {
    const r = runAction("compare", [map.get("work-faraday-ere-v1")!, map.get("work-maxwell-elem")!], cat, FILES, map);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.child.path).toEqual(["bridge-electricity-electromagnetism"]);
    expect(r.metrics!.shared).toHaveLength(3);
    expect(r.metrics!.jaccard).toBeCloseTo(3 / 39, 12);
    const note = buildNote(r, map, FILES);
    const snippets = note.appendix.snippets.map((s) => s.text).join(" ");
    expect(snippets).toMatch(/I have been induced by various circumstances/);
    expect(snippets).toMatch(/The aim of the following treatise/);
  });

  it("Darwin + the arXiv stub → STUB_NO_FULLTEXT (a body is missing before any bridge is asked for)", () => {
    const r = runAction("compare", [map.get("work-darwin-1859")!, map.get("work-arxiv-style-example")!], cat, FILES, map);
    expect(r).toMatchObject({ ok: false, code: "STUB_NO_FULLTEXT" });
  });

  it("NIST TN 1297 stands alone: metrology has no bridge, and a one-field job needs none", () => {
    expect([...cat.bridges.values()].some((b) => b.left === "metrology" || b.right === "metrology")).toBe(false);
    const alone = runAction("compare", [map.get("work-nist-tn1297")!, map.get("work-darwin-1859")!], cat, FILES, map);
    expect(alone).toMatchObject({ ok: false, code: "NO_BRIDGE" });
  });
});

describe("no fetch in src", () => {
  it("nothing under src/ calls fetch, XMLHttpRequest or a socket", () => {
    const root = join(__dirname, "..", "src");
    const walk = (d: string, out: string[] = []): string[] => {
      for (const n of readdirSync(d)) {
        const p = join(d, n);
        if (statSync(p).isDirectory()) walk(p, out);
        else if (/\.tsx?$/.test(n)) out.push(p);
      }
      return out;
    };
    for (const f of walk(root)) {
      expect(readFileSync(f, "utf8"), relative(root, f)).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|new WebSocket|sendBeacon/);
    }
  });
});

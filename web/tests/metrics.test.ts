/** Deterministic token metrics; the two Programme Zero stand-ins are pinned. */
import { describe, expect, it } from "vitest";

import toy from "../fixtures/programme-toy.json";
import zero from "../fixtures/programme-zero.json";
import preload from "../fixtures/works-preload.json";
import { runAction } from "../src/lib/bench";
import { comparePair, jaccard, percent, snippet, tokenize } from "../src/lib/metrics";
import { catalogueOf, type ProgrammeFile } from "../src/lib/programme";
import { worksMap, type WorksFile } from "../src/lib/works";

const WORKS = (preload as WorksFile).works;
const map = worksMap(WORKS);
const FILES = [zero as ProgrammeFile, toy as ProgrammeFile];
const cat = catalogueOf(FILES);

describe("metrics", () => {
  it("tokenizes to lowercase [a-z0-9]+ sets", () => {
    expect([...tokenize("The Bridge, the bridge! 42 v2.0")].sort()).toEqual(["0", "42", "bridge", "the", "v2"]);
    expect(tokenize("")).toEqual(new Set());
  });

  it("Jaccard is set overlap over union; empty vs empty is 0", () => {
    expect(jaccard(new Set(["a", "b"]), new Set(["b", "c"]))).toBeCloseTo(1 / 3, 12);
    expect(jaccard(new Set(), new Set())).toBe(0);
    expect(percent(1 / 3)).toBe("33%");
  });

  it("the two Programme Zero stand-in bodies are pinned: 15 shared of 95 → 0.15789…", () => {
    const a = map.get("work-pz-ledger-structure")!.text!;
    const b = map.get("work-pz-register-structure")!.text!;
    const m = comparePair(a, b);
    expect(m.leftCount).toBe(52);
    expect(m.rightCount).toBe(58);
    expect(m.shared).toHaveLength(15);
    expect(m.shared.length + m.onlyLeft.length + m.onlyRight.length).toBe(95);
    expect(m.jaccard).toBeCloseTo(15 / 95, 12);
    expect(percent(m.jaccard)).toBe("16%");
    expect(comparePair(a, b)).toEqual(m); // same inputs → same outputs
    expect(comparePair(b, a).jaccard).toBe(m.jaccard); // symmetric
    expect(m.shared).toEqual([...m.shared].sort()); // deterministic order
  });

  it("bodies are ≤ 80 words, written for this repository; stubs have no text", () => {
    for (const w of WORKS) {
      if (w.bytes === "present") {
        expect(w.text, w.id).toBeTruthy();
        expect(w.text!.split(/\s+/).length, w.id).toBeLessThanOrEqual(80);
      } else {
        expect(w.text, w.id).toBeUndefined();
      }
    }
  });

  it("no percent is invented: a stub parent yields no metrics", () => {
    const r = runAction("analyze", [map.get("work-stub-doi-example")!, map.get("work-stub-title-only")!], cat, FILES, map);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.metrics).toBeNull();
      expect(r.question).toMatch(/could stand beside/);
      expect(r.parents.every((p) => p.snippet === null)).toBe(true);
    }
    const c = runAction("converge", [map.get("work-pz-ledger-structure")!, map.get("work-pz-register-structure")!], cat, FILES, map);
    expect(c.ok).toBe(true);
    if (c.ok) {
      expect(c.metrics?.jaccard).toBeCloseTo(15 / 95, 12);
      expect(c.parents[0]!.snippet!.length).toBeLessThanOrEqual(161);
      expect(c.question).toBeNull();
    }
  });

  it("snippet is the first 160 characters, whitespace collapsed", () => {
    expect(snippet("a  b\n c")).toBe("a b c");
    const long = "x".repeat(200);
    expect(snippet(long)).toHaveLength(161);
    expect(snippet(long).endsWith("…")).toBe(true);
  });
});

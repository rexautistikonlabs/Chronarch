/** Only legal works enter RexMetrix (specs/WORKS.md). */
import { describe, expect, it } from "vitest";

import toy from "../fixtures/programme-toy.json";
import zero from "../fixtures/programme-zero.json";
import childFixture from "../fixtures/synthesis-child.json";
import preload from "../fixtures/works-preload.json";
import { catalogueOf, validateChild, type ChildPin, type ProgrammeFile } from "../src/lib/programme";
import { acceptUpload, allowsFullText, FULLTEXT_LICENSES, hasFullText, LICENSES, validateWork, worksMap, type Work, type WorksFile } from "../src/lib/works";

const WORKS = (preload as WorksFile).works;
const cat = catalogueOf([zero as ProgrammeFile, toy as ProgrammeFile]);
const CHILD = childFixture as ChildPin;

describe("preload fixture", () => {
  it("is small, hand-written, and every row has a licence and source preload", () => {
    expect(WORKS.length).toBeGreaterThan(0);
    expect(WORKS.length).toBeLessThanOrEqual(12);
    for (const w of WORKS) {
      expect(LICENSES).toContain(w.license);
      expect(w.source).toBe("preload");
      expect(w.id && w.title).toBeTruthy();
      expect(() => validateWork(w)).not.toThrow();
    }
  });

  it("no row is all-rights-reserved with bytes present; bytes is only ever a flag", () => {
    for (const w of WORKS) {
      expect(w.license === "all-rights-reserved" && w.bytes === "present").toBe(false);
      expect([undefined, false, "present"]).toContain(w.bytes);
    }
    expect(JSON.stringify(preload)).not.toMatch(/%PDF|base64|application\/pdf/i);
  });

  it("carries Programme Zero stand-ins (structure only), a toy stand-in, and obviously legal stubs", () => {
    const pz = WORKS.filter((w) => w.programme === "programme-zero");
    expect(pz.length).toBeGreaterThanOrEqual(1);
    expect(pz.length).toBeLessThanOrEqual(2);
    for (const w of pz) expect(w.title).toMatch(/structure only/);
    expect(WORKS.some((w) => w.programme === "programme-toy")).toBe(true);
    expect(WORKS.some((w) => w.license === "public-domain")).toBe(true);
    expect(WORKS.some((w) => w.license === "arxiv-nonexclusive" && w.bytes === false)).toBe(true);
    expect(WORKS.some((w) => w.license === "stub-metadata" && w.oa === false && w.bytes === false)).toBe(true);
    expect(JSON.stringify(WORKS)).not.toMatch(/zone[- ]?[1-8]\b|"scores?":|chapter \d/i);
  });
});

describe("licence law", () => {
  it("full text is allowed only under the five open licences", () => {
    expect([...FULLTEXT_LICENSES].sort()).toEqual(["arxiv-nonexclusive", "cc-by-4.0", "cc0", "mit", "public-domain"]);
    expect(allowsFullText("all-rights-reserved")).toBe(false);
    expect(allowsFullText("stub-metadata")).toBe(false);
  });

  it("validateWork: reserved + bytes → FULLTEXT_FORBIDDEN; no licence → LICENSE_MISSING; stubs are stubs", () => {
    expect(() => validateWork({ id: "x", title: "x", license: "all-rights-reserved", oa: false, source: "upload", bytes: "present" })).toThrow(/FULLTEXT_FORBIDDEN/);
    expect(() => validateWork({ id: "x", title: "x", oa: false, source: "upload" } as Partial<Work>)).toThrow(/LICENSE_MISSING/);
    expect(validateWork({ id: "x", title: "x", license: "stub-metadata", oa: false, source: "index", bytes: false })).toBe("stub");
    expect(validateWork({ id: "x", title: "x", license: "cc0", oa: true, source: "upload", bytes: "present" })).toBe("body");
    expect(hasFullText({ id: "x", title: "x", license: "cc-by-4.0", oa: false, source: "upload", bytes: "present" })).toBe(false); // oa=false is a stub even with a flag
  });
});

describe("acceptUpload (model only)", () => {
  it("reserved + bytes → FULLTEXT_FORBIDDEN", () => {
    const r = acceptUpload({ title: "A paywalled paper", license: "all-rights-reserved", claimsBytes: true, rights: true });
    expect(r).toMatchObject({ ok: false, code: "FULLTEXT_FORBIDDEN" });
  });
  it("missing licence → LICENSE_MISSING", () => {
    expect(acceptUpload({ title: "Untitled", license: null, claimsBytes: false })).toMatchObject({ ok: false, code: "LICENSE_MISSING" });
    expect(acceptUpload({ title: "Untitled", license: "not-a-licence", claimsBytes: false })).toMatchObject({ ok: false, code: "LICENSE_MISSING" });
  });
  it("bytes claimed without the rights declaration → RIGHTS_UNDECLARED", () => {
    expect(acceptUpload({ title: "Mine", license: "cc-by-4.0", claimsBytes: true, rights: false })).toMatchObject({ ok: false, code: "RIGHTS_UNDECLARED" });
  });
  it("a legal upload becomes an upload-source work; reserved metadata without bytes is a citation", () => {
    const a = acceptUpload({ title: "My cc-by preprint", license: "cc-by-4.0", claimsBytes: true, rights: true });
    expect(a.ok).toBe(true);
    if (a.ok) {
      expect(a.work).toMatchObject({ source: "upload", license: "cc-by-4.0", bytes: "present", oa: true, rights_declared: true });
      expect(hasFullText(a.work)).toBe(true);
    }
    const b = acceptUpload({ title: "A reserved paper, cited only", license: "all-rights-reserved", claimsBytes: false });
    expect(b.ok).toBe(true);
    if (b.ok) expect(hasFullText(b.work)).toBe(false);
  });
});

describe("synthesis with work parents", () => {
  const legal = (): ChildPin => JSON.parse(JSON.stringify(CHILD));
  const works = worksMap(WORKS);

  it("the fixture child cites a cc-by stand-in body and is legal", () => {
    expect(CHILD.parents[0]?.work).toBe("work-pz-ledger-structure");
    expect(validateChild(cat, CHILD, works).bridges).toHaveLength(3);
  });

  it("a question may cite a stub; a couple job with a stub parent → STUB_NO_FULLTEXT", () => {
    const q = legal();
    q.parents[1]!.work = "work-stub-doi-example";
    expect(q.kind).toBe("question");
    expect(() => validateChild(cat, q, works)).not.toThrow();
    const c = legal();
    c.kind = "couple";
    c.parents[1]!.work = "work-stub-doi-example";
    expect(() => validateChild(cat, c, works)).toThrow(/STUB_NO_FULLTEXT/);
    const m = legal();
    m.kind = "match";
    m.parents[1]!.work = "work-arxiv-style-example"; // open licence but no bytes: still a citation
    expect(() => validateChild(cat, m, works)).toThrow(/STUB_NO_FULLTEXT/);
  });

  it("a parent citing a reserved work with bytes present → FULLTEXT_FORBIDDEN; unknown work → UNKNOWN_WORK", () => {
    const bad = new Map(works);
    bad.set("work-pirate", { id: "work-pirate", title: "x", license: "all-rights-reserved", oa: false, source: "upload", bytes: "present" });
    const c = legal();
    c.parents[1]!.work = "work-pirate";
    expect(() => validateChild(cat, c, bad)).toThrow(/FULLTEXT_FORBIDDEN/);
    const u = legal();
    u.parents[1]!.work = "work-nowhere";
    expect(() => validateChild(cat, u, works)).toThrow(/UNKNOWN_WORK/);
    expect(() => validateChild(cat, u)).toThrow(/UNKNOWN_WORK/);
  });
});

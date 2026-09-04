/** The AnalysisNote is built in code, cites everything, invents nothing. */
import { describe, expect, it } from "vitest";

import toy from "../fixtures/programme-toy.json";
import zero from "../fixtures/programme-zero.json";
import preload from "../fixtures/works-preload.json";
import { buildNote, IS_NOT_ALWAYS, noteBanHits } from "../src/lib/analysisNote";
import { runAction } from "../src/lib/bench";
import { catalogueOf, type ProgrammeFile } from "../src/lib/programme";
import { worksMap, type WorksFile } from "../src/lib/works";

const FILES = [zero as ProgrammeFile, toy as ProgrammeFile];
const cat = catalogueOf(FILES);
const map = worksMap((preload as WorksFile).works);
const pick = (...ids: string[]) => ids.map((id) => map.get(id)!);
const ok = (r: ReturnType<typeof runAction>) => { if (!r.ok) throw new Error(r.code); return r; };

describe("buildNote", () => {
  it("is pure: same inputs, same note; no network in this module", () => {
    const r = ok(runAction("converge", pick("work-pz-ledger-structure", "work-pz-register-structure"), cat, FILES, map));
    const n1 = buildNote(r, map, FILES);
    const n2 = buildNote(r, map, FILES);
    expect(n1).toEqual(n2);
    expect(JSON.stringify(n1)).not.toMatch(/https?:\/\//);
  });

  it("Converge of the two Programme Zero stand-ins: overlap findings each cite, assumptions copied from the fixture, is_not complete", () => {
    const r = ok(runAction("converge", pick("work-pz-ledger-structure", "work-pz-register-structure"), cat, FILES, map));
    const n = buildNote(r, map, FILES);
    expect(n.job).toBe("converge");
    expect(n.kind).toBe("overlap");
    expect(n.objects.map((o) => o.role)).toEqual(["ledger", "register"]);
    expect(n.findings.length).toBeGreaterThanOrEqual(3);
    for (const f of n.findings) expect(f.cites.length, f.text).toBeGreaterThan(0);
    expect(n.findings[0]!.cites).toContain("metric:jaccard");
    expect(n.findings[0]!.text).toMatch(/15 tokens are shared/);
    expect(n.findings[0]!.text).toMatch(/16%/);
    expect(n.findings[1]!.text).toMatch(/one field .*needed no bridge/);
    expect(n.findings[2]!.text).toMatch(/licence grant covers autistikon-programme-zero/);
    expect(n.findings.map((f) => f.text).join(" ")).not.toMatch(/\b(causes?|caused|because|therefore|proves?)\b/i);
    expect(n.assumptions_used.map((a) => a.id)).toEqual(["assumption-1", "assumption-2", "assumption-3", "assumption-4", "assumption-5", "assumption-6", "falsifier-1", "falsifier-2", "falsifier-3", "falsifier-4"]);
    expect(n.assumptions_used[0]!.rating).toBe("conjectural"); // copied, not invented
    for (const s of IS_NOT_ALWAYS) expect(n.is_not).toContain(s);
    expect(n.is_not).toContain("not an individual score");
    expect(n.appendix.jaccard).toBeCloseTo(15 / 95, 12);
    expect(n.appendix.snippets).toHaveLength(2);
    expect(n.appendix.child_id).toBe(r.child.id);
    expect(n.compared.grants).toEqual(["autistikon-programme-zero"]);
    expect(noteBanHits(n)).toEqual([]);
  });

  it("match and couple: Jaccard percent + only-left/right; couple says no coupling was fitted", () => {
    const m = buildNote(ok(runAction("compare", pick("work-pz-ledger-structure", "work-toy-materials-note"), cat, FILES, map)), map, FILES);
    expect(m.kind).toBe("match");
    expect(m.findings[0]!.text).toMatch(/\d+% \(Jaccard\).*only in the first.*only in the second.*Lexical overlap only/);
    expect(m.assumptions_used).toEqual([]); // not the PZ pair
    const c = buildNote(ok(runAction("analyze", pick("work-pz-ledger-structure", "work-toy-materials-note"), cat, FILES, map)), map, FILES);
    expect(c.kind).toBe("couple");
    expect(c.findings.some((f) => /No numeric coupling was fitted/.test(f.text))).toBe(true);
    expect(c.compared.path).toEqual(["bridge-mechanics-phenomenology", "bridge-materials-mechanics"]);
    for (const f of [...m.findings, ...c.findings]) expect(f.cites.length).toBeGreaterThan(0);
    expect(noteBanHits(m)).toEqual([]);
    expect(noteBanHits(c)).toEqual([]);
  });

  it("question (a stub among the parents): no findings, the question only, the fixed would_falsify", () => {
    const q = buildNote(ok(runAction("analyze", pick("work-stub-doi-example", "work-stub-title-only"), cat, FILES, map)), map, FILES);
    expect(q.kind).toBe("question");
    expect(q.findings).toEqual([]);
    expect(q.question).toMatch(/could stand beside/);
    expect(q.would_falsify).toBe("a body appearing on the stub would be required before match/couple.");
    expect(q.compared.tokens).toBeUndefined();
    expect(q.appendix.jaccard).toBeUndefined();
    expect(q.objects.every((o) => o.role === "stub")).toBe(true);
    expect(noteBanHits(q)).toEqual([]);
  });

  it("the copy law catches what it must, and allows the negation", () => {
    const r = ok(runAction("converge", pick("work-pz-ledger-structure", "work-pz-register-structure"), cat, FILES, map));
    const n = buildNote(r, map, FILES);
    const bad = { ...n, findings: [...n.findings, { text: "the framework is " + "confirmed", cites: ["x"] }] };
    expect(noteBanHits(bad)).toHaveLength(1);
    const bad2 = { ...n, question: "is this a diagnos" + "tic score?" };
    expect(noteBanHits(bad2).length).toBeGreaterThan(0);
    expect(noteBanHits({ ...n, is_not: [...n.is_not, "not an individual score"] })).toEqual([]);
  });
});

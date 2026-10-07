/** Survivorship: the engine builds a child from a blank programme plus the
 *  group's own fields and works, or from the Classics starter pack, with no
 *  import of the example corpus anywhere in this file or on the default path.
 *  If a claim in NEW_PROGRAMME.md is fake, this file fails. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import blank from "../fixtures/programme-blank.json";
import classics from "../fixtures/programme-classics.json";
import classicsChild from "../fixtures/synthesis-child-classics.json";
import preload from "../fixtures/works-preload.json";
import { buildNote, IS_NOT_OPERATOR_BRIDGE, noteBanHits } from "../src/lib/analysisNote";
import { availability, bridgePath, runAction } from "../src/lib/bench";
import { STAND_INS } from "../src/lib/filters";
import { FIRST_RUN_STEPS } from "../src/lib/firstRun";
import { catalogueOf, programmeCounts, validateChild, type ChildPin, type ProgrammeFile } from "../src/lib/programme";
import { BLANK_PROGRAMME_ID, declareBridge, declareField, FIELD_ANTI_OVERREACH_ALWAYS, fieldIdFor, newProject, projectToMarkdown, withExtraBridges, withExtraFields } from "../src/lib/project";
import { parseProject, projectToJSON } from "../src/lib/projectStore";
import { acceptUpload, worksMap, type Work, type WorksFile } from "../src/lib/works";
import { CALIBRATION as R } from "./record";

const BLANK = blank as ProgrammeFile;
const CLASSICS = classics as ProgrammeFile;
const WORKS = (preload as WorksFile).works;
const map = worksMap(WORKS);
const pick = (...ids: string[]) => ids.map((id) => map.get(id)!);
const ROOT = join(__dirname, "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?)$/.test(name)) out.push(p);
  }
  return out;
}

describe("the blank programme", () => {
  it("is Untitled, has no fields, bridges, items, clock, assumptions or falsifiers, and inherits no grant", () => {
    expect(BLANK.id).toBe(BLANK_PROGRAMME_ID);
    expect(BLANK.label).toBe("Untitled programme");
    expect(BLANK.fields).toEqual([]);
    expect(BLANK.bridges).toEqual([]);
    expect(BLANK.license_grant).toBeUndefined();
    expect(programmeCounts(BLANK)).toMatchObject({ field_count: 0, bridge_count: 0, ledger_count: 0, register_count: 0, array_size: 0, amendment_count: 0, deviation_count: 0, stop_date: "" });
    const text = JSON.stringify(BLANK);
    expect(text).not.toMatch(/autistikon|programme-zero|pz-|Kim|tissue|afferent|fascia/i);
    for (const id of STAND_INS) expect(text).not.toContain(id);
  });

  it("the preload carries ten rows and none of the example corpus's stand-ins", () => {
    expect(WORKS).toHaveLength(10);
    for (const id of STAND_INS) expect(map.has(id)).toBe(false);
    expect(WORKS.some((w) => w.programme === "programme-zero" || w.field === "autistikon-programme-zero")).toBe(false);
  });

  it("no module on the default path imports the example corpus statically: only examplePack.ts names it, and only inside a dynamic import()", () => {
    const offenders: string[] = [];
    for (const f of walk(join(ROOT, "src"))) {
      const text = readFileSync(f, "utf8");
      const rel = relative(ROOT, f);
      const PATHS = /fixtures\/(programme-zero|works-example-corpus|synthesis-child)\.json/;
      if (!PATHS.test(text)) continue;
      if (rel !== "src/lib/examplePack.ts") { offenders.push(rel); continue; }
      for (const line of text.split("\n")) if (PATHS.test(line)) expect(line, rel).toMatch(/^\s*import\(/); // dynamic, never `import x from`
    }
    expect(offenders).toEqual([]);
    // and this file, the core suite, never touched it either
    expect(readFileSync(__filename, "utf8")).not.toMatch(/fixtures\/(programme-zero|works-example-corpus|synthesis-child)\.json/);
  });

  it("the first run names no corpus, no fixture id and no author as a required parent", () => {
    const copy = FIRST_RUN_STEPS.map((s) => s.text + " " + (s.action?.label ?? "")).join("\n");
    expect(copy).not.toMatch(/Autistikon|Programme Zero|stand-in|Faraday|Maxwell|Darwin|Mendel|Newton|NIST|work-|pz-/i);
    expect(FIRST_RUN_STEPS.map((s) => s.n)).toEqual([1, 2, 3, 4]);
    expect(FIRST_RUN_STEPS[0]!.text).toMatch(/Add two fields/);
    expect(FIRST_RUN_STEPS[0]!.action).toMatchObject({ kind: "programme", fixture: "programme-classics.json" });
    expect(FIRST_RUN_STEPS[0]!.action!.label).toMatch(/starter pack/);
    expect(FIRST_RUN_STEPS[1]!.text).toMatch(/two works you have rights to/);
    expect(FIRST_RUN_STEPS[2]!.text).toMatch(/Converge or Compare/);
    expect(FIRST_RUN_STEPS[2]!.text).toMatch(/amendment, not evidence/);
    expect(FIRST_RUN_STEPS[3]!.text).toBe("Download pack.");
    const s0 = { fieldCount: 0, selectedCount: 0, noteCount: 0, packDone: false };
    expect(FIRST_RUN_STEPS.map((s) => s.done(s0))).toEqual([false, false, false, false]);
    expect(FIRST_RUN_STEPS.map((s) => s.done({ fieldCount: 2, selectedCount: 2, noteCount: 1, packDone: true }))).toEqual([true, true, true, true]);
    for (const s of FIRST_RUN_STEPS) expect(s.action === null || s.action.kind === "programme").toBe(true); // never a corpus filter
  });
});

describe("a child from the group's own fields, on the blank programme", () => {
  const project0 = newProject(1);
  const blankCat = catalogueOf([BLANK]);

  it("declareField: a label, units and a sector make a field with the person-score refusal always in its pack; empties, duplicates and catalogue clashes refuse", () => {
    expect(declareField(project0, blankCat, { label: "", units: "mg/kg", sector: "earth-sciences" })).toMatchObject({ ok: false });
    expect(declareField(project0, blankCat, { label: "Soil chemistry", units: "", sector: "earth-sciences" })).toMatchObject({ ok: false });
    expect(declareField(project0, blankCat, { label: "Soil chemistry", units: "mg/kg", sector: "" })).toMatchObject({ ok: false });
    expect(declareField(project0, blankCat, { label: "!!!", units: "x", sector: "y" })).toMatchObject({ ok: false });
    const r = declareField(project0, blankCat, { label: "Soil chemistry (field surveys)", units: "mg/kg; pH", sector: "earth-sciences", anti_overreach: ["no claim about any site not sampled"] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.field.id).toBe("field-soil-chemistry-field-surveys");
    expect(fieldIdFor("Soil chemistry (field surveys)")).toBe(r.field.id);
    expect(r.field.origin).toBe("operator");
    expect(r.field.license_required).toBe(false);
    expect(r.field.anti_overreach).toEqual(["no claim about any site not sampled", FIELD_ANTI_OVERREACH_ALWAYS]);
    const p1 = { ...project0, extra_fields: [r.field] };
    expect(declareField(p1, withExtraFields(blankCat, p1.extra_fields), { label: "soil chemistry (field surveys)", units: "x", sector: "y" })).toMatchObject({ ok: false, reason: expect.stringMatching(/already/) });
    expect(declareField(project0, catalogueOf([CLASSICS]), { label: "optics", units: "x", sector: "y" })).toMatchObject({ ok: true }); // "field-optics" is not "optics": no clash
  });

  it("two declared fields, two uploads shelved in them, one declared bridge → Compare matches them (Analyze on two bodies is COUPLE_IS_LEXICAL); without the bridge NO_BRIDGE; Classics works are UNKNOWN_FIELD here", () => {
    const f1 = declareField(project0, blankCat, { label: "Soil chemistry", units: "mg/kg", sector: "earth-sciences" });
    const f2 = declareField(project0, blankCat, { label: "Plant physiology", units: "mmol/m²/s", sector: "earth-sciences" });
    if (!f1.ok || !f2.ok) throw new Error("fields refused");
    const p = { ...project0, extra_fields: [f1.field, f2.field] };
    const withFields = withExtraFields(blankCat, p.extra_fields);
    const u1 = acceptUpload({ title: "Soil survey excerpt (yours)", license: "cc-by-4.0", claimsBytes: true, rights: true, field: f1.field.id, text: "Topsoil samples from the north transect: pH 6.1 to 6.8, potassium 140 to 220 mg/kg, organic carbon 2.1 percent, sampled in spring." });
    const u2 = acceptUpload({ title: "Leaf gas exchange excerpt (yours)", license: "cc0", claimsBytes: true, rights: true, field: f2.field.id, text: "Stomatal conductance on the north transect ranged 0.18 to 0.31 mol/m²/s; assimilation tracked potassium supply across sampled plots in spring." });
    if (!u1.ok || !u2.ok) throw new Error("uploads refused");
    const works: Work[] = [u1.work, u2.work];
    const wmap = worksMap(works);
    // no bridge yet: the bench refuses and names the pair
    const refused = runAction("compare", works, withFields, [BLANK], wmap, R);
    expect(refused).toMatchObject({ ok: false, code: "NO_BRIDGE", missing: [f1.field.id, f2.field.id] });
    expect(bridgePath(withFields, f1.field.id, f2.field.id)).toBeNull();
    // the operator declares the first bridge — an amendment, never evidence
    expect(declareBridge(p, withFields, f1.field.id, f2.field.id, false)).toMatchObject({ ok: false });
    const b = declareBridge(p, withFields, f1.field.id, f2.field.id, true);
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    const cat = withExtraBridges(withFields, [b.bridge]);
    expect(cat.bridges.size).toBe(1);
    expect([...cat.bridges.values()].every((x) => x.origin === "operator")).toBe(true); // no shipped edge on a blank programme
    expect(runAction("analyze", works, cat, [BLANK], wmap, R)).toMatchObject({ ok: false, code: "COUPLE_IS_LEXICAL" }); // no numeric coupling is fitted here
    expect(runAction("compare", works, cat, [BLANK], wmap, null)).toMatchObject({ ok: false, code: "MODE_REQUIRED" }); // the record is the operator's to fill
    const r = runAction("compare", works, cat, [BLANK], wmap, R);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.child.kind).toBe("match");
    expect(r.child.intermediary_status).toBe("recovered_known");
    expect(r.walk).toEqual([f1.field.id, f2.field.id]);
    expect(r.bridges).toEqual([b.bridge.id]);
    expect(r.child.grants).toEqual([]); // nothing at arm's length: no grant needed
    expect(r.metrics).not.toBeNull();
    const note = buildNote(r, wmap, [BLANK], new Set([b.bridge.id]));
    expect(note.is_not).toContain(IS_NOT_OPERATOR_BRIDGE);
    expect(note.assumptions_used).toEqual([]); // an operator bridge has no ledger: nothing is invented
    expect(noteBanHits(note)).toEqual([]);
    expect(JSON.stringify(note)).not.toMatch(/autistikon|programme-zero/i);
    // and a Classics work on the blank programme is not shelved anywhere the bench knows
    expect(runAction("compare", pick("work-darwin-1859", "work-mendel-1866-de"), withFields, [BLANK], map, R)).toMatchObject({ ok: false, code: "UNKNOWN_FIELD" });
  });

  it("the pack carries the group's fields; the JSON round-trips them; a field not marked operator is stripped, never shipped", () => {
    const f = declareField(project0, blankCat, { label: "Soil chemistry", units: "mg/kg", sector: "earth-sciences" });
    if (!f.ok) throw new Error("refused");
    const p = { ...project0, extra_fields: [f.field] };
    const md = projectToMarkdown(p);
    expect(md).toMatch(/## Fields declared/);
    expect(md).toMatch(/field-soil-chemistry.*declared on this project, not written to any programme file/);
    expect(md).toMatch(/programmes: programme-blank/);
    const back = parseProject(projectToJSON(p), WORKS);
    expect(back.ok).toBe(true);
    if (back.ok) expect(back.project.extra_fields).toEqual([f.field]);
    const forged = JSON.parse(projectToJSON(p)) as { extra_fields: unknown[] };
    forged.extra_fields = [{ id: "optics", label: "Optics", units: "x", sector: "physics", anti_overreach: [] }]; // no origin: a shipped-looking field
    const r = parseProject(JSON.stringify(forged), WORKS);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.project.extra_fields).toEqual([]);
    expect(newProject(3).programme_ids).toEqual([BLANK_PROGRAMME_ID]);
  });
});

describe("a child from the Classics starter pack (public-domain works, no corpus)", () => {
  const cat = catalogueOf([CLASSICS]);

  it("the shipped example child — Darwin and Mendel across the one declared bridge — is legal, needs no grant, and cites two preload works", () => {
    const child = classicsChild as ChildPin;
    expect(child.grants).toEqual([]);
    const r = validateChild(cat, child, map);
    expect(r.walk).toEqual(["natural-history", "heredity"]);
    expect(r.bridges).toEqual(["bridge-natural-history-heredity"]);
    expect(JSON.stringify(child)).not.toMatch(/autistikon|programme-zero|pz-/i);
  });

  it("Compare Darwin + Mendel over the shipped bridge writes a match note; every finding cites a work or a metric", () => {
    const r = runAction("compare", pick("work-darwin-1859", "work-mendel-1866-de"), cat, [CLASSICS], map, R);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.child.kind).toBe("match");
    expect(r.bridges).toEqual(["bridge-natural-history-heredity"]);
    const note = buildNote(r, map, [CLASSICS]);
    for (const f of note.findings) expect(f.cites.length).toBeGreaterThan(0);
    expect(noteBanHits(note)).toEqual([]);
  });

  it("Newton + NIST: Classics declares no optics — metrology bridge, so Compare refuses NO_BRIDGE; the operator declares one and the same Compare runs (NEW_PROGRAMME.md's worked example)", () => {
    const newtonNist = pick("work-newton-opticks", "work-nist-tn1297");
    const before = availability(newtonNist, cat, [CLASSICS], map, R);
    expect(before.find((a) => a.action === "compare")).toMatchObject({ enabled: false, code: "NO_BRIDGE", missing: ["optics", "metrology"] });
    const p = newProject(1, [CLASSICS.id]);
    const b = declareBridge(p, cat, "optics", "metrology", true);
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    expect(b.bridge.id).toBe("amend-optics-metrology");
    const amended = withExtraBridges(cat, [b.bridge]);
    expect(cat.bridges.has(b.bridge.id)).toBe(false); // the shipped catalogue never gained it
    const r = runAction("compare", newtonNist, amended, [CLASSICS], map, R);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.walk).toEqual(["optics", "metrology"]);
    expect(r.bridges).toEqual(["amend-optics-metrology"]);
    const note = buildNote(r, map, [CLASSICS], new Set([b.bridge.id]));
    expect(note.is_not).toContain(IS_NOT_OPERATOR_BRIDGE);
    expect(note.compared.path).toEqual(["amend-optics-metrology"]);
    expect(noteBanHits(note)).toEqual([]);
  });
});

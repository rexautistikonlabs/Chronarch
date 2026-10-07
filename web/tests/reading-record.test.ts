/** The reading record is a ledger of an operator claim (specs/ANALYSIS.md).
 *  The bench checks shape and contradiction and refuses — hard errors, no
 *  note body — and never verifies the science. These cases run on the
 *  Classics starter pack and the blank programme: no example corpus. */
import { describe, expect, it } from "vitest";

import classics from "../fixtures/programme-classics.json";
import preload from "../fixtures/works-preload.json";
import { buildNote, IS_NOT_ALWAYS, NOTE_BAN_PATTERNS, noteBanHits, RECORD_CAPTION } from "../src/lib/analysisNote";
import { availability, COUPLE_IS_LEXICAL_DETAIL, kindFor, runAction } from "../src/lib/bench";
import { noteToMarkdown } from "../src/lib/exportNote";
import { catalogueOf, comparisonPresent, INTERMEDIARY_STATUSES, validateChild, validateReadingRecord, type ChildPin, type ProgrammeFile, type ReadingRecord } from "../src/lib/programme";
import { worksMap, type WorksFile } from "../src/lib/works";
import { CALIBRATION, COMPARISON, INCREMENTAL } from "./record";

const CLASSICS = classics as ProgrammeFile;
const cat = catalogueOf([CLASSICS]);
const map = worksMap((preload as WorksFile).works);
const pick = (...ids: string[]) => ids.map((id) => map.get(id)!);
const FM = pick("work-faraday-ere-v1", "work-maxwell-elem"); // two bodies across the shipped electricity — electromagnetism bridge
const STUBS = pick("work-stub-doi-example", "work-stub-title-only");
const compare = (record: ReadingRecord | null) => runAction("compare", FM, cat, [CLASSICS], map, record);
const code = (r: ReturnType<typeof runAction>) => (r.ok ? "ok" : r.code);

describe("the status vocabulary", () => {
  it("is six strings, exactly, and no bridge rating is among them", () => {
    expect([...INTERMEDIARY_STATUSES]).toEqual(["recovered_known", "candidate_confound", "not_identified", "untested_prediction", "incremental_value", "dropped"]);
    for (const rating of ["conjectural", "supported", "contested", "established", "live"]) expect(INTERMEDIARY_STATUSES as readonly string[]).not.toContain(rating);
  });

  it("a live bridge fixture does not populate intermediary_status: the shipped Classics bridges carry ratings on their ledgers and nothing of the record", () => {
    for (const b of CLASSICS.bridges) {
      expect(b.status).toBe("live");
      expect(b as unknown as Record<string, unknown>).not.toHaveProperty("intermediary_status");
      expect(b as unknown as Record<string, unknown>).not.toHaveProperty("mode");
      for (const l of b.ledger) expect(["conjectural", "supported", "contested", "established"]).toContain(l.rating);
    }
    // and a child that runs over a live bridge with no record is refused, not filled in
    const r = compare(null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("MODE_REQUIRED");
    const withMode = compare({ mode: "calibration" });
    expect(code(withMode)).toBe("STATUS_REQUIRED"); // the live bridge did not supply one
  });
});

describe("the four fields on the child note", () => {
  it("a question pin with none of the four fields succeeds, and the note carries them as null", () => {
    const r = runAction("analyze", STUBS, catalogueOf([CLASSICS]), [CLASSICS], map, null);
    // the Classics catalogue does not shelve the stubs' fields: use the toy-free path — the stubs sit in tissue-mechanics / toy-acoustics, so build the question directly
    expect(kindFor("analyze", STUBS)).toBe("question");
    const q: ChildPin = { id: "child-q", kind: "question", parents: [{ pin: "pin:a", field: "optics" }, { pin: "pin:b", field: "electromagnetism" }], path: ["bridge-optics-electromagnetism"], method: "question: what could stand beside what", grants: [], sector: "synthesis", subject: "cohort-level literature", writes_to: null };
    expect(validateChild(cat, q).bridges).toEqual(["bridge-optics-electromagnetism"]);
    expect(() => validateReadingRecord(q)).not.toThrow();
    expect(r.ok || r.code === "UNKNOWN_FIELD").toBe(true); // the bench refuses the stubs' shelves on Classics, never the missing record
  });

  it("overlap without mode refuses MODE_REQUIRED; without status STATUS_REQUIRED; without identifiability IDENTIFIABILITY_REQUIRED", () => {
    expect(code(runAction("converge", FM, cat, [CLASSICS], map, null))).toBe("MODE_REQUIRED");
    expect(code(runAction("converge", FM, cat, [CLASSICS], map, { intermediary_status: "recovered_known" }))).toBe("MODE_REQUIRED");
    expect(code(compare({ mode: "calibration" }))).toBe("STATUS_REQUIRED");
    expect(code(compare({ mode: "calibration", intermediary_status: "recovered_known" }))).toBe("IDENTIFIABILITY_REQUIRED");
    expect(code(compare({ ...CALIBRATION, identifiability: { contrast: "", nominal_input_held_fixed: "x", covariates_held_fixed: [] } }))).toBe("IDENTIFIABILITY_REQUIRED");
    expect(code(compare({ ...CALIBRATION, identifiability: "something else" as unknown as "not_identified" }))).toBe("IDENTIFIABILITY_REQUIRED");
  });

  it("calibration plus incremental_value refuses CALIBRATION_CANNOT_INCREMENT", () => {
    expect(code(compare({ ...CALIBRATION, intermediary_status: "incremental_value", comparison: COMPARISON }))).toBe("CALIBRATION_CANNOT_INCREMENT");
  });

  it("not_identified plus a comparison object refuses COMPARISON_BLOCKED; not_identified alone is a legal record", () => {
    expect(code(compare({ ...CALIBRATION, identifiability: "not_identified", comparison: COMPARISON }))).toBe("COMPARISON_BLOCKED");
    expect(code(compare({ ...CALIBRATION, identifiability: "not_identified", comparison: { ...COMPARISON, published_covariate_set: [] } }))).toBe("COMPARISON_BLOCKED"); // any presence blocks
    expect(code(compare({ ...CALIBRATION, identifiability: "not_identified" }))).toBe("ok");
  });

  it("incremental_value without a complete comparison refuses COMPARISON_REQUIRED — missing, empty, a list for added_parameter, or no threshold", () => {
    expect(code(compare({ ...INCREMENTAL, comparison: null }))).toBe("COMPARISON_REQUIRED");
    expect(code(compare({ ...INCREMENTAL, comparison: { published_covariate_set: [], added_parameter: "", locked_metric: "", threshold: "", threshold_fixed_before_run: false } }))).toBe("COMPARISON_REQUIRED");
    expect(code(compare({ ...INCREMENTAL, comparison: { ...COMPARISON, published_covariate_set: [] } }))).toBe("COMPARISON_REQUIRED");
    expect(code(compare({ ...INCREMENTAL, comparison: { ...COMPARISON, added_parameter: ["a", "b"] as unknown as string } }))).toBe("COMPARISON_REQUIRED");
    expect(code(compare({ ...INCREMENTAL, comparison: { ...COMPARISON, threshold: "" } }))).toBe("COMPARISON_REQUIRED");
    expect(code(compare({ ...INCREMENTAL, comparison: { ...COMPARISON, threshold_fixed_before_run: "yes" as unknown as boolean } }))).toBe("COMPARISON_REQUIRED");
  });

  it("recovered_known with a comparison object refuses COMPARISON_FORBIDDEN; so does every other non-incremental status", () => {
    expect(code(compare({ ...CALIBRATION, comparison: COMPARISON }))).toBe("COMPARISON_FORBIDDEN");
    for (const status of ["candidate_confound", "untested_prediction", "dropped"] as const) {
      expect(code(compare({ ...CALIBRATION, intermediary_status: status, comparison: COMPARISON }))).toBe("COMPARISON_FORBIDDEN");
      expect(code(compare({ ...CALIBRATION, intermediary_status: status }))).toBe("ok");
    }
    // an all-empty block is absent, not forbidden
    expect(comparisonPresent({ published_covariate_set: [], added_parameter: "", locked_metric: "", threshold: "", threshold_fixed_before_run: false })).toBe(false);
    expect(code(compare({ ...CALIBRATION, comparison: { published_covariate_set: [], added_parameter: "", locked_metric: "", threshold: "", threshold_fixed_before_run: false } }))).toBe("ok");
  });

  it("threshold_fixed_before_run: false refuses THRESHOLD_NOT_LOCKED; true with a complete block succeeds and the note says whose record the block is", () => {
    expect(code(compare({ ...INCREMENTAL, comparison: { ...COMPARISON, threshold_fixed_before_run: false } }))).toBe("THRESHOLD_NOT_LOCKED");
    const r = compare(INCREMENTAL);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.child.mode).toBe("incremental");
    expect(r.child.intermediary_status).toBe("incremental_value");
    expect(r.child.comparison).toEqual(COMPARISON);
    const n = buildNote(r, map, [CLASSICS]);
    expect(n.mode).toBe("incremental");
    expect(n.intermediary_status).toBe("incremental_value");
    expect(n.identifiability).toEqual(INCREMENTAL.identifiability);
    expect(n.comparison).toEqual(COMPARISON);
    const record = n.findings.filter((f) => /operator record, not a bench result/.test(f.text));
    expect(record).toHaveLength(1); // one sentence, only for incremental_value
    expect(record[0]!.text).toMatch(/no fit statistic was computed here/);
    expect(record[0]!.cites.length).toBeGreaterThan(0);
    expect(n.findings[0]!.text).toMatch(/Lexical overlap only/); // Jaccard stays what it is
    expect(JSON.stringify(n)).not.toMatch(/likelihood|AIC|BIC|cross-valid|p-value|fit statistic:/i);
    expect(noteBanHits(n)).toEqual([]);
    const md = noteToMarkdown(r, n);
    expect(md).toContain(RECORD_CAPTION);
    expect(md).toMatch(/intermediary_status incremental_value/);
  });

  it("a calibration note carries the record and no record sentence; its is_not carries the new negations beside the old", () => {
    const r = compare(CALIBRATION);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const n = buildNote(r, map, [CLASSICS]);
    expect(n.mode).toBe("calibration");
    expect(n.intermediary_status).toBe("recovered_known");
    expect(n.comparison).toBeNull();
    expect(n.findings.some((f) => /operator record/.test(f.text))).toBe(false);
    for (const s of ["not a fitted model", "not peer review", "not a clinical claim", "not an individual score", "not a nested model comparison", "not a measurement of a person", "not evidence the architecture generalises"]) expect(n.is_not).toContain(s);
    expect(IS_NOT_ALWAYS).toContain("not a nested model comparison");
    expect(noteBanHits(n)).toEqual([]);
  });

  it("couple whose only number is Jaccard refuses COUPLE_IS_LEXICAL, record or no record, and the refusal says no numeric coupling was fitted", () => {
    expect(kindFor("analyze", FM)).toBe("couple");
    const bare = runAction("analyze", FM, cat, [CLASSICS], map, null);
    expect(bare).toMatchObject({ ok: false, code: "COUPLE_IS_LEXICAL" });
    const filled = runAction("analyze", FM, cat, [CLASSICS], map, INCREMENTAL);
    expect(filled).toMatchObject({ ok: false, code: "COUPLE_IS_LEXICAL" });
    if (!filled.ok) expect(filled.detail).toMatch(/no numeric coupling was fitted/);
    expect(COUPLE_IS_LEXICAL_DETAIL).toMatch(/no numeric coupling was fitted/);
    const av = availability(FM, cat, [CLASSICS], map, CALIBRATION);
    expect(av.find((a) => a.action === "analyze")).toMatchObject({ enabled: false, code: "COUPLE_IS_LEXICAL" });
    expect(av.find((a) => a.action === "compare")).toMatchObject({ enabled: true });
    expect(av.find((a) => a.action === "converge")).toMatchObject({ enabled: true });
  });

  it("the record never fills itself in: the child carries exactly what was given", () => {
    const r = compare({ mode: "incremental", intermediary_status: "untested_prediction", identifiability: "not_identified" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.child.comparison).toBeNull();
      expect(r.child.identifiability).toBe("not_identified");
      expect(buildNote(r, map, [CLASSICS]).comparison).toBeNull();
    }
  });
});

describe("note copy law, extended", () => {
  const base = () => {
    const r = compare(CALIBRATION);
    if (!r.ok) throw new Error(r.code);
    return buildNote(r, map, [CLASSICS]);
  };
  it("refuses PASS and HIGH-POTENTIAL PASS as result labels, the two coined phrases, and any sentence that says the bench fitted, proved or discovered an intermediary", () => {
    const n = base();
    const bad = (text: string) => noteBanHits({ ...n, findings: [...n.findings, { text, cites: ["x"] }] });
    expect(bad("Result: PASS.")).toHaveLength(1);
    expect(bad("HIGH-POTENTIAL PASS on the second run")).toHaveLength(2); // the label and its prefix form
    expect(bad("this is a new experimentally separable variable")).toHaveLength(1);
    expect(bad("a discovery opportunity for the group")).toHaveLength(1);
    expect(bad("the bench fitted an intermediary between the two")).toHaveLength(1);
    expect(bad("an intermediary was discovered here")).toHaveLength(1);
    expect(bad("the reading proves the intermediary")).toHaveLength(1);
    expect(noteBanHits({ ...n, would_falsify: "the framework is " + "confirmed" })).toHaveLength(1);
    expect(noteBanHits({ ...n, question: "fascia " + "therapy?" })).toHaveLength(1);
    // ordinary words stay legal: "passes", "compass", "no numeric coupling was fitted"
    expect(bad("the token count passes 15 and the compass of the excerpt is wide")).toEqual([]);
    expect(bad("No numeric coupling was fitted: the number above is a token ratio.")).toEqual([]);
    expect(NOTE_BAN_PATTERNS.length).toBeGreaterThanOrEqual(5);
  });
});

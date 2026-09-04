/** RexMetrix model law: fixtures parse, counts differ, refusals are hard errors. */
import { describe, expect, it } from "vitest";

import toy from "../fixtures/programme-toy.json";
import zero from "../fixtures/programme-zero.json";
import childFixture from "../fixtures/synthesis-child.json";
import preload from "../fixtures/works-preload.json";
import { catalogueOf, programmeCounts, Refusal, requestIndividualScore, validateChild, type ChildPin, type ProgrammeFile } from "../src/lib/programme";
import { worksMap, type WorksFile } from "../src/lib/works";

const ZERO = zero as ProgrammeFile;
const TOY = toy as ProgrammeFile;
const CHILD = childFixture as ChildPin;
const cat = catalogueOf([ZERO, TOY]);
const works = worksMap((preload as WorksFile).works);

describe("fixtures", () => {
  it("Programme Zero is a two-field, one-bridge programme with rated assumptions and a stop clock", () => {
    const c = programmeCounts(ZERO);
    expect(c).toMatchObject({ field_count: 2, bridge_count: 1, ledger_count: 6, register_count: 4, array_size: 5, amendment_count: 0 });
    expect(c.stop_date).toBe("2027-06-30");
    for (const b of ZERO.bridges) for (const l of b.ledger) expect(l.rating).not.toBe("established"); // none defaults to established
    for (const b of ZERO.bridges) for (const r of b.register) expect(r.anti_rescue).toBe(true);
    expect(ZERO.fields.find((f) => f.id === "autistikon-programme-zero")?.license_required).toBe(true);
    expect(ZERO.license_grant?.scope).toBe("autistikon-programme-zero");
  });

  it("the toy programme is an invented three-field graph with a path of two bridges", () => {
    expect(programmeCounts(TOY)).toMatchObject({ field_count: 3, bridge_count: 2, amendment_count: 1, deviation_count: 1 });
    expect(TOY.note).toMatch(/invented/i);
    expect(TOY.programme.deviations[0]?.results_known_at_the_time).toBe(false);
  });

  it("Programme Zero carries no eight-zone content, no scores, no chapters", () => {
    const text = JSON.stringify(ZERO);
    expect(text).not.toMatch(/zone[- ]?[1-8]\b|"scores?"\s*:|"chapters?"\s*:|"zones?"\s*:/i); // no zone keys, no score keys, no chapter keys
    expect(ZERO.programme.array_lock.items).toHaveLength(5); // a count, and not eight
  });

  it("the synthesis child is legal: parents from both programmes, a live three-bridge path, a grant", () => {
    const r = validateChild(cat, CHILD, works);
    expect(r.walk).toEqual(["autistikon-programme-zero", "tissue-mechanics", "toy-materials", "toy-acoustics"]);
    expect(r.bridges).toHaveLength(3);
  });
});

describe("refusals are hard errors", () => {
  const legal = (): ChildPin => JSON.parse(JSON.stringify(CHILD));

  it("NO_BRIDGE: a missing, broken, draft or undeclared connection", () => {
    const missing = legal();
    missing.path = ["bridge-mechanics-phenomenology", "bridge-materials-acoustics"]; // skips the middle edge
    expect(() => validateChild(cat, missing, works)).toThrow(/NO_BRIDGE/);
    const none = legal();
    delete none.path;
    expect(() => validateChild(cat, none, works)).toThrow(/NO_BRIDGE.*no implicit coupling/);
    const draftCat = catalogueOf([ZERO, TOY]);
    draftCat.bridges.set("bridge-materials-mechanics", { ...draftCat.bridges.get("bridge-materials-mechanics")!, status: "draft" });
    expect(() => validateChild(draftCat, legal(), works)).toThrow(/NO_BRIDGE.*draft/);
    const clique = legal();
    delete clique.path;
    clique.clique = ["bridge-mechanics-phenomenology"]; // does not join the two parents
    expect(() => validateChild(cat, clique, works)).toThrow(/NO_BRIDGE/);
  });

  it("LICENSE_MISSING: the corpus field is at arm's length", () => {
    const c = legal();
    c.grants = [];
    expect(() => validateChild(cat, c, works)).toThrow(/LICENSE_MISSING/);
  });

  it("INDIVIDUAL_SCORE_FORBIDDEN: no person-level score, index or assessment, ever", () => {
    const c = legal();
    c.subject = "individual";
    expect(() => validateChild(cat, c, works)).toThrow(/INDIVIDUAL_SCORE_FORBIDDEN/);
    const m = legal();
    m.method = "compute a per-person index from the corpus construct";
    expect(() => validateChild(cat, m, works)).toThrow(/INDIVIDUAL_SCORE_FORBIDDEN/);
    expect(() => requestIndividualScore("autistikon-programme-zero", "person")).toThrow(Refusal);
    expect(() => requestIndividualScore("toy-materials")).toThrow(/INDIVIDUAL_SCORE_FORBIDDEN/);
  });

  it("CROSS_SECTOR_WRITE: a child never writes into another sector's field", () => {
    const c = legal();
    c.writes_to = "toy-acoustics"; // sector materials, child sector synthesis
    expect(() => validateChild(cat, c, works)).toThrow(/CROSS_SECTOR_WRITE/);
    const same = legal();
    same.sector = "materials";
    same.writes_to = "toy-acoustics";
    expect(validateChild(cat, same, works).bridges).toHaveLength(3);
  });

  it("BAD_KIND and UNKNOWN_FIELD", () => {
    const k = legal();
    (k as { kind: string }).kind = "blend";
    expect(() => validateChild(cat, k, works)).toThrow(/BAD_KIND/);
    const u = legal();
    u.parents[1] = { pin: "pin:x", field: "no-such-field" };
    expect(() => validateChild(cat, u, works)).toThrow(/UNKNOWN_FIELD/);
  });
});

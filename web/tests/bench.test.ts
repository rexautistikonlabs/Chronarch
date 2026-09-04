/** The operator bench: three actions, one law. */
import { describe, expect, it } from "vitest";

import toy from "../fixtures/programme-toy.json";
import zero from "../fixtures/programme-zero.json";
import preload from "../fixtures/works-preload.json";
import { bridgePath, kindFor, runAction } from "../src/lib/bench";
import { catalogueOf, type ProgrammeFile } from "../src/lib/programme";
import { worksMap, type WorksFile } from "../src/lib/works";

const FILES = [zero as ProgrammeFile, toy as ProgrammeFile];
const cat = catalogueOf(FILES);
const WORKS = (preload as WorksFile).works;
const map = worksMap(WORKS);
const pick = (...ids: string[]) => ids.map((id) => map.get(id)!);

describe("bench actions", () => {
  it("Converge with the two preload cc-by stand-ins → ok child of kind overlap (one field, no bridge needed, grant carried)", () => {
    const r = runAction("converge", pick("work-pz-ledger-structure", "work-pz-register-structure"), cat, FILES, map);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.child.kind).toBe("overlap");
      expect(r.child.parents.map((p) => p.work)).toEqual(["work-pz-ledger-structure", "work-pz-register-structure"]);
      expect(r.bridges).toEqual([]);
      expect(r.walk).toEqual(["autistikon-programme-zero"]);
      expect(r.child.grants[0]?.scope).toBe("autistikon-programme-zero");
      expect(r.child.subject).toBe("cohort-level literature");
    }
  });

  it("Compare with a stub parent → STUB_NO_FULLTEXT", () => {
    const r = runAction("compare", pick("work-pz-ledger-structure", "work-stub-doi-example"), cat, FILES, map);
    expect(r).toMatchObject({ ok: false, code: "STUB_NO_FULLTEXT" });
  });

  it("Analyze with two stubs → a question child, allowed, along the declared path", () => {
    const stubs = pick("work-stub-doi-example", "work-stub-title-only");
    expect(kindFor("analyze", stubs)).toBe("question");
    const r = runAction("analyze", stubs, cat, FILES, map);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.child.kind).toBe("question");
      expect(r.child.path).toEqual(["bridge-materials-mechanics", "bridge-materials-acoustics"]);
      expect(r.walk).toEqual(["tissue-mechanics", "toy-materials", "toy-acoustics"]);
    }
  });

  it("Analyze with two bodies → couple", () => {
    const bodies = pick("work-pz-ledger-structure", "work-toy-materials-note");
    expect(kindFor("analyze", bodies)).toBe("couple");
    const r = runAction("analyze", bodies, cat, FILES, map);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.child.kind).toBe("couple");
  });

  it("one selection → NEED_PARENTS; an unshelved work → UNKNOWN_FIELD", () => {
    expect(runAction("converge", pick("work-pz-ledger-structure"), cat, FILES, map)).toMatchObject({ ok: false, code: "NEED_PARENTS" });
    expect(runAction("converge", [], cat, FILES, map)).toMatchObject({ ok: false, code: "NEED_PARENTS" });
    expect(runAction("analyze", pick("work-darwin-1859", "work-stub-doi-example"), cat, FILES, map)).toMatchObject({ ok: false, code: "UNKNOWN_FIELD" });
  });

  it("NO_BRIDGE when no live path joins the parents' fields; LICENSE_MISSING when the grant is gone", () => {
    const cut = catalogueOf(FILES);
    cut.bridges.delete("bridge-materials-mechanics");
    expect(runAction("analyze", pick("work-stub-doi-example", "work-stub-title-only"), cut, FILES, map)).toMatchObject({ ok: false, code: "NO_BRIDGE" });
    const noGrant = FILES.map((f) => ({ ...f, license_grant: undefined }));
    expect(runAction("converge", pick("work-pz-ledger-structure", "work-pz-register-structure"), cat, noGrant, map)).toMatchObject({ ok: false, code: "LICENSE_MISSING" });
  });

  it("bridgePath is the shortest live path, empty within one field, null when none", () => {
    expect(bridgePath(cat, "toy-acoustics", "autistikon-programme-zero")).toEqual(["bridge-materials-acoustics", "bridge-materials-mechanics", "bridge-mechanics-phenomenology"]);
    expect(bridgePath(cat, "toy-materials", "toy-materials")).toEqual([]);
    const cut = catalogueOf(FILES);
    cut.bridges.set("bridge-materials-mechanics", { ...cut.bridges.get("bridge-materials-mechanics")!, status: "retired" });
    expect(bridgePath(cut, "toy-acoustics", "tissue-mechanics")).toBeNull();
  });
});

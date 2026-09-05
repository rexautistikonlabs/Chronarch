/** The campus is data first: three volumes, one door, one gate, no speed. */
import { describe, expect, it } from "vitest";

import { BUILDINGS, buildingByKey, campusGoal, GATE, SIGN_LINES } from "../src/campus/campusLayout";
import { CATALOGUE, RULES } from "../src/pages/Landing";

const TOY = /\b(car|kart|vehicle|honk|balloon|collectible|rainbow|bounc\w*|kids?|playground|fun lab|joke|NPC|mascot)\b/i;

describe("campus layout", () => {
  it("three buildings; only Chronarch runs, has windows and a door; the others are forthcoming with no route", () => {
    expect(BUILDINGS.map((b) => b.key)).toEqual(["chronarch", "continuum", "face-mapping"]);
    expect(buildingByKey("chronarch")).toMatchObject({ status: "RUNNING", windows: true, route: "/chronarch", shade: "lab" });
    expect(buildingByKey("continuum")).toMatchObject({ status: "FORTHCOMING", windows: false, route: null, shade: "shed" });
    expect(buildingByKey("face-mapping")).toMatchObject({ status: "FORTHCOMING", windows: false, route: null, shade: "blank" });
    expect(SIGN_LINES.chronarch).toBe("CHRONARCH · RUNNING");
    expect(SIGN_LINES.continuum).toBe("CONTINUUM · FORTHCOMING");
    expect(SIGN_LINES["face-mapping"]).toBe("FACE MAP · FORTHCOMING · NOT A DIAGNOSTIC");
    expect(GATE.label).toBe("REXMETRIX");
  });

  it("camera goals are finite rest poses, one per building plus the overview; the overview is the farthest", () => {
    const over = campusGoal(null);
    for (const b of BUILDINGS) {
      const g = campusGoal(b.key);
      for (const v of [g.az, g.el, g.dist, ...g.target]) expect(Number.isFinite(v)).toBe(true);
      expect(g.dist).toBeLessThan(over.dist);
      expect(g.target[0]).toBe(b.center[0]);
    }
  });

  it("the copy is a contractor's, not a playground's", () => {
    const copy = [...Object.values(SIGN_LINES), GATE.label, ...RULES, ...CATALOGUE.flatMap((c) => [c.name, c.line, ...c.isNot])].join("\n");
    expect(copy).not.toMatch(TOY);
    expect(copy).toMatch(/not a diagnostic/);
    expect(copy).toMatch(/not a person-score/);
    expect(copy).toMatch(/not an assessment of anyone/);
  });
});

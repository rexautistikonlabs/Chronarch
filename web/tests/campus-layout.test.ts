/** The campus is data first: three volumes, one door, one gate; the story's
 *  camera is a function of scroll progress and nothing else. */
import { describe, expect, it } from "vitest";

import { BUILDINGS, buildingByKey, doorGoal, GATE, KEYFRAMES, SIGN_LINES, storyGoal } from "../src/campus/campusLayout";
import { CHAPTERS, FOOTER_RULES } from "../src/pages/Landing";

const TOY = /\b(car|kart|vehicle|honk|balloon|collectible|rainbow|bounc\w*|kids?|playground|fun lab|joke|NPC|mascot)\b/i;

describe("campus layout", () => {
  it("three buildings; Chronarch and Continuum run and have doors (a route, another origin); Laterion is forthcoming with no door", () => {
    expect(BUILDINGS.map((b) => b.key)).toEqual(["chronarch", "continuum", "laterion"]);
    expect(buildingByKey("chronarch")).toMatchObject({ status: "RUNNING", windows: true, door: { kind: "route", to: "/chronarch" }, shade: "lab", at: 1 / 3 });
    expect(buildingByKey("continuum")).toMatchObject({ status: "RUNNING", windows: true, door: { kind: "external", href: "https://continuum.rexmetrix.com" }, shade: "shed", at: 2 / 3 });
    expect(buildingByKey("laterion")).toMatchObject({ status: "FORTHCOMING", windows: false, door: null, shade: "blank", at: 1 });
    expect(SIGN_LINES.continuum).toBe("CONTINUUM · RUNNING");
    expect(SIGN_LINES.laterion).toBe("LATERION · FORTHCOMING · NOT A DIAGNOSTIC");
    expect(GATE.label).toBe("REXMETRIX");
  });

  it("the story: 0 is the hero (farthest, all in frame), 1/3 Chronarch, 2/3 Continuum, 1 Laterion; between keyframes the goal interpolates; out of range clamps", () => {
    expect(KEYFRAMES.map((k) => k.at)).toEqual([0, 1 / 3, 2 / 3, 1]);
    const hero = storyGoal(0);
    for (const b of BUILDINGS) {
      const g = storyGoal(b.at);
      expect(g.target[0]).toBeCloseTo(b.center[0]);
      expect(g.target[2]).toBeCloseTo(b.center[2]);
      expect(g.dist).toBeLessThan(hero.dist);
    }
    const mid = storyGoal(1 / 6);
    expect(mid.dist).toBeLessThan(hero.dist);
    expect(mid.dist).toBeGreaterThan(storyGoal(1 / 3).dist);
    expect(storyGoal(-1)).toEqual(storyGoal(0));
    expect(storyGoal(2)).toEqual(storyGoal(1));
    expect(storyGoal(Number.NaN)).toEqual(storyGoal(0));
    for (const b of BUILDINGS) {
      const d = doorGoal(b.key, storyGoal(b.at));
      expect(d.dist).toBeLessThan(storyGoal(b.at).dist); // the door eases in, at the volume
      expect(d.target[0]).toBe(b.center[0]);
    }
    for (const p of [0, 0.1, 0.33, 0.5, 0.66, 0.9, 1]) for (const v of Object.values(storyGoal(p)).flat()) expect(Number.isFinite(v as number)).toBe(true);
  });

  it("chapters: at most three sentences each; Chronarch alone has a CTA; the copy is a contractor's, not a playground's", () => {
    expect(CHAPTERS.map((c) => c.key)).toEqual(["chronarch", "continuum", "laterion"]);
    for (const c of CHAPTERS) expect(c.sentences.length).toBeLessThanOrEqual(3);
    expect(CHAPTERS[0]!.door).toEqual({ kind: "route", to: "/chronarch" });
    expect(CHAPTERS[0]!.sentences[0]).toBe("Research software that is running.");
    expect(CHAPTERS[1]!.door).toEqual({ kind: "external", href: "https://continuum.rexmetrix.com" });
    expect(CHAPTERS[1]!.source?.href).toBe("https://github.com/rexautistikonlabs/scientificlab");
    expect(CHAPTERS[2]!.door).toBeNull();
    expect(CHAPTERS[2]!.source).toBeUndefined();
    expect(CHAPTERS[2]!.isNot).toEqual(["not a diagnostic", "not a person-score", "not an assessment of anyone"]);
    const copy = [...Object.values(SIGN_LINES), GATE.label, ...FOOTER_RULES, ...CHAPTERS.flatMap((c) => [c.name, ...c.sentences, ...c.isNot])].join("\n");
    expect(copy).not.toMatch(TOY);
    expect(copy).not.toMatch(/Three buildings on one plate/); // the manifesto is gone
    expect(copy).not.toMatch(/Face mapping|FACE MAP/);
    expect(copy).toMatch(/Laterion records facial kinematics including partial trials and laterality\./);
  });
});

/** The lab is data first: five pieces, each with an id, a sign, a sentence
 *  and a job; three of them are the products with their statuses and doors;
 *  every walk is a clear straight leg between stand points; the camera is a
 *  fixed shop-window view that only a drag or a door may move. */
import { describe, expect, it } from "vitest";

import { CONTINUUM_HOST, doorView, FIGURE, footprint, headingOf, HERO_VIEW, ORBIT, pathClear, pathLength, PROPS, propByKey, ROOM, samplePath, SIGN_LINES, STATIONS, turnTo, walkDuration, walkPath, type PropKey } from "../src/lab/labLayout";
import { findVisitorBanned } from "../src/lib/banned";
import { CHAPTERS, FOOTER_RULES } from "../src/pages/Landing";

const TOY = /\b(car|kart|vehicle|honk|balloon|collectible|rainbow|bounc\w*|kids?|playground|fun lab|joke|NPC|mascot|child|cartoon)\b/i;
const SCHOOL = /\b(universit(y|ies)|campus(es)?|quad|lecture|lawn|ivy|college|institute|faculty|students?)\b/i;
const CHAIN = /\b(tokens?|wallets?|DACO|Timechain|Chronos|Council|Chia|PoST|mainnet|chain)\b/i;

describe("lab layout", () => {
  it("five pieces in one room: the three products (running, running, not shipping), the spec board, the lab book; unique equipment ids", () => {
    expect(PROPS.map((p) => p.key)).toEqual(["chronarch", "continuum", "laterion", "specboard", "labbook"]);
    expect(STATIONS.map((s) => [s.key, s.status])).toEqual([["chronarch", "RUNNING"], ["continuum", "RUNNING"], ["laterion", "NOT SHIPPING"]]);
    expect(propByKey("chronarch")).toMatchObject({ kind: "bench-display", door: { kind: "route", to: "/chronarch" } });
    expect(propByKey("continuum")).toMatchObject({ kind: "console", door: { kind: "external", href: "https://continuum.rexmetrix.com" } });
    expect(CONTINUUM_HOST).toBe("https://continuum.rexmetrix.com");
    expect(propByKey("laterion")).toMatchObject({ kind: "covered-bench", status: "NOT SHIPPING", door: null });
    expect(propByKey("specboard")).toMatchObject({ kind: "board", status: null, door: null });
    expect(propByKey("labbook")).toMatchObject({ kind: "book", status: null, door: { kind: "route", to: "/chronarch/tech" } });
    expect(new Set(PROPS.map((p) => p.id)).size).toBe(PROPS.length);
    for (const p of PROPS) expect(p.id).toMatch(/^RX-0\d$/);
    expect(SIGN_LINES.chronarch).toBe("CHRONARCH · RUNNING");
    expect(SIGN_LINES.continuum).toBe("CONTINUUM · RUNNING");
    expect(SIGN_LINES.laterion).toBe("LATERION · NOT SHIPPING · NOT A DIAGNOSTIC");
    expect(SIGN_LINES.specboard).toBe("SPEC BOARD · LEGAL");
    expect(SIGN_LINES.labbook).toBe("LAB BOOK · WORKBENCH");
  });

  it("nothing on the floor is decoration: every piece has a sentence and a job — a door, the refusal, or the legal text", () => {
    for (const p of PROPS) {
      expect(p.sentence.length, p.key).toBeGreaterThan(40);
      const job = p.door !== null || p.key === "laterion" || p.key === "specboard";
      expect(job, `${p.key} has no job`).toBe(true);
    }
    expect(propByKey("laterion").sentence).toMatch(/Not shipping\. Not a diagnostic\. Not a person-score\./);
    expect(propByKey("laterion").sentence).toMatch(/cover|covered/i);
    expect(propByKey("laterion").sentence).not.toMatch(/camera|image|landmark|face/i);
    expect(propByKey("continuum").sentence).toMatch(/Model outputs, not measurements of a person/);
    expect(propByKey("continuum").sentence).toMatch(/own host/);
    expect(propByKey("specboard").sentence).toMatch(/legal text/i);
    expect(propByKey("labbook").sentence).toMatch(/names its parents/);
  });

  it("the copy is a lab's, not a school's, a toy's or a chain's; no banned visitor phrase; the example corpus is never named", () => {
    const copy = [...PROPS.flatMap((p) => [p.sign, p.sentence, p.id]), ...FOOTER_RULES, ...CHAPTERS.flatMap((c) => [c.name, ...c.sentences, ...c.isNot])].join("\n");
    expect(copy).not.toMatch(TOY);
    expect(copy).not.toMatch(SCHOOL);
    expect(copy).not.toMatch(CHAIN);
    expect(copy).not.toMatch(/Measurement is King|Autistikon|Face mapping|FACE MAP|steam|glassware|neon/i);
    expect(findVisitorBanned(copy)).toBeNull();
    for (const p of PROPS) expect(p.sign).not.toMatch(/Continuum[\s\S]{0,40}forthcoming|forthcoming[\s\S]{0,40}Continuum/i);
  });

  it("every piece stands inside the room, off the walls' thickness, and no two footprints overlap", () => {
    const { w, d } = ROOM;
    const boxes = PROPS.map((p) => ({ key: p.key, ...footprint(p) }));
    for (const b of boxes) {
      expect(b.x0, b.key).toBeGreaterThanOrEqual(-w / 2 + 0.06);
      expect(b.x1, b.key).toBeLessThanOrEqual(w / 2 - 0.06);
      expect(b.z0, b.key).toBeGreaterThanOrEqual(-d / 2 + 0.06);
      expect(b.z1, b.key).toBeLessThanOrEqual(d / 2 - 0.5); // never against the glass
    }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      const overlap = a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
      expect(overlap, `${a.key} overlaps ${b.key}`).toBe(false);
    }
  });

  it("the operator: an adult at a brisk walking pace; every stand point is clear of every footprint, and every walk between home and the pieces is a clear straight leg of a few seconds", () => {
    expect(FIGURE.height).toBeGreaterThanOrEqual(1.6);
    expect(FIGURE.height).toBeLessThanOrEqual(1.9);
    expect(FIGURE.speed).toBeGreaterThanOrEqual(1.2);
    expect(FIGURE.speed).toBeLessThanOrEqual(2.2);
    expect(FIGURE.maxS).toBeLessThanOrEqual(3);
    const points: [number, number][] = [FIGURE.home, ...PROPS.map((p) => p.standAt)];
    for (const [x, z] of points) {
      expect(Math.abs(x)).toBeLessThan(ROOM.w / 2 - 0.4);
      expect(Math.abs(z)).toBeLessThan(ROOM.d / 2 - 0.4);
      for (const p of PROPS) {
        const f = footprint(p);
        expect(x > f.x0 - 0.2 && x < f.x1 + 0.2 && z > f.z0 - 0.2 && z < f.z1 + 0.2, `a stand point sits on ${p.key}`).toBe(false);
      }
    }
    for (const from of points) for (const p of PROPS) {
      const path = walkPath(from, p.key);
      expect(path[path.length - 1]).toEqual(p.standAt);
      expect(pathClear(path), `walk from ${from} to ${p.key} crosses a piece`).toBe(true);
      const len = pathLength(path);
      expect(Number.isFinite(len)).toBe(true);
      expect(walkDuration(len)).toBeGreaterThanOrEqual(FIGURE.minS);
      expect(walkDuration(len)).toBeLessThanOrEqual(FIGURE.maxS);
      expect(samplePath(path, 0)).toEqual(from);
      expect(samplePath(path, len + 1)).toEqual(p.standAt);
      const mid = samplePath(path, len / 2);
      expect(mid[0]).toBeCloseTo((from[0] + p.standAt[0]) / 2);
      expect(mid[1]).toBeCloseTo((from[1] + p.standAt[1]) / 2);
    }
    expect(walkDuration(0)).toBe(FIGURE.minS);
    expect(walkDuration(1000)).toBe(FIGURE.maxS);
    expect(walkDuration(1.9)).toBeCloseTo(1);
  });

  it("headings and turns: yaw 0 faces the window (+z); a turn takes the short way round", () => {
    expect(headingOf([0, 0], [0, 1])).toBeCloseTo(0);
    expect(headingOf([0, 0], [1, 0])).toBeCloseTo(Math.PI / 2);
    expect(headingOf([0, 0], [0, -1])).toBeCloseTo(Math.PI);
    expect(turnTo(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2);
    expect(turnTo(0.1, 2 * Math.PI - 0.1)).toBeCloseTo(-0.1);
    expect(turnTo(3, -3)).toBeCloseTo(3 + (2 * Math.PI - 6));
    // the stand-point facings point at the pieces: the back-wall pieces face −z, the side-wall pieces face their wall
    expect(propByKey("chronarch").face).toBeCloseTo(Math.PI);
    expect(propByKey("specboard").face).toBeCloseTo(Math.PI);
    expect(propByKey("laterion").face).toBeCloseTo(Math.PI / 2);
    expect(propByKey("labbook").face).toBeCloseTo(-Math.PI / 2);
  });

  it("the camera: one shop-window view outside the glass, looking in; a drag stays inside ORBIT; a door eases at the piece, closer and lower", () => {
    expect(HERO_VIEW.dist).toBeGreaterThan(ROOM.d / 2);
    expect(HERO_VIEW.el).toBeGreaterThan(0.15);
    expect(HERO_VIEW.el - ORBIT.elDown).toBeGreaterThan(0.15); // never through the floor
    expect(Math.abs(HERO_VIEW.az) + ORBIT.az).toBeLessThan(Math.PI / 3); // never round the side wall
    for (const v of [HERO_VIEW.az, HERO_VIEW.el, HERO_VIEW.dist, ...HERO_VIEW.target]) expect(Number.isFinite(v)).toBe(true);
    for (const p of PROPS) {
      const d = doorView(p.key as PropKey, HERO_VIEW);
      expect(d.dist).toBeLessThan(HERO_VIEW.dist);
      expect(d.el).toBeLessThan(HERO_VIEW.el);
      expect(d.target[0]).toBe(p.at[0]);
      expect(d.target[2]).toBe(p.at[1]);
    }
  });

  it("chapters: at most three sentences each; the doors match the pieces; Laterion has no door and no source", () => {
    expect(CHAPTERS.map((c) => c.key)).toEqual(["chronarch", "continuum", "laterion"]);
    for (const c of CHAPTERS) {
      expect(c.sentences.length).toBeLessThanOrEqual(3);
      expect(c.door).toEqual(propByKey(c.key).door);
      expect(c.status).toBe(propByKey(c.key).status); // one status word per product: the chapter says what the station says
    }
    expect(CHAPTERS[1]!.source?.href).toBe("https://github.com/rexautistikonlabs/scientificlab");
    expect(CHAPTERS[2]!.source).toBeUndefined();
    expect(CHAPTERS[2]!.isNot).toEqual(["not a diagnostic", "not a person-score", "not an assessment of anyone"]);
  });
});

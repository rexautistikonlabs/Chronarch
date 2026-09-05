/** RexMetrix product law on every visitor-facing string (specs/LEGAL.md):
 *  the name is present, the honesty sentence is present, and no banned phrase
 *  appears — in the rendered floor and about page, or in the visitor sources. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { findVisitorBanned, VISITOR_BANNED } from "../src/lib/banned";
import { GATE_KEY } from "../src/lib/gate";
import { renderAt } from "./render";

const ROOT = join(__dirname, "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

describe("RexMetrix honesty", () => {
  beforeEach(() => window.localStorage.setItem(GATE_KEY, "1")); // past the gate; the gate itself is screened in gate.test
  it("the floor names Chronarch and says what it is not; the landing names RexMetrix and Chronarch and says the same", () => {
    const floor = renderAt("/chronarch");
    let text = document.body.textContent ?? "";
    expect(text).toMatch(/Chronarch/);
    expect(text).toMatch(/not Foundation-endorsed/i);
    expect(text).toMatch(/not a diagnostic/i);
    expect(text).toMatch(/not a public chain/i);
    floor.unmount();
    renderAt("/");
    text = document.body.textContent ?? "";
    expect(text).toMatch(/RexMetrix is a product house/);
    expect(text).toMatch(/Chronarch is research software/);
    expect(text).toMatch(/Not a public chain\. Not Foundation-endorsed\. Not a diagnostic\./);
  });

  it("the rendered landing, floor and about page carry no banned visitor phrase", () => {
    for (const path of ["/", "/chronarch", "/chronarch/about"]) {
      const { unmount } = renderAt(path);
      const text = document.body.textContent ?? "";
      expect(findVisitorBanned(text), `${path}: ${findVisitorBanned(text)}`).toBeNull();
      unmount();
    }
  });

  it("the visitor sources and programme fixtures carry no banned phrase", () => {
    const files = [
      ...walk(join(ROOT, "src/hud")),
      join(ROOT, "src/pages/Floor.tsx"),
      join(ROOT, "src/pages/About.tsx"),
      join(ROOT, "src/pages/Landing.tsx"),
      join(ROOT, "src/lib/gate.ts"),
      join(ROOT, "src/components/Gate.tsx"),
      join(ROOT, "src/components/TitleBeat.tsx"),
      ...walk(join(ROOT, "src/campus")),
      join(ROOT, "src/lib/human.ts"),
      join(ROOT, "src/lib/programme.ts"),
      join(ROOT, "src/components/StatusBanner.tsx"),
      join(ROOT, "index.html"),
      ...walk(join(ROOT, "fixtures")).filter((f) => /programme-|synthesis-/.test(f)),
    ];
    const hits: string[] = [];
    for (const f of files) {
      const hit = findVisitorBanned(readFileSync(f, "utf8"));
      if (hit) hits.push(`${relative(ROOT, f)}: ${hit}`);
    }
    expect(hits).toEqual([]);
  });

  it("the ban list is product law, negation-aware only for the endorsement", () => {
    expect(VISITOR_BANNED.length).toBeGreaterThanOrEqual(14);
    expect(findVisitorBanned("It is not Foundation-endorsed.")).toBeNull();
    expect(findVisitorBanned("RexMetrix is Foundation-" + "endorsed.")).not.toBeNull();
    expect(findVisitorBanned("a public block" + "chain")).not.toBeNull();
    expect(findVisitorBanned("not a public block" + "chain")).not.toBeNull(); // even negated, the floor does not say it
    expect(findVisitorBanned("Council govern" + "ance by ballot")).not.toBeNull();
    expect(findVisitorBanned("a diagnostic sc" + "ore")).not.toBeNull();
    expect(findVisitorBanned("counselling and governance")).toBeNull(); // no false positive on ordinary words
    expect(findVisitorBanned("examining and determining")).toBeNull(); // "mining" only as a word
  });

  it("the about page says who owns the volume's prose and that Autistikon is the example programme", () => {
    renderAt("/chronarch/about");
    const panel = screen.getByTestId("about-panel");
    expect(panel).toHaveTextContent(/^.*Chronarch/);
    expect(panel).toHaveTextContent(/example programme and first corpus/);
    expect(panel).toHaveTextContent(/author's copyright/);
    expect(panel).toHaveTextContent(/INDIVIDUAL_SCORE_FORBIDDEN/);
    expect(panel).toHaveTextContent(/endorsement by any Foundation/);
  });
});

/** Without WebGL (jsdom) the landing is the hero and three stacked chapters;
 *  the well is never imported or mounted on /. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderAt } from "./render";

describe("landing without WebGL", () => {
  it("stacks the chapters with mode no-webgl; 0 canvas; the well is absent; the three names and the negations are present", () => {
    renderAt("/");
    expect(screen.getByTestId("landing-body")).toHaveAttribute("data-mode", "no-webgl");
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
    expect(screen.queryByTestId("campus-viewport")).not.toBeInTheDocument();
    expect(screen.queryByTestId("viewport")).not.toBeInTheDocument();
    expect(screen.queryByTestId("viewport-fallback")).not.toBeInTheDocument();
    for (const k of ["chronarch", "continuum", "laterion"]) expect(screen.getByTestId(`chapter-${k}`)).toHaveAttribute("id", k);
    const body = document.body.textContent ?? "";
    for (const s of ["Chronarch", "Continuum", "Laterion", "not a diagnostic", "not Foundation-endorsed", "not a person-score", "not an assessment of anyone"]) expect(body).toContain(s);
  });

  it("the landing and the campus never import the Chronarch well scene", () => {
    const root = join(__dirname, "..");
    for (const rel of ["src/pages/Landing.tsx", "src/campus/Campus.tsx", "src/campus/CampusRig.tsx", "src/campus/campusLayout.ts", "src/campus/materials.ts"]) {
      const text = readFileSync(join(root, rel), "utf8");
      expect(text, rel).not.toMatch(/scene\/Well|Catalogue3D|scene\/Timechain|scene\/Council|scene\/Hearth|scene\/PinsWell|scene\/DummyMind|scene\/Energy/);
    }
  });
});

/** Without WebGL (jsdom) the landing is the hero, the HTML station list and
 *  three stacked chapters; the well is never imported or mounted on /. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderAt } from "./render";

describe("landing without WebGL", () => {
  it("mode no-webgl; 0 canvas; the station list and the chapters; the well is absent; the three names and the negations are present", () => {
    renderAt("/");
    expect(screen.getByTestId("landing-body")).toHaveAttribute("data-mode", "no-webgl");
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
    expect(screen.queryByTestId("lab-viewport")).not.toBeInTheDocument();
    expect(screen.queryByTestId("viewport")).not.toBeInTheDocument();
    expect(screen.queryByTestId("viewport-fallback")).not.toBeInTheDocument();
    const list = screen.getByTestId("station-list");
    expect(within(list).getByTestId("station-door-chronarch")).toHaveAttribute("href", "/chronarch");
    expect(within(list).getByTestId("station-door-continuum")).toHaveAttribute("href", "https://continuum.rexmetrix.com");
    expect(within(list).getByTestId("station-laterion").querySelectorAll("a")).toHaveLength(0);
    for (const k of ["chronarch", "continuum", "laterion"]) expect(screen.getByTestId(`chapter-${k}`)).toHaveAttribute("id", k);
    const body = document.body.textContent ?? "";
    for (const s of ["Chronarch", "Continuum", "Laterion", "not a diagnostic", "not Foundation-endorsed", "not a person-score", "not an assessment of anyone"]) expect(body).toContain(s);
  });

  it("the landing and the lab never import the Chronarch well scene", () => {
    const root = join(__dirname, "..");
    for (const rel of ["src/pages/Landing.tsx", "src/lab/Lab.tsx", "src/lab/LabRig.tsx", "src/lab/Figure.tsx", "src/lab/labLayout.ts", "src/lab/materials.ts", "src/lab/baked.ts"]) {
      const text = readFileSync(join(root, rel), "utf8");
      expect(text, rel).not.toMatch(/scene\/Well|Catalogue3D|scene\/Timechain|scene\/Council|scene\/Hearth|scene\/PinsWell|scene\/DummyMind|scene\/Energy/);
    }
  });
});

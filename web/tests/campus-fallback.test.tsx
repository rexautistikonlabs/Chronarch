/** Without WebGL (jsdom) the landing stands as the three cards; the well is
 *  never imported or mounted on /. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderAt } from "./render";

describe("landing without WebGL", () => {
  it("falls back to the catalogue cards with reason no-webgl; 0 canvas; the well is absent", () => {
    renderAt("/");
    expect(screen.getByTestId("landing-body")).toHaveAttribute("data-mode", "no-webgl");
    expect(screen.getByTestId("campus-fallback")).toHaveAttribute("data-reason", "no-webgl");
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
    expect(within(screen.getByTestId("catalogue")).getAllByRole("listitem").filter((li) => li.hasAttribute("data-status"))).toHaveLength(3);
    expect(screen.queryByTestId("viewport")).not.toBeInTheDocument();
    expect(screen.queryByTestId("viewport-fallback")).not.toBeInTheDocument();
    expect(screen.queryByTestId("campus-viewport")).not.toBeInTheDocument();
    const body = document.body.textContent ?? "";
    for (const s of ["Chronarch", "Continuum", "Face mapping", "not a diagnostic", "not Foundation-endorsed"]) expect(body).toContain(s);
  });

  it("the landing and the campus never import the Chronarch well scene", () => {
    const root = join(__dirname, "..");
    for (const rel of ["src/pages/Landing.tsx", "src/campus/Campus.tsx", "src/campus/CampusRig.tsx", "src/campus/campusLayout.ts"]) {
      const text = readFileSync(join(root, rel), "utf8");
      expect(text, rel).not.toMatch(/scene\/Well|Catalogue3D|scene\/Timechain|scene\/Council|scene\/Hearth|scene\/PinsWell|scene\/DummyMind|scene\/Energy/);
    }
  });
});

/** Public words match the products: the root README leads with the product,
 *  not the organism; a cold workbench is not Programme Zero; Continuum is one
 *  product with one host. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CONTINUUM_URL } from "../src/lib/legal";
import { renderAt } from "./render";

const ROOT = join(__dirname, "..", "..");
const SUBSTRATE = /\bDACO\b|\bTimechain\b|\bChronos\b|\bblood\b|\bCouncil\b|\bPoST\b/;
const NEAR = /Continuum[\s\S]{0,60}(ledger|Timechain|forthcoming)|(ledger|Timechain|forthcoming)[\s\S]{0,60}Continuum/i;

describe("README", () => {
  it("the root README's first 40 lines are the product — LLC or workbench — with no substrate word", () => {
    const lines = readFileSync(join(ROOT, "README.md"), "utf8").split("\n").slice(0, 40).join("\n");
    expect(lines).toMatch(/RexMetrix Technologies, LLC|workbench/);
    expect(lines).toMatch(/RexMetrix Technologies, LLC/);
    expect(lines).toMatch(/workbench/);
    expect(lines).toMatch(/https:\/\/continuum\.rexmetrix\.com/);
    expect(lines).toMatch(/Not a diagnostic/);
    expect(lines).toMatch(/501\(c\)\(3\)/);
    expect(lines).not.toMatch(SUBSTRATE);
    expect(lines).not.toMatch(/organism/i);
  });

  it("the substrate sits under an implementation heading, after the product", () => {
    const text = readFileSync(join(ROOT, "README.md"), "utf8");
    const heading = text.indexOf("## Implementation note (lab-v0 substrate)");
    expect(heading).toBeGreaterThan(0);
    expect(text.indexOf("DACO")).toBeGreaterThan(heading);
    expect(text.indexOf("Chronos is blood")).toBeGreaterThan(heading);
    expect(text.indexOf("Timechain")).toBeGreaterThan(heading);
  });

  it("web/README leads with the same product and has no chain word above the fold", () => {
    const lines = readFileSync(join(ROOT, "web", "README.md"), "utf8").split("\n").slice(0, 40).join("\n");
    expect(lines).toMatch(/RexMetrix Technologies, LLC/);
    expect(lines).toMatch(/workbench/);
    expect(lines).not.toMatch(SUBSTRATE);
    expect(lines).not.toMatch(/public chain|blockchain/i);
  });

  it("Continuum is one product: never near ledger, Timechain or forthcoming in either README or the landing sources (the negation 'not a programme ledger' aside)", () => {
    const negate = (t: string) => t.replace(/not a programme ledger/gi, "");
    const stripComments = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'])\/\/.*$/gm, "$1");
    for (const rel of ["README.md", "web/README.md", "specs/PRODUCT.md"]) expect(negate(readFileSync(join(ROOT, rel), "utf8")), rel).not.toMatch(NEAR); // prose: whole text
    for (const rel of ["web/src/pages/Landing.tsx", "web/src/lib/legal.ts", "web/src/campus/campusLayout.ts"]) {
      // source: each string literal and JSX text node on its own, as the build's chrome law does
      const text = stripComments(readFileSync(join(ROOT, rel), "utf8"));
      for (const lit of text.match(/"[^"\n]*"|'[^'\n]*'|`[^`]*`|>[^<{}]+</g) ?? []) expect(negate(lit), `${rel}: ${lit.slice(0, 80)}`).not.toMatch(NEAR);
    }
  });
});

describe("defaults", () => {
  it("a cold workbench is not Programme Zero: Classics is the loaded programme, All is the filter, the Autistikon chip is an example corpus", () => {
    renderAt("/chronarch/tech");
    expect(screen.getByTestId("tech-programme-classics.json")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("tech-programme-zero.json")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("filter-all")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("filter-autistikon")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("filter-autistikon")).toHaveTextContent(/example corpus — not the product/);
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
  });

  it("the well opens on Classics too, and the Programme Zero chip still loads the example corpus on request", () => {
    renderAt("/chronarch");
    expect(screen.getByTestId("viewport-fallback")).toHaveAttribute("data-programme", "programme-classics");
    expect(screen.getByTestId("chip-programme-zero.json")).toBeInTheDocument();
  });

  it("Continuum's primary href stays https://continuum.rexmetrix.com and the landing chapter says what it is", () => {
    renderAt("/");
    expect(screen.getByTestId("cta-continuum")).toHaveAttribute("href", CONTINUUM_URL);
    expect(screen.getByTestId("landing-to-continuum")).toHaveAttribute("href", CONTINUUM_URL);
    const ch = screen.getByTestId("chapter-continuum");
    expect(ch).toHaveTextContent(/literature-informed biotensegrity and afferent-flow teaching simulation/);
    expect(ch).toHaveTextContent(/Model outputs, not measurements of a person\. Not a diagnostic\. Not a programme ledger\./);
    expect(ch).toHaveAttribute("data-status", "RUNNING");
    expect(screen.getByTestId("legal-strip")).toHaveTextContent(/teaching simulation on https:\/\/continuum\.rexmetrix\.com/);
  });
});

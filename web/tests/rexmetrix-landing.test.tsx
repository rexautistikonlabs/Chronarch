/** Brand split: RexMetrix is the company and lands at /; Chronarch is this
 *  product and runs under /chronarch. Old paths keep working. The landing is a
 *  flat catalogue with the honesty sentence and no canvas. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { GATE_KEY } from "../src/lib/gate";

import { findVisitorBanned } from "../src/lib/banned";
import { STAND_INS } from "../src/lib/filters";
import { CHAPTERS } from "../src/pages/Landing";
import { renderAt } from "./render";

const visibleIds = () => Array.from(document.querySelectorAll('[data-testid^="select-work-"]')).map((el) => (el.getAttribute("data-testid") ?? "").replace(/^select-/, ""));

describe("RexMetrix landing", () => {
  beforeEach(() => window.localStorage.setItem(GATE_KEY, "1"));
  it("/ is the story: hero, then Chronarch, Continuum, Laterion; the honesty sentence; no canvas without WebGL; no well", () => {
    renderAt("/");
    const body = document.body.textContent ?? "";
    expect(screen.getByTestId("landing-page")).toBeInTheDocument();
    expect(screen.getByTestId("landing-title")).toHaveTextContent("RexMetrix");
    expect(body).toContain("Chronarch");
    expect(body).toContain("Continuum");
    expect(body).toContain("Laterion");
    expect(body).toMatch(/not a diagnostic/i);
    expect(screen.getByTestId("landing-honesty")).toHaveTextContent("RexMetrix is a product house. Chronarch is research software. Not a public chain. Not Foundation-endorsed. Not a diagnostic.");
    expect(document.querySelectorAll("canvas")).toHaveLength(0); // jsdom: no WebGL, so the chapters stack
    expect(screen.queryByTestId("viewport")).not.toBeInTheDocument();
    expect(screen.queryByTestId("viewport-fallback")).not.toBeInTheDocument();
    expect(screen.queryByTestId("hud-top")).not.toBeInTheDocument();
    expect(screen.getByTestId("chapters").querySelectorAll("section")).toHaveLength(3);
    expect(screen.getByTestId("chapter-chronarch")).toHaveAttribute("data-status", "RUNNING");
    expect(screen.getByTestId("chapter-continuum")).toHaveAttribute("data-status", "RUNNING");
    expect(screen.getByTestId("chapter-laterion")).toHaveAttribute("data-status", "FORTHCOMING");
    expect(screen.getByTestId("chapter-laterion")).toHaveTextContent(/not a diagnostic/);
    expect(screen.getByTestId("chapter-laterion")).toHaveTextContent(/not a person-score/);
    expect(screen.getByTestId("landing-footer")).toHaveTextContent(/Domain reserved for the RexMetrix landing/);
    expect(screen.getByTestId("landing-footer")).not.toHaveTextContent(/DNS is live/);
  });

  it("the landing carries no banned phrase and makes none of the forbidden positive claims", () => {
    renderAt("/");
    const body = document.body.textContent ?? "";
    expect(findVisitorBanned(body)).toBeNull();
    expect(body.replace(/(not|no|never)[\s-]+Foundation-endorsed/gi, "")).not.toMatch(/Foundation-endorsed/);
    expect(body.replace(/not a public chain/gi, "")).not.toMatch(/public chain/i);
    expect(body).not.toMatch(/\b(is|as|an?) (assessment|score|scoring|rating) of (a|any|the|each) person\b/i);
    expect(body).not.toMatch(/\bscores? (a|the|each) person\b/i);
    expect(body).not.toMatch(/\bassess(es|ing)? (a|the|each) person\b/i);
    expect(body).not.toMatch(/Chronarch is RexMetrix/);
    expect(body).toMatch(/Chronarch is one of its products/);
    for (const c of CHAPTERS.filter((x) => x.status === "FORTHCOMING")) expect(c.door).toBeNull(); // a forthcoming product has no door
    expect(body).not.toMatch(/Face mapping|FACE MAP/);
    expect(body).toContain("Laterion");
    expect(body).not.toMatch(/Laterion is (running|shipping|live)/);
    expect(document.querySelector('a[href="https://github.com/rexautistikonlabs/scientificlab"]')).not.toBeNull();
  });

  it("Chronarch still runs the bench: /chronarch/tech is the workbench, /tech redirects there, Autistikon shows exactly two stand-ins; /chronarch is the well; /about redirects to About Chronarch", () => {
    const direct = renderAt("/chronarch/tech");
    expect(screen.getByTestId("tech-bench")).toBeInTheDocument();
    expect(screen.getByTestId("filters")).toBeInTheDocument();
    expect(screen.getByTestId("title-row")).toHaveTextContent("Chronarch · Technician · workbench");
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
    direct.unmount();

    const old = renderAt("/tech");
    expect(screen.getByTestId("tech-bench")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("filter-autistikon"));
    expect(new Set(visibleIds())).toEqual(new Set(STAND_INS));
    expect(visibleIds()).toHaveLength(2);
    expect(screen.getByTestId("to-rexmetrix")).toHaveAttribute("href", "/");
    old.unmount();

    const well = renderAt("/chronarch");
    expect(screen.getByTestId("viewport-fallback")).toBeInTheDocument(); // jsdom: the well's still fallback
    expect(screen.getByTestId("title-row")).toHaveTextContent("Chronarch");
    expect(screen.getByTestId("to-tech")).toHaveAttribute("href", "/chronarch/tech");
    expect(screen.getByTestId("to-about")).toHaveAttribute("href", "/chronarch/about");
    well.unmount();

    renderAt("/about");
    expect(screen.getByTestId("about-panel")).toHaveTextContent(/Chronarch/);
    expect(screen.getByTestId("about-panel")).toHaveTextContent(/what chronarch will not ship/i);
  });

  it("landing links point into Chronarch", () => {
    renderAt("/");
    expect(screen.getByTestId("landing-to-chronarch")).toHaveAttribute("href", "/chronarch");
    expect(screen.getByTestId("landing-to-tech")).toHaveAttribute("href", "/chronarch/tech");
    expect(screen.getByTestId("cta-chronarch")).toHaveAttribute("href", "/chronarch");
  });

  it("public/CNAME is exactly rexmetrix.com and the SPA fallback file exists", () => {
    expect(readFileSync(join(__dirname, "..", "public", "CNAME"), "utf8").trim()).toBe("rexmetrix.com");
    expect(readFileSync(join(__dirname, "..", "public", "_redirects"), "utf8")).toMatch(/^\/\*\s+\/index\.html\s+200\s*$/);
  });
});

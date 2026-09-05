/** The campus story on /: one canvas when motion is allowed and WebGL is
 *  present, none under prefers-reduced-motion; almost no chrome on the hero;
 *  three chapters; Chronarch is the only door; the other buildings scroll to
 *  their chapter. The Canvas is stubbed here (jsdom has no WebGL); the real
 *  one is checked in the browser. */
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BuildingKey } from "../src/campus/campusLayout";
import { renderAt } from "./render";

vi.mock("../src/campus/Campus", () => ({
  webglAvailable: () => true,
  Campus: ({ onPick }: { onPick: (k: BuildingKey) => void }) => (
    <div data-testid="campus-viewport">
      <canvas data-testid="campus-canvas" />
      <button type="button" data-testid="sign-chronarch" onClick={() => onPick("chronarch")}>CHRONARCH · RUNNING</button>
      <button type="button" data-testid="sign-continuum" onClick={() => onPick("continuum")}>CONTINUUM · FORTHCOMING</button>
      <button type="button" data-testid="sign-laterion" onClick={() => onPick("laterion")}>LATERION · FORTHCOMING · NOT A DIAGNOSTIC</button>
    </div>
  ),
}));

const reduceStub = (matches: boolean) => (q: string) => ({ matches: matches && q.includes("reduce"), media: q, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false });

describe("RexMetrix campus story", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("/ mounts one canvas when motion is allowed; the hero is STATUS, the wordmark and two text links — no manifesto box, no plates row", () => {
    renderAt("/");
    expect(screen.getByTestId("landing-body")).toHaveAttribute("data-mode", "campus");
    expect(document.querySelectorAll("canvas")).toHaveLength(1);
    const hero = screen.getByTestId("hero");
    expect(within(hero).getByTestId("landing-honesty")).toHaveTextContent("RexMetrix is a product house. Chronarch is research software. Not a public chain. Not Foundation-endorsed. Not a diagnostic.");
    expect(within(hero).getByTestId("landing-title")).toHaveTextContent("RexMetrix");
    const links = within(within(hero).getByTestId("landing-nav")).getAllByRole("link");
    expect(links.map((a) => a.textContent)).toEqual(["Chronarch", "Workbench"]);
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/chronarch", "/chronarch/tech"]);
    // the busyness is gone
    expect(screen.queryByTestId("campus-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("campus-legend")).not.toBeInTheDocument();
    expect(hero.textContent).not.toMatch(/Three buildings on one plate|how RexMetrix talks|builds research instruments/);
    expect(hero.querySelectorAll("button")).toHaveLength(0);
    // honesty lives in STATUS on the first screen only
    expect(screen.getAllByText(/Not Foundation-endorsed\./)).toHaveLength(1);
  });

  it("three chapters follow the hero with deep-link ids and scroll margins; Chronarch has the CTA, the others say forthcoming with no route and no engine link", () => {
    renderAt("/");
    const chapters = screen.getByTestId("chapters");
    const ids = Array.from(chapters.querySelectorAll("section")).map((s) => s.id);
    expect(ids).toEqual(["chronarch", "continuum", "laterion"]);
    for (const s of Array.from(chapters.querySelectorAll("section"))) expect((s as HTMLElement).style.scrollMarginTop).toBe("3rem");
    const ch = screen.getByTestId("chapter-chronarch");
    expect(ch).toHaveTextContent("Research software that is running.");
    expect(within(ch).getByTestId("cta-chronarch")).toHaveAttribute("href", "/chronarch");
    expect(within(ch).getByTestId("cta-chronarch")).toHaveTextContent("Open Chronarch");
    expect(ch.querySelectorAll("p").length).toBeLessThanOrEqual(6); // label, ≤3 sentences, is-not
    const co = screen.getByTestId("chapter-continuum");
    expect(co).toHaveTextContent(/FORTHCOMING/);
    // Continuum's one link is its source on GitHub: an external text link, not an in-app route
    const anchors = co.querySelectorAll("a");
    expect(anchors).toHaveLength(1);
    expect(anchors[0]).toHaveAttribute("href", "https://github.com/rexautistikonlabs/scientificlab");
    expect(anchors[0]).toHaveAttribute("target", "_blank");
    expect(anchors[0]).toHaveAttribute("rel", "noopener noreferrer");
    expect(anchors[0]).toHaveTextContent(/^Continuum source/);
    expect(within(co).getByTestId("forthcoming-continuum")).toBeInTheDocument();
    expect(co).toHaveTextContent(/nothing of it is embedded here/);
    const fm = screen.getByTestId("chapter-laterion");
    expect(fm).toHaveTextContent(/FORTHCOMING/);
    expect(within(fm).getByTestId("is-not-laterion")).toHaveTextContent("not a diagnostic · not a person-score · not an assessment of anyone");
    expect(fm.querySelectorAll("a")).toHaveLength(0);
    for (const a of Array.from(document.querySelectorAll("a"))) expect(a.getAttribute("href") ?? "").not.toMatch(/^\/(continuum|laterion|face)/);
    expect(screen.getByTestId("chapter-laterion")).toHaveTextContent("Laterion records facial kinematics including partial trials and laterality.");
    expect(screen.getByTestId("chapter-laterion")).toHaveTextContent(/not shipping in this repository/);
    const body = document.body.textContent ?? "";
    expect(body).toContain("Laterion");
    expect(body).not.toMatch(/Face mapping|FACE MAP/);
    expect(screen.getByTestId("landing-footer")).toHaveTextContent(/Domain reserved for the RexMetrix landing/);
    expect(screen.getByTestId("landing-footer")).not.toHaveTextContent(/DNS is live|is live/);
  });

  it("clicking the Chronarch building navigates to /chronarch and unmounts the campus; clicking Continuum or Laterion only scrolls to the chapter", () => {
    const spy = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(function (this: Element) { (this as HTMLElement).dataset.scrolledTo = "1"; });
    renderAt("/");
    fireEvent.click(screen.getByTestId("sign-continuum"));
    expect(screen.getByTestId("landing-body")).toBeInTheDocument(); // still on /
    expect(screen.getByTestId("chapter-continuum")).toHaveAttribute("data-scrolled-to", "1");
    fireEvent.click(screen.getByTestId("sign-laterion"));
    expect(screen.getByTestId("chapter-laterion")).toHaveAttribute("data-scrolled-to", "1");
    expect(screen.getByTestId("landing-body")).toBeInTheDocument();
    expect(spy).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByTestId("sign-chronarch"));
    expect(screen.queryByTestId("campus-viewport")).not.toBeInTheDocument();
    expect(screen.queryByTestId("landing-body")).not.toBeInTheDocument();
    expect(screen.getByTestId("viewport-fallback")).toBeInTheDocument(); // the well (jsdom: its still fallback)
    expect(screen.getByTestId("title-row")).toHaveTextContent("Chronarch");
    spy.mockRestore();
  });

  it("0 canvas under prefers-reduced-motion: three stacked HTML chapters with the three names", () => {
    vi.stubGlobal("matchMedia", reduceStub(true));
    renderAt("/");
    expect(screen.getByTestId("landing-body")).toHaveAttribute("data-mode", "reduced-motion");
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
    expect(screen.queryByTestId("campus-viewport")).not.toBeInTheDocument();
    expect(screen.getByTestId("chapters").querySelectorAll("section")).toHaveLength(3);
    const body = document.body.textContent ?? "";
    for (const s of ["Chronarch", "Continuum", "Laterion", "not a diagnostic", "not a person-score", "not an assessment of anyone"]) expect(body).toContain(s);
    expect(body).not.toMatch(/Face mapping|FACE MAP/);
  });

  it("there is no /laterion route: it lands on the 404 with no canvas and no camera", () => {
    renderAt("/laterion");
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
    expect(document.querySelectorAll("video")).toHaveLength(0);
    expect(document.body.textContent).toMatch(/No such page/);
    // a flat page: the well is not mounted behind an unknown route (jsdom would show its still fallback)
    expect(screen.queryByTestId("viewport")).not.toBeInTheDocument();
    expect(screen.queryByTestId("viewport-fallback")).not.toBeInTheDocument();
    expect(screen.getByTestId("flat-page")).toBeInTheDocument();
  });

  it("/chronarch/tech is still HTML with 0 canvas and the Autistikon filter shows exactly two stand-ins", () => {
    renderAt("/chronarch/tech");
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
    fireEvent.click(screen.getByTestId("filter-autistikon"));
    const ids = Array.from(document.querySelectorAll('[data-testid^="select-work-"]')).map((el) => el.getAttribute("data-testid"));
    expect(ids.sort()).toEqual(["select-work-pz-ledger-structure", "select-work-pz-register-structure"]);
  });
});

/** The landing opens on law: a still gate before any 3D, then one title beat,
 *  then the campus. Return visits skip the gate. Chronarch and Continuum are
 *  doors; Laterion is not. The Canvas is stubbed (jsdom has no WebGL). */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BuildingKey } from "../src/campus/campusLayout";
import { findVisitorBanned } from "../src/lib/banned";
import { ATTRIBUTIONS, CONTINUUM_URL, exits, GATE_KEY, GATE_LINES, TITLE_LINE } from "../src/lib/gate";
import { renderAt } from "./render";

vi.mock("../src/campus/Campus", () => ({
  webglAvailable: () => true,
  Campus: ({ onPick }: { onPick: (k: BuildingKey) => void }) => (
    <div data-testid="campus-viewport">
      <canvas data-testid="campus-canvas" />
      <button type="button" data-testid="sign-chronarch" onClick={() => onPick("chronarch")}>CHRONARCH · RUNNING</button>
      <button type="button" data-testid="sign-continuum" onClick={() => onPick("continuum")}>CONTINUUM · RUNNING</button>
      <button type="button" data-testid="sign-laterion" onClick={() => onPick("laterion")}>LATERION · FORTHCOMING · NOT A DIAGNOSTIC</button>
    </div>
  ),
}));

const reduceStub = (matches: boolean) => (q: string) => ({ matches: matches && q.includes("reduce"), media: q, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false });
const accept = () => { fireEvent.click(screen.getByTestId("gate-check")); fireEvent.click(screen.getByTestId("gate-enter")); };

describe("gate", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("a first visit is the gate alone: the four lines, the two attributions, a disabled button, no campus and no canvas", () => {
    renderAt("/");
    const gate = screen.getByTestId("gate");
    for (const l of GATE_LINES) expect(gate).toHaveTextContent(l);
    expect(gate).toHaveTextContent("RexMetrix is a product house. Chronarch and Continuum are research software.");
    expect(gate).toHaveTextContent("Not a public chain. Not Foundation-endorsed. Not a diagnostic. Not a medical device.");
    expect(gate).toHaveTextContent("Continuum is a simulation; its numbers are model outputs, not measurements of any person.");
    expect(gate).toHaveTextContent("Laterion is not shipping here.");
    for (const a of ATTRIBUTIONS) {
      const link = within(gate).getByTestId(`attribution-${a.label}`);
      expect(link).toHaveAttribute("href", a.href);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    expect(gate).toHaveTextContent(/Credit, not endorsement/);
    expect(screen.getByTestId("gate-enter")).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByTestId("campus-viewport")).not.toBeInTheDocument();
    expect(screen.queryByTestId("landing-body")).not.toBeInTheDocument();
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
    expect(window.localStorage.getItem(GATE_KEY)).toBeNull();
    // the honesty: banned phrases absent, the endorsement only ever negated and adjacent
    const text = gate.textContent ?? "";
    expect(findVisitorBanned(text)).toBeNull();
    expect(text).toMatch(/Not Foundation-endorsed\./);
    expect(text.replace(/(not|no|never)[\s-]+Foundation-endorsed/gi, "")).not.toMatch(/Foundation-endorsed/);
    // the button does nothing until the box is ticked
    fireEvent.click(screen.getByTestId("gate-enter"));
    expect(screen.getByTestId("gate")).toBeInTheDocument();
  });

  it("tick + Enter writes the flag, shows the title once, then the campus; the title is gone after its one-shot", async () => {
    renderAt("/");
    accept();
    expect(window.localStorage.getItem(GATE_KEY)).toBe("1");
    expect(screen.queryByTestId("gate")).not.toBeInTheDocument();
    expect(screen.getByTestId("title-line")).toHaveTextContent(TITLE_LINE);
    expect(screen.getByTestId("title-line").textContent).toBe("Measurement is King!");
    expect(screen.getByTestId("landing-body")).toHaveAttribute("data-mode", "campus");
    expect(document.querySelectorAll("canvas")).toHaveLength(1);
    await waitFor(() => expect(screen.queryByTestId("title-beat")).not.toBeInTheDocument(), { timeout: 6000 });
    expect(screen.getByTestId("campus-viewport")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("Measurement is King!"); // once, and it does not come back
  }, 10000);

  it("a return visit skips the gate and the title: the campus is there on remount", () => {
    window.localStorage.setItem(GATE_KEY, "1");
    renderAt("/");
    expect(screen.queryByTestId("gate")).not.toBeInTheDocument();
    expect(screen.queryByTestId("title-beat")).not.toBeInTheDocument();
    expect(screen.getByTestId("landing-body")).toHaveAttribute("data-mode", "campus");
    expect(screen.getByTestId("landing-honesty")).toHaveTextContent(/Not Foundation-endorsed\./);
  });

  it("reduced motion: the same gate, no title tween, no canvas; the products are still named after entering", () => {
    vi.stubGlobal("matchMedia", reduceStub(true));
    renderAt("/");
    expect(screen.getByTestId("gate")).toBeInTheDocument();
    accept();
    expect(screen.queryByTestId("title-beat")).not.toBeInTheDocument();
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
    expect(screen.getByTestId("landing-body")).toHaveAttribute("data-mode", "reduced-motion");
    const body = document.body.textContent ?? "";
    for (const s of ["Chronarch", "Continuum", "Laterion", "not a diagnostic", "not a person-score", "not an assessment of anyone"]) expect(body).toContain(s);
  });
});

describe("doors", () => {
  afterEach(() => vi.restoreAllMocks());

  it("Continuum is an activated door: its sign and CTA leave this origin for continuum.rexmetrix.com after the door tween; Chronarch's door is /chronarch; Laterion has no href anywhere", async () => {
    window.localStorage.setItem(GATE_KEY, "1");
    const leave = vi.spyOn(exits, "leave").mockImplementation(() => {});
    renderAt("/");
    expect(screen.getByTestId("landing-to-continuum")).toHaveAttribute("href", CONTINUUM_URL);
    expect(screen.getByTestId("cta-continuum")).toHaveAttribute("href", CONTINUUM_URL);
    expect(screen.getByTestId("cta-continuum")).toHaveAttribute("data-door", "external");
    expect(screen.getByTestId("cta-chronarch")).toHaveAttribute("href", "/chronarch");
    expect(screen.getByTestId("chapter-continuum")).toHaveTextContent(/CONTINUUM · RUNNING/);
    expect(screen.getByTestId("chapter-continuum")).toHaveTextContent("Continuum is a simulation; its numbers are model outputs, not measurements of any person.");
    // Laterion: chapter only, no anchor at all
    expect(screen.getByTestId("chapter-laterion").querySelectorAll("a")).toHaveLength(0);
    expect(screen.getByTestId("forthcoming-laterion")).toBeInTheDocument();
    for (const a of Array.from(document.querySelectorAll("a"))) expect(a.getAttribute("href") ?? "").not.toMatch(/laterion/i);
    // the sign: door tween, then leave
    fireEvent.click(screen.getByTestId("sign-continuum"));
    expect(screen.getByTestId("door-iris")).toBeInTheDocument();
    expect(screen.getByTestId("landing-body")).toHaveAttribute("data-leaving", "continuum");
    expect(leave).not.toHaveBeenCalled(); // not before the door has opened
    await waitFor(() => expect(leave).toHaveBeenCalledWith(CONTINUUM_URL), { timeout: 4000 });
    expect(leave).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("campus-viewport") ?? document.body).toBeTruthy(); // Continuum is never mounted here
    expect(document.body.textContent).not.toMatch(/iframe|embedded Continuum/i);
    expect(document.querySelectorAll("iframe")).toHaveLength(0);
  }, 8000);

  it("Chronarch's door: the sign opens the door, then the route changes and the campus unmounts; Laterion's sign only scrolls", async () => {
    window.localStorage.setItem(GATE_KEY, "1");
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(function (this: Element) { (this as HTMLElement).dataset.scrolledTo = "1"; });
    renderAt("/");
    fireEvent.click(screen.getByTestId("sign-laterion"));
    expect(screen.getByTestId("chapter-laterion")).toHaveAttribute("data-scrolled-to", "1");
    expect(screen.queryByTestId("door-iris")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("sign-chronarch"));
    expect(screen.getByTestId("door-iris")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId("landing-body")).not.toBeInTheDocument(), { timeout: 4000 });
    expect(screen.queryByTestId("campus-viewport")).not.toBeInTheDocument();
    expect(screen.getByTestId("viewport-fallback")).toBeInTheDocument(); // the well (jsdom: its still fallback)
    expect(screen.getByTestId("title-row")).toHaveTextContent("Chronarch");
    expect(scroll).toHaveBeenCalledTimes(1);
  }, 8000);

  it("the footer carries both attribution URLs as new-tab links, credit not endorsement", () => {
    window.localStorage.setItem(GATE_KEY, "1");
    renderAt("/");
    const footer = screen.getByTestId("landing-footer");
    for (const a of ATTRIBUTIONS) {
      const link = within(footer).getByTestId(`footer-attribution-${a.label}`);
      expect(link).toHaveAttribute("href", a.href);
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    expect(footer).toHaveTextContent(/Credit, not endorsement/);
    expect(footer).toHaveTextContent(/rexautistikonlabs\.org/);
    expect(footer).toHaveTextContent(/cyberphysics\.ai/);
  });
});

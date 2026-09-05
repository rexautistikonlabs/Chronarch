/** The first screen is a shop window: the catalogue is visible on first paint
 *  with the law in a compact strip — no checkbox, no wall. The footer repeats
 *  the LLC and both attributions and expands the same text behind "Legal".
 *  Continuum has one state and one URL. The Canvas is stubbed (jsdom). */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BuildingKey } from "../src/campus/campusLayout";
import { findVisitorBanned } from "../src/lib/banned";
import { ATTRIBUTIONS, BUYER_LINE, CONTINUUM_URL, exits, LEGAL, LEGAL_LINES, LLC, SCIENTIFICLAB_URL } from "../src/lib/legal";
import { renderAt } from "./render";

vi.mock("../src/campus/Campus", () => ({
  webglAvailable: () => true,
  Campus: ({ onPick }: { onPick: (k: BuildingKey) => void }) => (
    <div data-testid="campus-viewport">
      <canvas data-testid="campus-canvas" />
      <button type="button" data-testid="sign-continuum" onClick={() => onPick("continuum")}>CONTINUUM · RUNNING</button>
      <button type="button" data-testid="sign-chronarch" onClick={() => onPick("chronarch")}>CHRONARCH · RUNNING</button>
    </div>
  ),
}));

const SUBSTRATE = /\bDACO\b|\bTimechain\b|\bChronos\b|\bCouncil\b|not a public chain|\bChia\b|\bPoST\b/;
const NEAR = /Continuum[\s\S]{0,40}forthcoming|forthcoming[\s\S]{0,40}Continuum/i;

describe("first screen", () => {
  it("empty storage: the campus is visible on first paint with the legal strip — LLC, products, Continuum, the Labs split, data, both attributions; no checkbox, no Enter", () => {
    expect(window.localStorage.length).toBe(0);
    renderAt("/");
    expect(screen.getByTestId("landing-body")).toHaveAttribute("data-mode", "campus");
    expect(document.querySelectorAll("canvas")).toHaveLength(1);
    expect(screen.queryByTestId("gate")).not.toBeInTheDocument();
    expect(screen.queryByTestId("gate-enter")).not.toBeInTheDocument();
    expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    const strip = screen.getByTestId("legal-strip");
    for (const l of LEGAL_LINES) expect(strip).toHaveTextContent(l);
    expect(within(strip).getByTestId("strip-llc")).toHaveTextContent(LLC);
    expect(strip).toHaveTextContent("Chronarch and Continuum are research software. Not a diagnostic. Not a medical device.");
    expect(strip).toHaveTextContent("Continuum: a literature-informed biotensegrity and afferent-flow teaching simulation on https://continuum.rexmetrix.com. Model outputs, not measurements of a person. Not a programme ledger.");
    expect(within(strip).getByTestId("strip-split")).toHaveTextContent("Rex Autistikōn Labs (https://rexautistikonlabs.org) is an independent 501(c)(3). Labs does not sell these products. RexMetrix does not speak for Labs.");
    expect(within(strip).getByTestId("strip-data")).toHaveTextContent(LEGAL.data);
    expect(within(strip).getByTestId("strip-data")).toHaveTextContent(/We do not sell that data\./);
    expect(within(strip).getByTestId("strip-data")).toHaveTextContent(/this notice will say so first/);
    expect(within(strip).getByTestId("strip-data").textContent).not.toMatch(/we record|we collect|analytics/i);
    for (const a of ATTRIBUTIONS) {
      const link = within(strip).getByTestId(`strip-attribution-${a.label}`);
      expect(link).toHaveAttribute("href", a.href);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    expect(strip).toHaveTextContent("https://cyberphysics.ai — Cited architecture / public materials.");
    expect(strip).toHaveTextContent(/Credit, not endorsement/i);
    // the buyer line, above the fold, exact
    expect(screen.getByTestId("buyer-line").textContent).toBe(BUYER_LINE);
    expect(screen.getByTestId("buyer-line")).toHaveTextContent("A local workbench for a group to declare fields, pin sources, and write a synthesis that names its parents. Continuum is a separate simulation on its own host.");
    expect(screen.getByTestId("hero").compareDocumentPosition(screen.getByTestId("chapters")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("an old rexmetrix.gate.v1 flag changes nothing: the campus and the strip are there either way", () => {
    window.localStorage.setItem("rexmetrix.gate.v1", "1");
    renderAt("/");
    expect(screen.getByTestId("landing-body")).toBeInTheDocument();
    expect(screen.getByTestId("legal-strip")).toBeInTheDocument();
    expect(screen.queryByTestId("gate")).not.toBeInTheDocument();
  });

  it("the footer repeats the LLC and both links; Legal expands the same text in place — not a wall", () => {
    renderAt("/");
    const footer = screen.getByTestId("landing-footer");
    expect(within(footer).getByTestId("footer-llc")).toHaveTextContent(LLC);
    for (const a of ATTRIBUTIONS) expect(within(footer).getByTestId(`footer-attribution-${a.label}`)).toHaveAttribute("href", a.href);
    expect(screen.queryByTestId("legal-panel")).not.toBeInTheDocument();
    const legal = within(footer).getByTestId("footer-legal");
    expect(legal).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(legal);
    expect(legal).toHaveAttribute("aria-expanded", "true");
    const panel = screen.getByTestId("legal-panel");
    for (const l of LEGAL_LINES) expect(panel).toHaveTextContent(l);
    expect(panel.getAttribute("role")).not.toBe("dialog");
    expect(screen.getByTestId("landing-body")).toBeInTheDocument(); // the page stays; nothing is blocked
    fireEvent.click(legal);
    expect(screen.queryByTestId("legal-panel")).not.toBeInTheDocument();
  });
});

describe("Continuum has one state and one URL", () => {
  it("every Continuum control points at exactly https://continuum.rexmetrix.com; the GitHub URL appears once as a source repository, never as the door; no 'Continuum' within 40 chars of 'forthcoming'", () => {
    renderAt("/");
    expect(screen.getByTestId("landing-to-continuum")).toHaveAttribute("href", CONTINUUM_URL);
    expect(screen.getByTestId("cta-continuum")).toHaveAttribute("href", CONTINUUM_URL);
    expect(screen.getByTestId("cta-continuum")).toHaveAttribute("data-door", "external");
    // the door to another origin is an ordinary same-tab anchor: one click, one navigation
    for (const id of ["landing-to-continuum", "cta-continuum"]) {
      expect(screen.getByTestId(id)).toHaveAttribute("href", CONTINUUM_URL);
      expect(screen.getByTestId(id).getAttribute("target") ?? "_self").not.toBe("_blank");
    }
    expect(screen.getByTestId("chapter-continuum")).toHaveAttribute("data-status", "RUNNING");
    expect(screen.getByTestId("chapter-continuum")).toHaveTextContent(/CONTINUUM · RUNNING/);
    const github = Array.from(document.querySelectorAll("a")).filter((a) => a.getAttribute("href") === SCIENTIFICLAB_URL);
    expect(github).toHaveLength(1);
    expect(github[0]).toHaveTextContent("source repository");
    expect(github[0]!.className).not.toMatch(/hud-button/);
    expect(github[0]!.getAttribute("data-testid")).not.toMatch(/^cta-/);
    expect(github[0]).toHaveAttribute("rel", "noopener noreferrer");
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(NEAR);
    // Laterion: forthcoming, no door, no href
    expect(screen.getByTestId("chapter-laterion")).toHaveAttribute("data-status", "FORTHCOMING");
    expect(screen.getByTestId("chapter-laterion").querySelectorAll("a")).toHaveLength(0);
    expect(screen.getByTestId("is-not-laterion")).toHaveTextContent("not a diagnostic · not a person-score · not an assessment of anyone");
  });

  it("the landing and the Chronarch well chrome carry no substrate word and no banned phrase", () => {
    const landing = renderAt("/");
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(SUBSTRATE);
    expect(findVisitorBanned(body)).toBeNull();
    landing.unmount();
    renderAt("/chronarch");
    const chrome = document.body.textContent ?? "";
    expect(chrome).not.toMatch(SUBSTRATE);
    expect(findVisitorBanned(chrome)).toBeNull();
  });

  it("the workbench names Autistikon as the example corpus, not the product", () => {
    renderAt("/chronarch/tech");
    expect(screen.getByTestId("filter-autistikon")).toHaveTextContent(/example corpus/);
    expect(screen.getByTestId("filter-autistikon")).toHaveTextContent(/not the product/);
    expect(screen.getByTestId("programme-work-pz-ledger-structure")).toHaveTextContent("Autistikon (example corpus)");
    const h1 = document.querySelector("main h1")?.textContent ?? "";
    expect(h1).not.toMatch(/Autistikon|RexMetrix/);
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
  });

});

describe("doors never stay half-open", () => {
  afterEach(() => vi.restoreAllMocks());

  it("the Continuum sign: the door tween, then exactly one same-tab navigation to continuum.rexmetrix.com — never window.open", async () => {
    const leave = vi.spyOn(exits, "leave").mockImplementation(() => {});
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    renderAt("/");
    fireEvent.click(screen.getByTestId("sign-continuum"));
    expect(screen.getByTestId("door-iris")).toBeInTheDocument();
    expect(screen.getByTestId("landing-body")).toHaveAttribute("data-leaving", "continuum");
    expect(leave).not.toHaveBeenCalled(); // not before the door has opened
    await waitFor(() => expect(leave).toHaveBeenCalledWith(CONTINUUM_URL), { timeout: 4000 });
    expect(leave).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
  }, 8000);

  it("no window.open anywhere under web/src", () => {
    const walk = (d: string, out: string[] = []): string[] => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p, out); else if (/\.(tsx?|mjs|js)$/.test(n)) out.push(p); } return out; };
    for (const f of walk(join(__dirname, "..", "src"))) expect(readFileSync(f, "utf8"), f).not.toMatch(/window\.open\(/);
  });

  it("a Chronarch door in flight is reset by pagehide + pageshow (persisted): plane gone, flag clear, no navigation; the door then works again", async () => {
    renderAt("/");
    fireEvent.click(screen.getByTestId("sign-chronarch"));
    expect(screen.getByTestId("door-iris")).toBeInTheDocument();
    expect(screen.getByTestId("landing-body")).toHaveAttribute("data-leaving", "chronarch");
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
      const show = new Event("pageshow");
      Object.defineProperty(show, "persisted", { value: true });
      window.dispatchEvent(show);
    });
    expect(screen.queryByTestId("door-iris")).not.toBeInTheDocument();
    expect(screen.getByTestId("landing-body")).toHaveAttribute("data-leaving", "");
    await new Promise((r) => setTimeout(r, 900)); // longer than the door: the killed tween never navigates
    expect(screen.getByTestId("landing-body")).toBeInTheDocument();
    expect(screen.queryByTestId("viewport-fallback")).not.toBeInTheDocument();
    // and the door is usable again
    fireEvent.click(screen.getByTestId("sign-chronarch"));
    expect(screen.getByTestId("door-iris")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId("landing-body")).not.toBeInTheDocument(), { timeout: 4000 });
    expect(screen.getByTestId("viewport-fallback")).toBeInTheDocument();
  }, 8000);

  it("visibilitychange back to visible resets an open door too", () => {
    renderAt("/");
    fireEvent.click(screen.getByTestId("sign-chronarch"));
    expect(screen.getByTestId("door-iris")).toBeInTheDocument();
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(screen.queryByTestId("door-iris")).not.toBeInTheDocument();
    expect(screen.getByTestId("landing-body")).toHaveAttribute("data-leaving", "");
  });
});

/** The instrument lab on /: one canvas when motion is allowed and WebGL is
 *  present, none under prefers-reduced-motion; the hero is the legal strip,
 *  the wordmark, three text links, the buyer line and the hint; five
 *  hotspots with a job each; Laterion is a drawer, the spec board is the
 *  legal text, the lab book is a door to the workbench. The Canvas is
 *  stubbed here (jsdom has no WebGL); the real one is checked in the browser. */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PROPS, SIGN_LINES, STATIONS } from "../src/lab/labLayout";
import { LEGAL, LLC } from "../src/lib/legal";
import { renderAt } from "./render";

vi.mock("../src/lab/Lab", () => import("./labMock"));

const reduceStub = (matches: boolean) => (q: string) => ({ matches: matches && q.includes("reduce"), media: q, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false });

describe("RexMetrix instrument lab", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("/ mounts one canvas when motion is allowed; the hero is the legal strip, the wordmark, three text links, the buyer line and the hint — no manifesto, no buttons, no checkbox", () => {
    renderAt("/");
    expect(screen.getByTestId("landing-body")).toHaveAttribute("data-mode", "lab");
    expect(document.querySelectorAll("canvas")).toHaveLength(1);
    expect(screen.getByTestId("lab-viewport")).toBeInTheDocument();
    expect(screen.queryByTestId("station-list")).not.toBeInTheDocument(); // the room is the catalogue
    const hero = screen.getByTestId("hero");
    expect(within(hero).getByTestId("strip-llc")).toHaveTextContent("RexMetrix Technologies, LLC");
    expect(within(hero).getByTestId("landing-title")).toHaveTextContent("RexMetrix");
    const links = within(within(hero).getByTestId("landing-nav")).getAllByRole("link");
    expect(links.map((a) => a.textContent)).toEqual(["Chronarch", "Continuum", "Workbench"]);
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/chronarch", "https://continuum.rexmetrix.com", "/chronarch/tech"]);
    expect(within(hero).getByTestId("buyer-line")).toHaveTextContent(/A local workbench for a group/);
    expect(within(hero).getByTestId("lab-sentence")).toHaveTextContent("Click a station: the operator walks there. Drag to look around.");
    expect(hero.querySelectorAll("button")).toHaveLength(0);
    expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    expect(screen.queryByTestId("gate")).not.toBeInTheDocument();
    expect(hero.textContent).not.toMatch(/Three buildings|how RexMetrix talks|builds research instruments|Measurement is King/);
  });

  it("five hotspots in DOM order — the two running products, the board, the book, the covered bench — with the statuses RUNNING, RUNNING, NOT SHIPPING; the Laterion hotspot has no href", () => {
    renderAt("/");
    const signs = Array.from(document.querySelectorAll('[data-testid^="sign-"]')).map((el) => el.getAttribute("data-testid"));
    expect(signs).toEqual(["sign-continuum", "sign-chronarch", "sign-specboard", "sign-labbook", "sign-laterion"]);
    expect(STATIONS.map((s) => s.status)).toEqual(["RUNNING", "RUNNING", "NOT SHIPPING"]);
    expect(screen.getByTestId("sign-chronarch")).toHaveTextContent("CHRONARCH · RUNNING");
    expect(screen.getByTestId("sign-continuum")).toHaveTextContent("CONTINUUM · RUNNING");
    expect(screen.getByTestId("sign-laterion")).toHaveTextContent("LATERION · NOT SHIPPING · NOT A DIAGNOSTIC");
    expect(screen.getByTestId("sign-laterion").tagName).toBe("BUTTON");
    expect(screen.getByTestId("sign-laterion")).not.toHaveAttribute("href");
    for (const k of Object.keys(SIGN_LINES)) expect(screen.getByTestId(`sign-${k}`)).toBeInTheDocument();
  });

  it("three chapters follow the first screen with deep-link ids and scroll margins; Chronarch and Continuum have doors, Laterion says not shipping with no route and no engine link", () => {
    renderAt("/");
    const chapters = screen.getByTestId("chapters");
    expect(screen.getByTestId("first-screen").compareDocumentPosition(chapters) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const ids = Array.from(chapters.querySelectorAll("section")).map((s) => s.id);
    expect(ids).toEqual(["chronarch", "continuum", "laterion"]);
    for (const s of Array.from(chapters.querySelectorAll("section"))) expect((s as HTMLElement).style.scrollMarginTop).toBe("3rem");
    const ch = screen.getByTestId("chapter-chronarch");
    expect(ch).toHaveTextContent("Research software that is running.");
    expect(within(ch).getByTestId("cta-chronarch")).toHaveAttribute("href", "/chronarch");
    expect(ch.querySelectorAll("p").length).toBeLessThanOrEqual(6);
    const co = screen.getByTestId("chapter-continuum");
    expect(within(co).getByTestId("cta-continuum")).toHaveAttribute("href", "https://continuum.rexmetrix.com");
    const source = within(co).getByTestId("source-continuum");
    expect(source).toHaveAttribute("href", "https://github.com/rexautistikonlabs/scientificlab");
    expect(source).toHaveAttribute("target", "_blank");
    expect(source).toHaveAttribute("rel", "noopener noreferrer");
    expect(source).toHaveTextContent(/^source repository/);
    const fm = screen.getByTestId("chapter-laterion");
    expect(fm).toHaveTextContent(/NOT SHIPPING/);
    expect(within(fm).getByTestId("no-door-laterion")).toHaveTextContent("not shipping · no door, no route in this app, no engine here");
    expect(within(fm).getByTestId("is-not-laterion")).toHaveTextContent("not a diagnostic · not a person-score · not an assessment of anyone");
    expect(fm.querySelectorAll("a")).toHaveLength(0);
    for (const a of Array.from(document.querySelectorAll("a"))) expect(a.getAttribute("href") ?? "").not.toMatch(/^\/(continuum|laterion|face)/);
    expect(screen.getByTestId("landing-footer")).toHaveTextContent(/Domain reserved for the RexMetrix landing/);
    expect(screen.getByTestId("landing-footer")).not.toHaveTextContent(/DNS is live|is live/);
  });

  it("the covered bench: the operator walks there and a one-line drawer opens — no door, no route, no href; the page stays on /", () => {
    renderAt("/");
    expect(screen.queryByTestId("laterion-drawer")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("sign-laterion"));
    const drawer = screen.getByTestId("laterion-drawer");
    expect(drawer).toHaveTextContent("Not shipping. Not a diagnostic. Not a person-score.");
    expect(drawer.querySelectorAll("a")).toHaveLength(0);
    expect(screen.queryByTestId("door-iris")).not.toBeInTheDocument();
    expect(screen.getByTestId("landing-body")).toHaveAttribute("data-leaving", "");
    expect(screen.getByTestId("lab-viewport")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("laterion-drawer-close"));
    expect(screen.queryByTestId("laterion-drawer")).not.toBeInTheDocument();
    // and it works twice
    fireEvent.click(screen.getByTestId("sign-laterion"));
    expect(screen.getByTestId("laterion-drawer")).toBeInTheDocument();
  });

  it("the spec board opens the same legal text — the LLC, the products, Continuum, the split, the data sentence, both attributions — in a drawer, not a wall", () => {
    renderAt("/");
    fireEvent.click(screen.getByTestId("sign-specboard"));
    const drawer = screen.getByTestId("spec-drawer");
    expect(within(drawer).getByTestId("board-llc")).toHaveTextContent(LLC);
    expect(drawer).toHaveTextContent(LEGAL.products);
    expect(drawer).toHaveTextContent(LEGAL.continuum);
    expect(within(drawer).getByTestId("board-split")).toHaveTextContent(LEGAL.split);
    expect(within(drawer).getByTestId("board-data")).toHaveTextContent(LEGAL.data);
    expect(within(drawer).getByTestId("board-attribution-rexautistikonlabs.org")).toHaveAttribute("href", "https://rexautistikonlabs.org");
    expect(within(drawer).getByTestId("board-attribution-cyberphysics.ai")).toHaveAttribute("href", "https://cyberphysics.ai");
    expect(drawer.getAttribute("role")).not.toBe("dialog");
    expect(screen.queryByTestId("door-iris")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("spec-drawer-close"));
    expect(screen.queryByTestId("spec-drawer")).not.toBeInTheDocument();
  });

  it("the lab book is a door to the workbench: the walk, the door tween, then /chronarch/tech with 0 canvas", async () => {
    renderAt("/");
    fireEvent.click(screen.getByTestId("sign-labbook"));
    expect(screen.getByTestId("door-iris")).toBeInTheDocument();
    expect(screen.getByTestId("landing-body")).toHaveAttribute("data-leaving", "labbook");
    await waitFor(() => expect(screen.getByTestId("tech-bench")).toBeInTheDocument(), { timeout: 4000 });
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
    expect(screen.queryByTestId("lab-viewport")).not.toBeInTheDocument();
  }, 8000);

  it("one walk at a time: a second click while the operator is walking is ignored", () => {
    // the stub arrives at once, so a second click after arrival is a new walk; here the drawer proves each arrival
    renderAt("/");
    fireEvent.click(screen.getByTestId("sign-laterion"));
    expect(screen.getByTestId("laterion-drawer")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("sign-specboard"));
    expect(screen.getByTestId("spec-drawer")).toBeInTheDocument();
    expect(screen.queryByTestId("laterion-drawer")).not.toBeInTheDocument(); // one drawer at a time
  });

  it("0 canvas under prefers-reduced-motion: the station list stands in for the room — the same five pieces, the same statuses and doors; the covered bench is a button that opens the drawer", () => {
    vi.stubGlobal("matchMedia", reduceStub(true));
    renderAt("/");
    expect(screen.getByTestId("landing-body")).toHaveAttribute("data-mode", "reduced-motion");
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
    expect(screen.queryByTestId("lab-viewport")).not.toBeInTheDocument();
    expect(screen.queryByTestId("lab-sentence")).not.toBeInTheDocument();
    const list = screen.getByTestId("station-list");
    expect(list.querySelectorAll("li")).toHaveLength(PROPS.length);
    expect(within(list).getByTestId("station-chronarch")).toHaveAttribute("data-status", "RUNNING");
    expect(within(list).getByTestId("station-continuum")).toHaveAttribute("data-status", "RUNNING");
    expect(within(list).getByTestId("station-laterion")).toHaveAttribute("data-status", "NOT SHIPPING");
    expect(within(list).getByTestId("station-door-chronarch")).toHaveAttribute("href", "/chronarch");
    expect(within(list).getByTestId("station-door-continuum")).toHaveAttribute("href", "https://continuum.rexmetrix.com");
    expect(within(list).getByTestId("station-door-continuum").getAttribute("target") ?? "_self").not.toBe("_blank");
    expect(within(list).getByTestId("station-door-labbook")).toHaveAttribute("href", "/chronarch/tech");
    expect(within(list).getByTestId("station-door-laterion").tagName).toBe("BUTTON");
    expect(within(list).getByTestId("station-laterion").querySelectorAll("a")).toHaveLength(0);
    fireEvent.click(within(list).getByTestId("station-door-laterion"));
    expect(screen.getByTestId("laterion-drawer")).toHaveTextContent("Not shipping. Not a diagnostic. Not a person-score.");
    fireEvent.click(within(list).getByTestId("station-door-specboard"));
    expect(screen.getByTestId("spec-drawer")).toHaveTextContent(LLC);
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

describe("the chapter CTA", () => {
  it("Open Chronarch below the fold opens the door without a walk: the plane at once, then /chronarch", async () => {
    renderAt("/");
    fireEvent.click(screen.getByTestId("cta-chronarch"));
    expect(screen.getByTestId("door-iris")).toBeInTheDocument();
    expect(screen.getByTestId("landing-body")).toHaveAttribute("data-leaving", "chronarch");
    await waitFor(() => expect(screen.queryByTestId("landing-body")).not.toBeInTheDocument(), { timeout: 4000 });
    expect(screen.getByTestId("viewport-fallback")).toBeInTheDocument();
  }, 8000);
});

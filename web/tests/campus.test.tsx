/** The campus on /: one canvas when motion is allowed and WebGL is present,
 *  none under prefers-reduced-motion; buildings open a docked panel; only
 *  Chronarch has a door; navigating into Chronarch unmounts the campus.
 *  The Canvas itself is stubbed here (jsdom has no WebGL); the real one is
 *  checked in the browser. */
import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BuildingKey } from "../src/campus/campusLayout";
import { renderAt } from "./render";

vi.mock("../src/campus/Campus", () => ({
  webglAvailable: () => true,
  Campus: ({ selected, onSelect }: { selected: BuildingKey | null; onSelect: (k: BuildingKey | null) => void }) => (
    <div data-testid="campus-viewport" data-selected={selected ?? ""}>
      <canvas data-testid="campus-canvas" />
      <button type="button" data-testid="sign-chronarch" onClick={() => onSelect("chronarch")}>CHRONARCH · RUNNING</button>
    </div>
  ),
}));

const reduceStub = (matches: boolean) => (q: string) => ({ matches: matches && q.includes("reduce"), media: q, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false });

describe("RexMetrix campus", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("/ mounts one canvas when motion is allowed; the still HUD carries the honesty sentence, the three plates and the footer reservation", () => {
    renderAt("/");
    expect(screen.getByTestId("landing-body")).toHaveAttribute("data-mode", "campus");
    expect(document.querySelectorAll("canvas")).toHaveLength(1);
    expect(screen.getByTestId("landing-honesty")).toHaveTextContent("RexMetrix is a product house. Chronarch is research software. Not a public chain. Not Foundation-endorsed. Not a diagnostic.");
    const legend = screen.getByTestId("campus-legend");
    expect(within(legend).getByTestId("plate-chronarch")).toHaveTextContent("CHRONARCH · RUNNING");
    expect(within(legend).getByTestId("plate-continuum")).toHaveTextContent("CONTINUUM · FORTHCOMING");
    expect(within(legend).getByTestId("plate-face-mapping")).toHaveTextContent("FACE MAP · FORTHCOMING · NOT A DIAGNOSTIC");
    const body = document.body.textContent ?? "";
    for (const s of ["Chronarch", "Continuum", "Face map", "not a diagnostic", "not Foundation-endorsed"]) expect(body).toContain(s);
    expect(screen.getByTestId("landing-footer")).toHaveTextContent(/Domain reserved for the RexMetrix landing/);
    expect(screen.getByTestId("landing-footer")).not.toHaveTextContent(/DNS is live/);
    expect(screen.queryByTestId("viewport")).not.toBeInTheDocument();
    expect(screen.queryByTestId("viewport-fallback")).not.toBeInTheDocument();
    expect(body).not.toMatch(/\b(car|honk|balloon|collectible|rainbow|kids?|playground)\b/i);
  });

  it("0 canvas under prefers-reduced-motion: the campus is not mounted and the three cards stand", () => {
    vi.stubGlobal("matchMedia", reduceStub(true));
    renderAt("/");
    expect(screen.getByTestId("landing-body")).toHaveAttribute("data-mode", "reduced-motion");
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
    expect(screen.queryByTestId("campus-viewport")).not.toBeInTheDocument();
    expect(screen.getByTestId("campus-fallback")).toHaveAttribute("data-reason", "reduced-motion");
    expect(within(screen.getByTestId("catalogue")).getAllByRole("listitem").filter((li) => li.hasAttribute("data-status"))).toHaveLength(3);
    expect(screen.getByTestId("product-face-mapping")).toHaveTextContent(/not a diagnostic · not a person-score · not an assessment of anyone/);
  });

  it("Continuum and Face mapping open a card, not a door: no navigation, no engine route, the copy stays", () => {
    renderAt("/");
    fireEvent.click(screen.getByTestId("plate-continuum"));
    const panel = screen.getByTestId("campus-panel");
    expect(panel).toHaveAttribute("data-selected", "continuum");
    expect(panel).toHaveTextContent(/Continuum/);
    expect(screen.getByTestId("no-door")).toBeInTheDocument();
    expect(screen.queryByTestId("enter-chronarch")).not.toBeInTheDocument();
    expect(Array.from(panel.querySelectorAll("a")).map((a) => a.getAttribute("href"))).toEqual([]);
    expect(screen.getByTestId("landing-body")).toBeInTheDocument(); // still on /
    expect(screen.getByTestId("campus-viewport")).toHaveAttribute("data-selected", "continuum");

    fireEvent.click(screen.getByTestId("plate-face-mapping"));
    expect(screen.getByTestId("campus-panel")).toHaveAttribute("data-selected", "face-mapping");
    expect(screen.getByTestId("campus-panel")).toHaveTextContent(/not a diagnostic · not a person-score · not an assessment of anyone/);
    expect(screen.getByTestId("no-door")).toBeInTheDocument();
    expect(screen.getByTestId("campus-panel").querySelectorAll("a")).toHaveLength(0);
    expect(screen.getByTestId("landing-body")).toBeInTheDocument();
    // the same plate again closes the panel
    fireEvent.click(screen.getByTestId("plate-face-mapping"));
    expect(screen.getByTestId("campus-panel")).toHaveAttribute("data-selected", "");
    expect(screen.getByTestId("campus-panel")).toHaveTextContent(/Chronarch is one of its products/);
  });

  it("Chronarch opens with Enter Chronarch; entering unmounts the campus and mounts the well", () => {
    renderAt("/");
    fireEvent.click(screen.getByTestId("sign-chronarch")); // a click in the scene
    expect(screen.getByTestId("campus-panel")).toHaveAttribute("data-selected", "chronarch");
    const enter = screen.getByTestId("enter-chronarch");
    expect(enter).toHaveAttribute("href", "/chronarch");
    expect(screen.getByTestId("campus-panel")).toHaveTextContent(/RUNNING/);
    fireEvent.click(enter);
    expect(screen.queryByTestId("campus-viewport")).not.toBeInTheDocument();
    expect(screen.queryByTestId("campus-canvas")).not.toBeInTheDocument();
    expect(screen.getByTestId("viewport-fallback")).toBeInTheDocument(); // the well (jsdom: its still fallback) has the GPU to itself
    expect(screen.getByTestId("title-row")).toHaveTextContent("Chronarch");
  });

  it("/chronarch/tech is still HTML with 0 canvas and the Autistikon filter shows exactly two stand-ins", () => {
    renderAt("/chronarch/tech");
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
    fireEvent.click(screen.getByTestId("filter-autistikon"));
    const ids = Array.from(document.querySelectorAll('[data-testid^="select-work-"]')).map((el) => el.getAttribute("data-testid"));
    expect(ids.sort()).toEqual(["select-work-pz-ledger-structure", "select-work-pz-register-structure"]);
  });
});

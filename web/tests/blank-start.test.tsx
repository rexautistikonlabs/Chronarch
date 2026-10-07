/** Abstraction, barriers, survivorship — in the rendered workbench and well.
 *  A cold workbench is an empty programme; the example corpus is a pack that
 *  loads only when its chip is pressed; the first run never requires it; the
 *  operator can declare two fields and the first bridge on the blank
 *  programme; the Classics starter pack plus one declared bridge runs the
 *  Newton + NIST compare from NEW_PROGRAMME.md. */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { STAND_INS } from "../src/lib/filters";
import { PROGRAMME_CHIPS } from "../src/lib/human";
import { renderAt } from "./render";
import { recordReading } from "./bench-ui";

const visibleIds = () => Array.from(document.querySelectorAll('[data-testid^="select-work-"]')).map((el) => (el.getAttribute("data-testid") ?? "").replace(/^select-/, ""));
const edges = () => Array.from(document.querySelectorAll('[data-testid^="edge-"]'));
const nodes = () => Array.from(document.querySelectorAll('[data-testid^="node-"]'));

describe("a cold workbench is an empty programme", () => {
  it("selects the blank programme, filter All, ten works and none of the example corpus; the graph has no node and no edge; the pack chip says not loaded", () => {
    renderAt("/chronarch/tech");
    expect(screen.getByTestId("tech-programme-blank.json")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("tech-programme-zero.json")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("tech-programme-classics.json")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("filter-all")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("project-summary")).toHaveTextContent(/^programme-blank ·/);
    const ids = visibleIds();
    expect(ids).toHaveLength(10);
    for (const id of STAND_INS) expect(ids).not.toContain(id);
    expect(screen.getByTestId("filter-autistikon")).toHaveAttribute("data-pack", "absent");
    expect(screen.getByTestId("filter-autistikon")).toHaveTextContent(/not loaded/);
    expect(nodes()).toHaveLength(0);
    expect(edges()).toHaveLength(0);
    expect(screen.getByTestId("field-graph")).toHaveTextContent(/0 fields · 0 live bridges/);
    expect(document.body.textContent).not.toMatch(/Kim 2026/);
  });

  it("pressing the example chip loads the pack: the two stand-ins appear, the Autistikon filter shows them, and the blank programme stays selected", async () => {
    renderAt("/chronarch/tech");
    fireEvent.click(screen.getByTestId("filter-autistikon"));
    await screen.findByTestId("select-work-pz-ledger-structure", {}, { timeout: 4000 });
    expect(new Set(visibleIds())).toEqual(new Set(STAND_INS));
    expect(screen.getByTestId("filter-autistikon")).toHaveAttribute("data-pack", "loaded");
    expect(screen.getByTestId("programme-work-pz-ledger-structure")).toHaveTextContent("Autistikon (example corpus)");
    fireEvent.click(screen.getByTestId("filter-all"));
    expect(visibleIds()).toHaveLength(12);
    expect(screen.getByTestId("tech-programme-blank.json")).toHaveAttribute("aria-pressed", "true"); // a filter is not a programme switch
  });

  it("the first run has four steps, names no corpus, fixture id or author, and offers Classics as a starter pack rather than a filter", () => {
    renderAt("/chronarch/tech");
    const panel = screen.getByTestId("first-run");
    expect(within(panel).getAllByRole("listitem")).toHaveLength(4);
    expect(panel.textContent).not.toMatch(/Autistikon|Programme Zero|stand-in|Faraday|Maxwell|Darwin|Mendel|work-|pz-/i);
    expect(screen.getByTestId("first-run-go-1")).toHaveTextContent(/load a public-domain starter pack/);
    expect(screen.queryByTestId("first-run-go-2")).not.toBeInTheDocument();
    for (const n of [1, 2, 3, 4]) expect(screen.getByTestId(`first-run-step-${n}`)).toHaveAttribute("data-done", "false");
  });

  it("on the blank programme the operator declares two fields and the first bridge: two nodes, one operator edge, no shipped edge; step 1 ticks", () => {
    renderAt("/chronarch/tech");
    const add = (label: string, units: string, sector: string) => {
      fireEvent.change(screen.getByTestId("field-label"), { target: { value: label } });
      fireEvent.change(screen.getByTestId("field-units"), { target: { value: units } });
      fireEvent.change(screen.getByTestId("field-sector"), { target: { value: sector } });
      fireEvent.click(screen.getByTestId("add-field"));
    };
    fireEvent.click(screen.getByTestId("add-field"));
    expect(screen.getByTestId("field-status")).toHaveTextContent(/refused/);
    add("Soil chemistry", "mg/kg; pH", "earth-sciences");
    expect(screen.getByTestId("field-status")).toHaveTextContent("declared field-soil-chemistry — on this project only");
    expect(screen.getByTestId("first-run-step-1")).toHaveAttribute("data-done", "false");
    add("Plant physiology", "mmol/m²/s", "earth-sciences");
    expect(screen.getByTestId("extra-field-field-plant-physiology")).toBeInTheDocument();
    expect(screen.getByTestId("first-run-step-1")).toHaveAttribute("data-done", "true");
    expect(nodes()).toHaveLength(2);
    expect(edges()).toHaveLength(0);
    // the first bridge is the operator's
    fireEvent.change(screen.getByTestId("declare-left"), { target: { value: "field-soil-chemistry" } });
    fireEvent.change(screen.getByTestId("declare-right"), { target: { value: "field-plant-physiology" } });
    fireEvent.click(screen.getByTestId("declare-bridge"));
    expect(screen.getByTestId("declare-status")).toHaveTextContent(/refused — tick/);
    fireEvent.click(screen.getByTestId("declare-amendment"));
    fireEvent.click(screen.getByTestId("declare-bridge"));
    expect(screen.getByTestId("declare-status")).toHaveTextContent("declared amend-field-soil-chemistry-field-plant-physiology — on this project only");
    expect(edges()).toHaveLength(1);
    expect(edges()[0]).toHaveAttribute("data-origin", "operator");
    expect(edges().filter((e) => e.getAttribute("data-origin") === "shipped")).toHaveLength(0);
    // and the upload form can shelve a work in the group's own field
    const options = Array.from((screen.getByTestId("upload-field") as HTMLSelectElement).options).map((o) => o.value);
    expect(options).toContain("field-soil-chemistry");
    expect(options).not.toContain("natural-history"); // Classics is not loaded
    expect(screen.getByTestId("project-summary")).toHaveTextContent(/1 extra bridge/);
  });

  it("the starter pack path: load Classics from step 1, Newton + NIST refuse NO_BRIDGE until optics — metrology is declared, then Compare runs, the pack downloads, and the first run finishes", () => {
    renderAt("/chronarch/tech");
    fireEvent.click(screen.getByTestId("first-run-go-1"));
    expect(screen.getByTestId("tech-programme-classics.json")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("first-run-step-1")).toHaveAttribute("data-done", "true");
    expect(nodes()).toHaveLength(6);
    expect(edges()).toHaveLength(3);
    expect(edges().every((e) => e.getAttribute("data-origin") === "shipped")).toBe(true);
    expect(screen.getByTestId("filter-all")).toHaveAttribute("aria-pressed", "true"); // never a corpus filter
    fireEvent.click(screen.getByTestId("select-work-newton-opticks"));
    fireEvent.click(screen.getByTestId("select-work-nist-tn1297"));
    expect(screen.getByTestId("first-run-step-2")).toHaveAttribute("data-done", "true");
    expect(screen.getByTestId("action-compare")).toHaveAttribute("data-code", "NO_BRIDGE");
    expect(screen.getByTestId("why-compare")).toHaveTextContent(/optics — metrology/);
    expect(screen.getByTestId("missing-caption")).toHaveTextContent("missing: optics — metrology");
    fireEvent.change(screen.getByTestId("declare-left"), { target: { value: "optics" } });
    fireEvent.change(screen.getByTestId("declare-right"), { target: { value: "metrology" } });
    fireEvent.click(screen.getByTestId("declare-amendment"));
    fireEvent.click(screen.getByTestId("declare-bridge"));
    expect(screen.getByTestId("declare-status")).toHaveTextContent("declared amend-optics-metrology — on this project only");
    expect(edges()).toHaveLength(4);
    // the bridge is declared; the reading record is still the operator's to fill
    expect(screen.getByTestId("action-compare")).toHaveAttribute("data-code", "MODE_REQUIRED");
    recordReading();
    expect(screen.getByTestId("action-compare")).toHaveAttribute("data-enabled", "true");
    fireEvent.click(screen.getByTestId("action-compare"));
    expect(screen.getByTestId("result-status")).toHaveTextContent(/ok · compare · kind match · ok/);
    expect(screen.getByTestId("result-card")).toHaveTextContent(/amend-optics-metrology/);
    expect(screen.getByTestId("first-run-step-3")).toHaveAttribute("data-done", "true");
    fireEvent.click(screen.getByTestId("export-pack"));
    expect(screen.getByTestId("first-run-step-4")).toHaveAttribute("data-done", "true");
    expect(screen.getByTestId("first-run")).toHaveAttribute("data-done", "4");
    fireEvent.click(screen.getByTestId("first-run-finish"));
    expect(screen.queryByTestId("first-run")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Autistikon \(example corpus\)/); // no corpus row ever appeared
  });
});

describe("the well on a cold load", () => {
  it("reads 0 fields, 0 bridges, no clock, four chips with the blank first; Toy switches at once; the example chip loads the pack, then switches", async () => {
    renderAt("/chronarch");
    expect(screen.getByTestId("viewport-fallback")).toHaveAttribute("data-programme", "programme-blank");
    expect(screen.getByTestId("field-count")).toHaveTextContent("0");
    expect(screen.getByTestId("bridge-count")).toHaveTextContent("0");
    expect(screen.getByTestId("stop-date")).toHaveTextContent("—");
    expect(PROGRAMME_CHIPS.map((c) => c.fixture)).toEqual(["programme-blank.json", "programme-classics.json", "programme-toy.json", "programme-zero.json"]);
    const chips = within(screen.getByTestId("programme-chips")).getAllByRole("button").map((b) => b.getAttribute("data-testid"));
    expect(chips).toEqual(["chip-programme-blank.json", "chip-programme-classics.json", "chip-programme-toy.json", "chip-programme-zero.json"]);
    expect(screen.getByTestId("chip-programme-blank.json")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByTestId("chip-programme-toy.json"));
    expect(screen.getByTestId("field-count")).toHaveTextContent("3");
    fireEvent.click(screen.getByTestId("chip-programme-zero.json"));
    await waitFor(() => expect(screen.getByTestId("field-count")).toHaveTextContent("2"), { timeout: 4000 });
    expect(screen.getByTestId("viewport-fallback")).toHaveAttribute("data-programme", "programme-zero");
    fireEvent.click(screen.getByTestId("chip-programme-blank.json"));
    expect(screen.getByTestId("field-count")).toHaveTextContent("0");
  });
});

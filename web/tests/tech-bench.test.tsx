/** /tech is a flat HTML bench: no well on that route; the visitor keeps it. */
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderAt } from "./render";

describe("operator bench", () => {
  it("/tech has no canvas, no well, no scanlines; / keeps the well", () => {
    const tech = renderAt("/tech");
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
    expect(screen.queryByTestId("viewport")).not.toBeInTheDocument();
    expect(screen.queryByTestId("viewport-fallback")).not.toBeInTheDocument();
    expect(document.querySelector(".scanlines")).toBeNull();
    expect(screen.getByTestId("tech-bench")).toBeInTheDocument();
    expect(screen.getByTestId("status-banner")).toHaveTextContent(/not a public chain/i);
    tech.unmount();
    renderAt("/");
    // jsdom has no WebGL: the well's still fallback stands where the canvas would
    expect(screen.getByTestId("viewport-fallback")).toBeInTheDocument();
  });

  it("sections come in the bench's order; session fixtures, paste and hashes live under the closed substrate details", () => {
    renderAt("/tech");
    const h2 = Array.from(document.querySelectorAll("main > div > section > h2")).map((h) => h.textContent ?? "");
    expect(h2.map((t) => t.split(" ·")[0])).toEqual(["works", "actions", "refuse glossary", "programmes"]);
    const details = screen.getByTestId("substrate-details");
    expect(details).not.toHaveAttribute("open");
    expect(details).toContainElement(screen.getByTestId("json-input"));
    expect(details).toContainElement(screen.getByTestId("load-session-opa.json"));
    expect(details).toContainElement(screen.getByTestId("head-hash-full"));
    // the honesty banner and title are in flow on the bench, never fixed over the glossary
    expect(screen.getByTestId("hud-top")).toHaveAttribute("data-fixed", "false");
  });

  it("select two cc-by stand-ins → Converge → an overlap child; one selection → NEED_PARENTS; a stub → Compare refuses; two stubs → Analyze asks", () => {
    renderAt("/tech");
    const status = () => screen.getByTestId("result-status");
    fireEvent.click(screen.getByTestId("select-work-pz-ledger-structure"));
    expect(screen.getByTestId("selected-count")).toHaveTextContent("1");
    fireEvent.click(screen.getByTestId("action-converge"));
    expect(status()).toHaveTextContent(/refused · converge · NEED_PARENTS/);

    fireEvent.click(screen.getByTestId("select-work-pz-register-structure"));
    fireEvent.click(screen.getByTestId("action-converge"));
    expect(status()).toHaveTextContent(/ok · converge · kind overlap · ok/);
    // readable first: both titles, both snippets, a stable percent — JSON under a closed details
    const card = screen.getByTestId("result-card");
    expect(card).toHaveTextContent(/Assumption ledger \(structure only\)/);
    expect(card).toHaveTextContent(/Falsification register \(structure only\)/);
    expect(screen.getByTestId("jaccard")).toHaveTextContent("16%");
    expect(card).toHaveTextContent(/An assumption ledger lists every assumption/);
    expect(screen.getByTestId("result-json")).not.toHaveAttribute("open");
    const child = JSON.parse(screen.getByTestId("result-child").textContent ?? "{}");
    expect(child.kind).toBe("overlap");
    expect(child.parents).toHaveLength(2);
    expect(within(screen.getByTestId("results-list")).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByTestId("results-list")).toHaveTextContent(/overlap · 16%/);

    fireEvent.click(screen.getByTestId("select-work-pz-register-structure")); // deselect
    fireEvent.click(screen.getByTestId("select-work-stub-doi-example"));
    fireEvent.click(screen.getByTestId("action-compare"));
    expect(status()).toHaveTextContent(/refused · compare · STUB_NO_FULLTEXT/);
    expect(screen.getByTestId("result-card").textContent).not.toMatch(/\d+%/); // no fake percent
    expect(screen.queryByTestId("overlap-bar")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("select-work-pz-ledger-structure")); // deselect
    fireEvent.click(screen.getByTestId("select-work-stub-title-only"));
    fireEvent.click(screen.getByTestId("action-analyze"));
    expect(status()).toHaveTextContent(/ok · analyze · kind question · ok/);
    expect(screen.getByTestId("result-question")).toHaveTextContent(/could stand beside/);
    expect(screen.queryByTestId("overlap-bar")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("results-list")).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByTestId("results-list")).toHaveTextContent(/question · —/);
  });

  it("a couple of two bodies carries the lexical-overlap caption", () => {
    renderAt("/tech");
    fireEvent.click(screen.getByTestId("select-work-pz-ledger-structure"));
    fireEvent.click(screen.getByTestId("select-work-toy-materials-note"));
    fireEvent.click(screen.getByTestId("action-analyze"));
    expect(screen.getByTestId("result-status")).toHaveTextContent(/kind couple/);
    expect(screen.getByTestId("couple-caption")).toHaveTextContent("lexical overlap only — not a fitted model.");
    expect(screen.getByTestId("jaccard")).toHaveTextContent(/\d+%/);
  });

  it("the three buttons carry their one-line help", () => {
    renderAt("/tech");
    const actions = screen.getByTestId("bench-actions");
    expect(actions).toHaveTextContent("shared identifiers / citations between selected works.");
    expect(actions).toHaveTextContent("agreement of two bodies.");
    expect(actions).toHaveTextContent("couple models, or open a question if a parent is only a stub.");
  });
});

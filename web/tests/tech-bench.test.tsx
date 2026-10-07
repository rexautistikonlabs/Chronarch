/** /tech is a flat HTML bench: no well on that route; the visitor keeps it.
 *  The bench flows here run on the shipped starter packs alone. */
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { loadClassicsUI } from "./pack-ui";
import { recordReading } from "./bench-ui";
import { renderAt } from "./render";

describe("operator bench", () => {
  it("/tech has no canvas, no well, no scanlines; / keeps the well", () => {
    const tech = renderAt("/tech");
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
    expect(screen.queryByTestId("viewport")).not.toBeInTheDocument();
    expect(screen.queryByTestId("viewport-fallback")).not.toBeInTheDocument();
    expect(document.querySelector(".scanlines")).toBeNull();
    expect(screen.getByTestId("tech-bench")).toBeInTheDocument();
    expect(screen.getByTestId("status-banner")).toHaveTextContent(/not a medical device/i);
    tech.unmount();
    renderAt("/chronarch");
    // jsdom has no WebGL: the well's still fallback stands where the canvas would
    expect(screen.getByTestId("viewport-fallback")).toBeInTheDocument();
  });

  it("sections come in the bench's order; session fixtures, paste and hashes live under the closed substrate details", () => {
    renderAt("/tech");
    const h2 = Array.from(document.querySelectorAll("main > div > section > h2")).map((h) => h.textContent ?? "");
    expect(h2.map((t) => t.split(" ·")[0])).toEqual(["filters", "field–bridge graph", "project", "works", "actions", "result", "notes library", "export", "refuse glossary"]);
    expect(screen.getByTestId("substrate-details")).toContainElement(screen.getByTestId("tech-programmes"));
    const details = screen.getByTestId("substrate-details");
    expect(details).not.toHaveAttribute("open");
    expect(details).toContainElement(screen.getByTestId("json-input"));
    expect(details).toContainElement(screen.getByTestId("load-session-opa.json"));
    expect(details).toContainElement(screen.getByTestId("head-hash-full"));
    // the honesty banner and title are in flow on the bench, never fixed over the glossary
    expect(screen.getByTestId("hud-top")).toHaveAttribute("data-fixed", "false");
  });

  it("Classics: Faraday + Maxwell → Converge → an overlap child with the eight-section note; one selection → NEED_PARENTS disables; a stub → Compare disabled STUB_NO_FULLTEXT; the earlier result stands", () => {
    renderAt("/tech");
    loadClassicsUI();
    const status = () => screen.getByTestId("result-status");
    fireEvent.click(screen.getByTestId("select-work-faraday-ere-v1"));
    expect(screen.getByTestId("selected-count")).toHaveTextContent("1");
    // the workbench disables an action that would refuse, and says why; nothing runs
    expect(screen.getByTestId("action-converge")).toHaveAttribute("data-code", "NEED_PARENTS");
    expect(screen.getByTestId("why-converge")).toHaveTextContent("NEED_PARENTS");
    fireEvent.click(screen.getByTestId("action-converge"));
    expect(screen.queryByTestId("result-status")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("select-work-maxwell-elem"));
    // the record is the operator's: with none of it filled, Converge is disabled MODE_REQUIRED and nothing runs
    expect(screen.getByTestId("action-converge")).toHaveAttribute("data-code", "MODE_REQUIRED");
    fireEvent.click(screen.getByTestId("action-converge"));
    expect(screen.queryByTestId("result-status")).not.toBeInTheDocument();
    recordReading();
    fireEvent.click(screen.getByTestId("action-converge"));
    expect(status()).toHaveTextContent(/ok · converge · kind overlap · ok/);
    const card = screen.getByTestId("result-card");
    const headings = Array.from(card.querySelectorAll("h3")).map((h) => h.textContent?.replace(/^\d+ · /, ""));
    expect(headings).toEqual(["Question", "Objects", "What was compared", "Findings", "Assumptions used", "What would falsify this reading", "What this is not", "Appendix"]);
    expect(screen.getByTestId("note-question")).toHaveTextContent(/Which identifiers and terms do/);
    expect(card).toHaveTextContent(/Experimental Researches in Electricity/);
    expect(card).toHaveTextContent(/Elementary Treatise on Electricity/);
    expect(screen.getByTestId("jaccard")).toHaveTextContent(/\d+%/);
    expect(screen.getByTestId("note-findings")).toHaveTextContent(/\[work-faraday-ere-v1, work-maxwell-elem, metric:jaccard\]/);
    expect(screen.getByTestId("note-is-not")).toHaveTextContent(/not an individual score/);
    expect(screen.getByTestId("note-is-not")).toHaveTextContent(/not a fitted model/);
    expect(screen.getByTestId("note-is-not")).toHaveTextContent(/not a nested model comparison/);
    // the reading record renders as a status string under the fixed caption — never a grade
    expect(screen.getByTestId("note-record")).toHaveAttribute("data-status", "recovered_known");
    expect(screen.getByTestId("note-record")).toHaveTextContent("operator record, not a bench result.");
    expect(screen.getByTestId("record-status-value")).toHaveTextContent("recovered_known");
    expect(screen.getByTestId("result-json")).not.toHaveAttribute("open");
    const json = JSON.parse(screen.getByTestId("result-child").textContent ?? "{}");
    expect(json.child.kind).toBe("overlap");
    expect(json.child.path).toEqual(["bridge-electricity-electromagnetism"]);
    expect(json.note.findings.every((f: { cites: string[] }) => f.cites.length > 0)).toBe(true);
    expect(within(screen.getByTestId("results-list")).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByTestId("results-list")).toHaveTextContent(/overlap · \d+% · note/);

    // a citation-only row on the Classics programme is not shelved in any of its fields: the bench says so and runs nothing
    fireEvent.click(screen.getByTestId("select-work-maxwell-elem")); // deselect
    fireEvent.click(screen.getByTestId("select-work-arxiv-style-example"));
    expect(screen.getByTestId("action-compare")).toHaveAttribute("data-enabled", "false");
    expect(["STUB_NO_FULLTEXT", "UNKNOWN_FIELD"]).toContain(screen.getByTestId("action-compare").getAttribute("data-code"));
    fireEvent.click(screen.getByTestId("action-compare"));
    expect(status()).toHaveTextContent(/ok · converge/); // the earlier result stands; no fake percent was written
    expect(within(screen.getByTestId("results-list")).getAllByRole("listitem")).toHaveLength(1);
  });

  it("Toy: two stubs → Analyze asks a question along the declared two-bridge path; no finding is invented", () => {
    renderAt("/tech");
    fireEvent.click(screen.getByTestId("tech-programme-toy.json"));
    fireEvent.click(screen.getByTestId("select-work-stub-doi-example"));
    fireEvent.click(screen.getByTestId("select-work-stub-title-only"));
    expect(screen.getByTestId("action-compare")).toHaveAttribute("data-code", "STUB_NO_FULLTEXT");
    expect(screen.getByTestId("actions-helper")).toHaveTextContent(/STUB_NO_FULLTEXT/);
    fireEvent.click(screen.getByTestId("action-analyze"));
    expect(screen.getByTestId("result-status")).toHaveTextContent(/ok · analyze · kind question · ok/);
    expect(screen.getByTestId("note-question")).toHaveTextContent(/could stand beside/);
    expect(screen.getByTestId("note-findings")).toHaveTextContent(/No findings: a stub is among the parents/);
    expect(screen.getByTestId("note-falsify")).toHaveTextContent(/a body appearing on the stub/);
    expect(screen.queryByTestId("overlap-bar")).not.toBeInTheDocument();
    expect(screen.getByTestId("results-list")).toHaveTextContent(/question · —/);
  });

  it("Analyze on two bodies is refused COUPLE_IS_LEXICAL, record or no record: no numeric coupling is fitted here, and the lexical reading is Compare", () => {
    renderAt("/tech");
    loadClassicsUI();
    fireEvent.click(screen.getByTestId("select-work-faraday-ere-v1"));
    fireEvent.click(screen.getByTestId("select-work-maxwell-elem"));
    expect(screen.getByTestId("action-analyze")).toHaveAttribute("data-enabled", "false");
    expect(screen.getByTestId("action-analyze")).toHaveAttribute("data-code", "COUPLE_IS_LEXICAL");
    recordReading();
    expect(screen.getByTestId("action-analyze")).toHaveAttribute("data-code", "COUPLE_IS_LEXICAL");
    expect(screen.getByTestId("why-analyze")).toHaveTextContent("COUPLE_IS_LEXICAL");
    fireEvent.click(screen.getByTestId("action-analyze"));
    expect(screen.queryByTestId("result-status")).not.toBeInTheDocument();
    expect(screen.queryByTestId("couple-caption")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("action-compare"));
    expect(screen.getByTestId("result-status")).toHaveTextContent(/ok · compare · kind match · ok/);
    expect(screen.getByTestId("result-card")).toHaveTextContent("lexical overlap only.");
    expect(screen.getByTestId("jaccard")).toHaveTextContent(/\d+%/);
  });

  it("the three buttons carry their one-line help", () => {
    renderAt("/tech");
    const actions = screen.getByTestId("bench-actions");
    expect(actions).toHaveTextContent("shared identifiers / citations between selected works.");
    expect(actions).toHaveTextContent("agreement of two bodies.");
    expect(actions).toHaveTextContent("open a question if a parent is only a stub; two bodies refuse COUPLE_IS_LEXICAL — no numeric coupling is fitted here.");
  });
});

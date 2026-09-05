/** The session project on /tech: name, Declare bridge (amendment only),
 *  notes library, Download pack. Amendments never touch a programme file. */
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import classics from "../fixtures/programme-classics.json";
import { STAND_INS } from "../src/lib/filters";
import type { ProgrammeFile } from "../src/lib/programme";
import { renderAt } from "./render";

const visibleIds = () => Array.from(document.querySelectorAll('[data-testid^="select-work-"]')).map((el) => (el.getAttribute("data-testid") ?? "").replace(/^select-/, ""));
const pack = () => (screen.getByTestId("pack-markdown") as HTMLTextAreaElement).value;
const select = (id: string, value: string) => fireEvent.change(screen.getByTestId(id), { target: { value } });

function declareNaturalHistoryOptics() {
  select("declare-left", "natural-history");
  select("declare-right", "optics");
  fireEvent.click(screen.getByTestId("declare-amendment"));
  fireEvent.click(screen.getByTestId("declare-bridge"));
}

describe("session project", () => {
  it("column order keeps the workbench and inserts project under the graph and notes library under result", () => {
    renderAt("/tech");
    const h2 = Array.from(document.querySelectorAll("main > div > section > h2")).map((h) => (h.textContent ?? "").split(" ·")[0]);
    expect(h2).toEqual(["filters", "field–bridge graph", "project", "works", "actions", "result", "notes library", "export", "refuse glossary"]);
    expect(screen.getByTestId("project-name")).toHaveValue("Untitled project");
    expect(screen.getByTestId("project-summary")).toHaveTextContent(/memory only, not kept across reload/);
    expect(screen.getByTestId("notes-library")).toHaveTextContent(/not kept across reload/);
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
  });

  it("without a declared bridge Darwin + Newton Analyze is disabled; declaring natural-history — optics enables it; the note says the bridge was operator-declared with no assumptions; clearing disables again", () => {
    renderAt("/tech");
    fireEvent.click(screen.getByTestId("select-work-darwin-1859"));
    fireEvent.click(screen.getByTestId("select-work-newton-opticks"));
    expect(screen.getByTestId("action-analyze")).toHaveAttribute("data-enabled", "false");
    expect(screen.getByTestId("missing-caption")).toHaveTextContent("missing: natural-history — optics");
    expect(document.querySelectorAll('[data-testid^="edge-"]')).toHaveLength(6);

    // the checkbox is law: unticked → refused, nothing added
    select("declare-left", "natural-history");
    select("declare-right", "optics");
    fireEvent.click(screen.getByTestId("declare-bridge"));
    expect(screen.getByTestId("declare-status")).toHaveTextContent(/refused/);
    expect(screen.getByTestId("action-analyze")).toHaveAttribute("data-enabled", "false");
    expect(screen.getByTestId("extra-bridges")).toHaveTextContent("no extra bridges");

    fireEvent.click(screen.getByTestId("declare-amendment"));
    fireEvent.click(screen.getByTestId("declare-bridge"));
    expect(screen.getByTestId("declare-status")).toHaveTextContent(/declared amend-natural-history-optics — on this project only/);
    expect(screen.getByTestId("extra-amend-natural-history-optics")).toHaveTextContent("natural-history — optics · operator-declared");
    expect(screen.getByTestId("action-analyze")).toHaveAttribute("data-enabled", "true");
    expect(screen.queryByTestId("missing-caption")).not.toBeInTheDocument();
    const edges = Array.from(document.querySelectorAll('[data-testid^="edge-"]'));
    expect(edges).toHaveLength(7);
    const op = screen.getByTestId("edge-amend-natural-history-optics");
    expect(op).toHaveAttribute("data-origin", "operator");
    expect(op).toHaveAttribute("data-edge", "natural-history—optics");
    expect(edges.filter((e) => e.getAttribute("data-origin") === "shipped")).toHaveLength(6);

    fireEvent.click(screen.getByTestId("action-analyze"));
    expect(screen.getByTestId("result-status")).toHaveTextContent(/ok · analyze · kind couple · ok/);
    expect(screen.getByTestId("note-is-not")).toHaveTextContent(/bridge was operator-declared/);
    expect(screen.getByTestId("note-is-not")).toHaveTextContent(/not an individual score/);
    expect(screen.getByTestId("note-assumptions")).toHaveTextContent(/none declared on these pins/);
    const json = JSON.parse(screen.getByTestId("result-child").textContent ?? "{}");
    expect(json.note.assumptions_used).toEqual([]);
    expect(json.note.is_not).toContain("bridge was operator-declared");
    expect(json.child.path).toEqual(["amend-natural-history-optics"]);

    // the shipped fixture is untouched
    const joins = (b: { left: string; right: string }) => [b.left, b.right].includes("optics") && [b.left, b.right].includes("natural-history");
    expect((classics as ProgrammeFile).bridges.some(joins)).toBe(false);

    fireEvent.click(screen.getByTestId("clear-extra-bridges"));
    expect(screen.getByTestId("extra-bridges")).toHaveTextContent("no extra bridges");
    expect(screen.getByTestId("action-analyze")).toHaveAttribute("data-enabled", "false");
    expect(document.querySelectorAll('[data-testid^="edge-"]')).toHaveLength(6);
    // the note already written stays in the project
    expect(within(screen.getByTestId("notes-list")).getAllByRole("listitem")).toHaveLength(1);
  });

  it("notes library lists notes in time order and re-opens a card; filters do not wipe the project; the pack carries the Darwin URL, the Faraday title and operator-declared", () => {
    renderAt("/tech");
    // note 1: Faraday + Maxwell over a shipped bridge
    fireEvent.click(screen.getByTestId("select-work-faraday-ere-v1"));
    fireEvent.click(screen.getByTestId("select-work-maxwell-elem"));
    fireEvent.click(screen.getByTestId("action-analyze"));
    expect(screen.getByTestId("result-status")).toHaveTextContent(/ok · analyze/);
    fireEvent.click(screen.getByTestId("select-work-faraday-ere-v1"));
    fireEvent.click(screen.getByTestId("select-work-maxwell-elem"));
    // note 2: Darwin + Newton over the amendment
    declareNaturalHistoryOptics();
    fireEvent.click(screen.getByTestId("select-work-darwin-1859"));
    fireEvent.click(screen.getByTestId("select-work-newton-opticks"));
    fireEvent.click(screen.getByTestId("action-analyze"));
    expect(screen.getByTestId("note-is-not")).toHaveTextContent(/operator-declared/);

    const items = within(screen.getByTestId("notes-list")).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent(/01.*Experimental Researches in Electricity.*couple/);
    expect(items[1]).toHaveTextContent(/02.*On the Origin of Species.*couple.*operator-declared bridge/);
    // the current card is the second; clicking the first re-opens the eight-section Faraday card
    expect(screen.getByTestId("note-open-2")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByTestId("note-open-1"));
    expect(screen.getByTestId("note-open-1")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("result-card")).toHaveTextContent(/Experimental Researches in Electricity/);
    expect(screen.getByTestId("result-card")).not.toHaveTextContent(/Origin of Species/);
    expect(Array.from(screen.getByTestId("result-card").querySelectorAll("h3"))).toHaveLength(8);

    // filters never touch the project
    fireEvent.click(screen.getByTestId("filter-autistikon"));
    expect(new Set(visibleIds())).toEqual(new Set(STAND_INS));
    expect(visibleIds()).toHaveLength(2);
    fireEvent.click(screen.getByTestId("filter-classics"));
    fireEvent.click(screen.getByTestId("filter-all"));
    expect(within(screen.getByTestId("notes-list")).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByTestId("extra-amend-natural-history-optics")).toBeInTheDocument();

    // the pack
    fireEvent.change(screen.getByTestId("project-name"), { target: { value: "Two couples" } });
    expect(screen.getByTestId("export-pack")).toHaveTextContent("Download pack");
    const md = pack();
    expect(md.startsWith("# Two couples\n")).toBe(true);
    expect(md).toContain("https://www.gutenberg.org/ebooks/1228");
    expect(md).toContain("Project Gutenberg ebook #1228");
    expect(md).toContain("https://www.gutenberg.org/ebooks/14986");
    expect(md).toContain("Experimental Researches in Electricity, Vol. 1");
    expect(md).toContain("operator-declared");
    expect(md).toContain("### Note 1");
    expect(md).toContain("### Note 2");
    expect(md).toContain("- not a fitted model");
    expect(md).toContain("- not peer review");
    expect(md).toContain("- not Foundation-endorsed");
    expect(md).toContain("- not a public chain");
    expect(screen.getByTestId("pack-preview")).not.toHaveAttribute("open");
  });

  it("an accepted upload joins the project's works and the pack", () => {
    renderAt("/tech");
    fireEvent.change(screen.getByTestId("upload-title"), { target: { value: "Session excerpt on lenses" } });
    select("upload-license", "cc0");
    select("upload-field", "optics");
    fireEvent.change(screen.getByTestId("upload-text"), { target: { value: "A short body about lenses, written for this session." } });
    fireEvent.click(screen.getByTestId("upload-rights"));
    fireEvent.click(screen.getByTestId("upload-submit"));
    expect(screen.getByTestId("upload-result")).toHaveTextContent(/accepted/);
    expect(screen.getByTestId("project-summary")).toHaveTextContent(/1 work used/);
    expect(pack()).toContain("Session excerpt on lenses");
    expect(visibleIds()).toHaveLength(13);
  });
});

/** /tech is one professional workbench: one column, banner in flow, filters,
 *  a field–bridge graph of live bridges only, actions that disable with a
 *  reason, and a Markdown export of a successful note. */
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { STAND_INS } from "../src/lib/filters";
import { renderAt } from "./render";

const visibleIds = () =>
  Array.from(document.querySelectorAll('[data-testid^="select-work-"]')).map((el) => (el.getAttribute("data-testid") ?? "").replace(/^select-/, ""));

describe("workbench chrome", () => {
  it("/tech has 0 canvas; the honesty banner is one in-flow strip, not fixed over the column; title row and amateur strip read as specified", () => {
    renderAt("/tech");
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
    const banner = screen.getByTestId("status-banner");
    expect(banner).toHaveAttribute("data-fixed", "false");
    expect(screen.getByTestId("hud-top")).toHaveAttribute("data-fixed", "false");
    expect(banner).toHaveTextContent(/not a public chain/i);
    expect(screen.getByTestId("title-row")).toHaveTextContent("RexMetrix · Technician · workbench");
    expect(screen.getByTestId("amateur-strip")).toHaveTextContent("Pick two or more works → choose Converge, Compare, or Analyze → read the note.");
    // the banner precedes the title in document order (it cannot overlap it)
    const title = screen.getByTestId("title-row");
    expect(banner.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("main column order: filters → graph → works → actions → result → export → refuse glossary; substrate details closed and last", () => {
    renderAt("/tech");
    const h2 = Array.from(document.querySelectorAll("main > div > section > h2")).map((h) => (h.textContent ?? "").split(" ·")[0]);
    expect(h2).toEqual(["filters", "field–bridge graph", "project", "works", "actions", "result", "notes library", "export", "refuse glossary"]);
    const details = screen.getByTestId("substrate-details") as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(details).toContainElement(screen.getByTestId("tech-programmes"));
    expect(details).toContainElement(screen.getByTestId("json-input"));
  });
});

describe("workbench filters", () => {
  it("All lists every preload including the two Autistikon stand-ins; Autistikon → exactly the two stand-in ids; Classics → Darwin and Faraday, stand-ins hidden", () => {
    renderAt("/tech");
    const all = visibleIds();
    expect(all.length).toBe(12);
    for (const id of STAND_INS) expect(all).toContain(id);
    expect(screen.getByTestId("programme-work-pz-ledger-structure")).toHaveTextContent("Autistikon (example)");
    expect(screen.getByTestId("programme-work-darwin-1859")).toHaveTextContent("Classics");

    fireEvent.click(screen.getByTestId("filter-autistikon"));
    expect(new Set(visibleIds())).toEqual(new Set(STAND_INS));
    expect(visibleIds()).toHaveLength(2);

    fireEvent.click(screen.getByTestId("filter-classics"));
    const classics = visibleIds();
    expect(classics).toContain("work-darwin-1859");
    expect(classics).toContain("work-faraday-ere-v1");
    for (const id of STAND_INS) expect(classics).not.toContain(id);
    expect(classics).toHaveLength(6);

    fireEvent.click(screen.getByTestId("filter-all"));
    expect(visibleIds()).toHaveLength(12);
  });

  it("clicking a graph node filters the table to that field; clicking again clears", () => {
    renderAt("/tech");
    fireEvent.click(screen.getByTestId("node-optics"));
    expect(visibleIds()).toEqual(["work-newton-opticks"]);
    expect(screen.getByTestId("clear-field-filter")).toHaveTextContent("optics");
    fireEvent.click(screen.getByTestId("node-optics"));
    expect(visibleIds()).toHaveLength(12);
  });
});

describe("field–bridge graph", () => {
  it("edges are the live bridges of the loaded catalogues and nothing else: the three classics edges are present, no implicit edge", () => {
    renderAt("/tech");
    const graph = screen.getByTestId("field-graph");
    const edges = Array.from(graph.querySelectorAll('[data-testid^="edge-"]')).map((e) => e.getAttribute("data-edge"));
    expect(edges).toContain("natural-history—heredity");
    expect(edges).toContain("electricity—electromagnetism");
    expect(edges).toContain("optics—electromagnetism");
    // zero (1) + toy (2) + classics (3) live bridges, and no other
    expect(edges).toHaveLength(6);
    expect(edges).not.toContain("natural-history—optics");
    expect(edges.some((e) => (e ?? "").includes("metrology"))).toBe(false);
    expect(within(graph).getByTestId("node-metrology")).toBeInTheDocument();
    expect(screen.queryByTestId("missing-edge")).not.toBeInTheDocument();
  });
});

describe("workbench actions and export", () => {
  it("Darwin + Newton → Analyze disabled with the missing pair named; the graph draws the gap dashed", () => {
    renderAt("/tech");
    fireEvent.click(screen.getByTestId("select-work-darwin-1859"));
    fireEvent.click(screen.getByTestId("select-work-newton-opticks"));
    const analyze = screen.getByTestId("action-analyze");
    expect(analyze).toHaveAttribute("data-enabled", "false");
    expect(analyze).toHaveAttribute("aria-disabled", "true");
    expect(analyze).toHaveAttribute("data-code", "NO_BRIDGE");
    const helper = screen.getByTestId("actions-helper");
    expect(helper).toHaveTextContent(/NO_BRIDGE/);
    expect(helper).toHaveTextContent(/optics/);
    expect(helper).toHaveTextContent(/natural-history/);
    expect(screen.getByTestId("why-analyze")).toHaveTextContent(/no path natural-history — optics/);
    expect(screen.getByTestId("missing-edge")).toBeInTheDocument();
    expect(screen.getByTestId("missing-caption")).toHaveTextContent("missing: natural-history — optics");
    // the bridge was not added silently
    const edges = Array.from(document.querySelectorAll('[data-testid^="edge-"]'));
    expect(edges).toHaveLength(6);
    expect(screen.queryByTestId("export-panel")).not.toBeInTheDocument();
  });

  it("Faraday + Maxwell → Analyze enabled; after the run the export markdown names both parents and says not an individual score", () => {
    renderAt("/tech");
    fireEvent.click(screen.getByTestId("select-work-faraday-ere-v1"));
    fireEvent.click(screen.getByTestId("select-work-maxwell-elem"));
    const analyze = screen.getByTestId("action-analyze");
    expect(analyze).toHaveAttribute("data-enabled", "true");
    expect(analyze).not.toHaveAttribute("aria-disabled", "true");
    expect(screen.getByTestId("actions-helper")).toHaveTextContent(/every action would pass/);
    expect(screen.queryByTestId("missing-caption")).not.toBeInTheDocument();
    fireEvent.click(analyze);
    expect(screen.getByTestId("result-status")).toHaveTextContent(/ok · analyze · kind couple · ok/);
    const md = (screen.getByTestId("export-markdown") as HTMLTextAreaElement).value;
    expect(md).toContain("Faraday");
    expect(md).toContain("Maxwell");
    expect(md).toContain("not an individual score");
    expect(md).toContain("## 1. Question");
    expect(md).toContain("## 8. Appendix");
    expect(md).toMatch(/Jaccard: \d+%/);
    expect(md).toContain("gutenberg.org");
    expect(md).toContain("No model wrote this.");
    expect(screen.getByTestId("export-copy")).toHaveTextContent("Copy Markdown");
    expect(screen.getByTestId("export-download")).toHaveTextContent("Download .md");
  });

  it("one selected work → every action disabled with NEED_PARENTS", () => {
    renderAt("/tech");
    fireEvent.click(screen.getByTestId("select-work-darwin-1859"));
    for (const k of ["converge", "compare", "analyze"]) expect(screen.getByTestId(`action-${k}`)).toHaveAttribute("data-code", "NEED_PARENTS");
    expect(screen.getByTestId("actions-helper")).toHaveTextContent(/blocked: NEED_PARENTS/);
  });
});

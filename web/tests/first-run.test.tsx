/** First run: three steps above the filters, dismissible, remembered by one
 *  flag; steps tick from the project's notes. No new science engine. */
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { STAND_INS } from "../src/lib/filters";
import { FIRST_RUN_KEY, FIRST_RUN_STEPS } from "../src/lib/firstRun";
import { PROJECT_STORAGE_KEY } from "../src/lib/projectStore";
import { renderAt } from "./render";

const visibleIds = () => Array.from(document.querySelectorAll('[data-testid^="select-work-"]')).map((el) => (el.getAttribute("data-testid") ?? "").replace(/^select-/, ""));

describe("first run", () => {
  it("shows above the filters on a fresh browser, with the three step texts and the honesty sentence; it is not a modal", () => {
    renderAt("/tech");
    const panel = screen.getByTestId("first-run");
    expect(panel.tagName).toBe("ASIDE");
    expect(panel).not.toHaveAttribute("role", "dialog");
    expect(panel).not.toHaveAttribute("aria-modal");
    const filters = screen.getByTestId("filters");
    expect(panel.compareDocumentPosition(filters) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId("first-run-step-1")).toHaveTextContent("Filter Classics. Tick Faraday and Maxwell. Compare.");
    expect(screen.getByTestId("first-run-step-2")).toHaveTextContent("Filter Autistikon. Tick both stand-ins. Converge.");
    expect(screen.getByTestId("first-run-step-3")).toHaveTextContent("Download pack.");
    expect(screen.getByTestId("first-run-honesty")).toHaveTextContent("RexMetrix is research software for hypothesis-led programmes. Not a diagnostic. Not Foundation-endorsed. Not a public chain.");
    expect(panel.textContent).not.toMatch(/AI scientist|MetaInsight|forest plot/i);
    // the rest of the workbench is reachable: nothing traps focus
    screen.getByTestId("filter-all").focus();
    expect(document.activeElement).toBe(screen.getByTestId("filter-all"));
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
  });

  it("skip hides the panel, writes the seen flag, and the panel stays hidden on remount; the project key is untouched", () => {
    const first = renderAt("/tech");
    expect(window.localStorage.getItem(FIRST_RUN_KEY)).toBeNull();
    fireEvent.click(screen.getByTestId("first-run-skip"));
    expect(screen.queryByTestId("first-run")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(FIRST_RUN_KEY)).toBe("1");
    expect(Object.keys(window.localStorage).sort()).toEqual([PROJECT_STORAGE_KEY, FIRST_RUN_KEY].sort());
    first.unmount();
    renderAt("/tech");
    expect(screen.queryByTestId("first-run")).not.toBeInTheDocument();
    expect(screen.getByTestId("filters")).toBeInTheDocument();
  });

  it("Esc sets the flag too", () => {
    renderAt("/tech");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("first-run")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(FIRST_RUN_KEY)).toBe("1");
  });

  it("steps tick when the matching notes exist: Faraday + Maxwell Compare at 8%, both stand-ins Converge at 16%, then the pack", () => {
    renderAt("/tech");
    for (const n of [1, 2, 3]) expect(screen.getByTestId(`first-run-step-${n}`)).toHaveAttribute("data-done", "false");

    // step 1 — the "set the filter" link sets Classics; the two rows are ticked; Compare
    fireEvent.click(screen.getByTestId("first-run-go-1"));
    expect(screen.getByTestId("filter-classics")).toHaveAttribute("aria-pressed", "true");
    expect(visibleIds()).toHaveLength(6);
    fireEvent.click(screen.getByTestId("select-work-faraday-ere-v1"));
    fireEvent.click(screen.getByTestId("select-work-maxwell-elem"));
    fireEvent.click(screen.getByTestId("action-compare"));
    expect(screen.getByTestId("result-status")).toHaveTextContent(/ok · compare · kind match · ok/);
    expect(screen.getByTestId("jaccard")).toHaveTextContent("8%"); // the excerpts are not retuned
    expect(screen.getByTestId("first-run-step-1")).toHaveAttribute("data-done", "true");
    expect(screen.getByTestId("first-run-step-2")).toHaveAttribute("data-done", "false");
    fireEvent.click(screen.getByTestId("select-work-faraday-ere-v1"));
    fireEvent.click(screen.getByTestId("select-work-maxwell-elem"));

    // step 2 — Autistikon shows exactly the two stand-ins; Converge
    fireEvent.click(screen.getByTestId("first-run-go-2"));
    expect(new Set(visibleIds())).toEqual(new Set(STAND_INS));
    expect(visibleIds()).toHaveLength(2);
    for (const id of STAND_INS) fireEvent.click(screen.getByTestId(`select-${id}`));
    fireEvent.click(screen.getByTestId("action-converge"));
    expect(screen.getByTestId("result-status")).toHaveTextContent(/ok · converge · kind overlap · ok/);
    expect(screen.getByTestId("jaccard")).toHaveTextContent("16%");
    expect(screen.getByTestId("first-run-step-2")).toHaveAttribute("data-done", "true");
    expect(screen.getByTestId("first-run-step-3")).toHaveAttribute("data-done", "false");
    expect(screen.queryByTestId("first-run-finish")).not.toBeInTheDocument();

    // step 3 — the pack (jsdom has no createObjectURL: the panel still reports the click as the step)
    fireEvent.click(screen.getByTestId("export-pack"));
    expect(screen.getByTestId("first-run-step-3")).toHaveAttribute("data-done", "true");
    expect(screen.getByTestId("first-run")).toHaveAttribute("data-done", "3");
    fireEvent.click(screen.getByTestId("first-run-finish"));
    expect(screen.queryByTestId("first-run")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(FIRST_RUN_KEY)).toBe("1");
    expect(within(screen.getByTestId("notes-list")).getAllByRole("listitem")).toHaveLength(2);
  });

  it("the step law is data: three steps, the first two read notes by job and parent ids only", () => {
    expect(FIRST_RUN_STEPS.map((s) => s.n)).toEqual([1, 2, 3]);
    expect(FIRST_RUN_STEPS[0]!.done([], false)).toBe(false);
    expect(FIRST_RUN_STEPS[2]!.done([], true)).toBe(true);
  });
});

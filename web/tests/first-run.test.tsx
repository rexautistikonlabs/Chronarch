/** First run: four steps above the filters, dismissible, remembered by one
 *  flag; steps tick from the workbench's own state. No step names a corpus,
 *  a fixture id or an author; the one "go" control offers a starter pack. */
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FIRST_RUN_KEY, FIRST_RUN_STEPS } from "../src/lib/firstRun";
import { renderAt } from "./render";
import { recordReading } from "./bench-ui";

const visibleIds = () => Array.from(document.querySelectorAll('[data-testid^="select-work-"]')).map((el) => (el.getAttribute("data-testid") ?? "").replace(/^select-/, ""));

describe("first run", () => {
  it("shows above the filters on a fresh browser, with the four step texts and the honesty sentence; it is not a modal; it names no corpus, id or author", () => {
    renderAt("/tech");
    const panel = screen.getByTestId("first-run");
    expect(panel.tagName).toBe("ASIDE");
    expect(panel).not.toHaveAttribute("role", "dialog");
    expect(panel).not.toHaveAttribute("aria-modal");
    const filters = screen.getByTestId("filters");
    expect(panel.compareDocumentPosition(filters) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(panel).getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByTestId("first-run-step-1")).toHaveTextContent("Add two fields — a label, its units, its sector — or load an optional catalogue (Classics, Toy, or the example corpus).");
    expect(screen.getByTestId("first-run-step-2")).toHaveTextContent("Pin or select two works you have rights to (or two from a loaded catalogue).");
    expect(screen.getByTestId("first-run-step-3")).toHaveTextContent("Fill the reading record (mode, status, identifiability), then Converge or Compare. If the two works sit in two fields, declare a bridge first and tick “amendment, not evidence”.");
    expect(screen.getByTestId("first-run-step-4")).toHaveTextContent("Download pack.");
    expect(panel.textContent).not.toMatch(/Autistikon|Programme Zero|stand-in|Faraday|Maxwell|Darwin|Mendel|Newton|NIST|work-|pz-/i);
    expect(screen.getByTestId("first-run-go-1")).toHaveTextContent("load a public-domain starter pack");
    expect(screen.queryByTestId("first-run-go-2")).not.toBeInTheDocument();
    expect(screen.getByTestId("first-run-honesty")).toHaveTextContent("Chronarch is research software for hypothesis-led programmes. Not a diagnostic. Not a medical device. Not Foundation-endorsed.");
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
    expect(Object.keys(window.localStorage)).toEqual([FIRST_RUN_KEY]); // the project key waits for a real change
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

  it("steps tick from the workbench: the starter pack gives the fields, two ticked works, one Compare over a shipped bridge, then the pack — and All stays the filter", () => {
    renderAt("/tech");
    for (const n of [1, 2, 3, 4]) expect(screen.getByTestId(`first-run-step-${n}`)).toHaveAttribute("data-done", "false");

    // step 1 — the "go" link loads the Classics starter pack; it is a programme, not a corpus filter
    fireEvent.click(screen.getByTestId("first-run-go-1"));
    expect(screen.getByTestId("tech-programme-classics.json")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("filter-all")).toHaveAttribute("aria-pressed", "true");
    expect(visibleIds()).toHaveLength(10);
    expect(screen.getByTestId("first-run-step-1")).toHaveAttribute("data-done", "true");
    expect(screen.queryByTestId("first-run-go-1")).not.toBeInTheDocument();

    // step 2 — two works ticked (any two you have rights to; here two public-domain rows)
    fireEvent.click(screen.getByTestId("select-work-faraday-ere-v1"));
    expect(screen.getByTestId("first-run-step-2")).toHaveAttribute("data-done", "false");
    fireEvent.click(screen.getByTestId("select-work-maxwell-elem"));
    expect(screen.getByTestId("first-run-step-2")).toHaveAttribute("data-done", "true");

    // step 3 — the record, then Compare across the shipped electricity — electromagnetism bridge
    recordReading();
    fireEvent.click(screen.getByTestId("action-compare"));
    expect(screen.getByTestId("result-status")).toHaveTextContent(/ok · compare · kind match · ok/);
    expect(screen.getByTestId("jaccard")).toHaveTextContent("8%"); // the excerpts are not retuned
    expect(screen.getByTestId("first-run-step-3")).toHaveAttribute("data-done", "true");
    expect(screen.getByTestId("first-run-step-4")).toHaveAttribute("data-done", "false");
    expect(screen.queryByTestId("first-run-finish")).not.toBeInTheDocument();

    // step 4 — the pack (jsdom has no createObjectURL: the panel still reports the click as the step)
    fireEvent.click(screen.getByTestId("export-pack"));
    expect(screen.getByTestId("first-run-step-4")).toHaveAttribute("data-done", "true");
    expect(screen.getByTestId("first-run")).toHaveAttribute("data-done", "4");
    fireEvent.click(screen.getByTestId("first-run-finish"));
    expect(screen.queryByTestId("first-run")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(FIRST_RUN_KEY)).toBe("1");
    expect(within(screen.getByTestId("notes-list")).getAllByRole("listitem")).toHaveLength(1);
  });

  it("the step law is data: four steps that read counts, never parent ids", () => {
    expect(FIRST_RUN_STEPS.map((s) => s.n)).toEqual([1, 2, 3, 4]);
    const none = { fieldCount: 0, selectedCount: 0, noteCount: 0, packDone: false };
    expect(FIRST_RUN_STEPS[0]!.done(none)).toBe(false);
    expect(FIRST_RUN_STEPS[0]!.done({ ...none, fieldCount: 2 })).toBe(true);
    expect(FIRST_RUN_STEPS[1]!.done({ ...none, selectedCount: 2 })).toBe(true);
    expect(FIRST_RUN_STEPS[2]!.done({ ...none, noteCount: 1 })).toBe(true);
    expect(FIRST_RUN_STEPS[3]!.done({ ...none, packDone: true })).toBe(true);
    const src = JSON.stringify(FIRST_RUN_STEPS.map((s) => [s.text, s.action]));
    expect(src).not.toMatch(/work-|pz-|autistikon|programme-zero/i);
  });
});

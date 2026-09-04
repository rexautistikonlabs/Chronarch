/** The lab floor (/): no protocol names in the primary chrome, one plain
 *  STATUS sentence, two record chips, four benches, human readouts. */
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderAt } from "./render";

const PROTOCOL = /^(Timechain|Council|Hearth|Farm|Gym|Operator)$/i;

describe("lab floor", () => {
  it("has no primary nav item named after a protocol object", () => {
    renderAt("/");
    const nav = screen.getByTestId("primary-nav");
    const labels = within(nav).getAllByRole("link").map((a) => a.textContent?.trim() ?? "");
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) expect(label).not.toMatch(PROTOCOL);
    expect(screen.queryByTestId("tech-nav")).not.toBeInTheDocument(); // the protocol sub-nav is technician-only
    // and no header link anywhere on the floor is a protocol name
    const header = document.querySelector("header")!;
    for (const a of Array.from(header.querySelectorAll("a"))) expect(a.textContent?.trim() ?? "").not.toMatch(PROTOCOL);
  });

  it('says "not a public blockchain" in plain English', () => {
    renderAt("/");
    expect(screen.getByTestId("plain-status")).toHaveTextContent(/not a public blockchain/);
    expect(screen.getByTestId("status-banner")).toHaveTextContent(/not a public blockchain/);
  });

  it("Quiet pulse vs The vote changes pages remembered 4 → 5 (height 3 → 4)", () => {
    renderAt("/");
    expect(screen.getByTestId("ring-count")).toHaveTextContent("4");
    expect(screen.getByTestId("height")).toHaveTextContent("3");
    fireEvent.click(screen.getByTestId("chip-session-opa.json"));
    expect(screen.getByTestId("ring-count")).toHaveTextContent("5");
    expect(screen.getByTestId("height")).toHaveTextContent("4");
    expect(screen.getByTestId("peer-count")).toHaveTextContent("3");
    fireEvent.click(screen.getByTestId("chip-session-solo.json"));
    expect(screen.getByTestId("ring-count")).toHaveTextContent("4");
  });

  it("readouts are human words; hex and credits stay in the technician room", () => {
    renderAt("/");
    const floor = screen.getByTestId("human-readouts");
    expect(floor).toHaveTextContent(/beats/);
    expect(floor).toHaveTextContent(/pages remembered/);
    expect(floor).toHaveTextContent(/marks that stay/);
    expect(floor).toHaveTextContent(/files ok/);
    const main = document.querySelector("main")!;
    expect(main.textContent).not.toMatch(/bde78f7d/); // the head hash never shows on the floor
    expect(main.textContent).not.toMatch(/[0-9a-f]{16,}/);
    expect(main.textContent).not.toMatch(/chronons|credits_by_reason|head_hash|ring_count/);
    expect(screen.queryByTestId("head-hash")).not.toBeInTheDocument();
  });

  it("a bench click focuses the camera once and opens one card; a second click closes it", () => {
    renderAt("/");
    expect(screen.queryByTestId("bench-card")).not.toBeInTheDocument();
    const viewport = () => screen.getByTestId("viewport-fallback");
    expect(viewport()).toHaveAttribute("data-focus", "overview");
    fireEvent.click(screen.getByTestId("bench-memory"));
    expect(viewport()).toHaveAttribute("data-focus", "timechain");
    const card = screen.getByTestId("bench-card");
    expect(card).toHaveAttribute("data-bench", "memory");
    expect(card).toHaveTextContent(/4 pages, no marks/);
    fireEvent.click(screen.getByTestId("bench-vote"));
    expect(screen.getAllByTestId("bench-card")).toHaveLength(1); // one card at a time
    expect(screen.getByTestId("bench-card")).toHaveAttribute("data-bench", "vote");
    expect(viewport()).toHaveAttribute("data-focus", "council");
    fireEvent.click(screen.getByTestId("bench-vote"));
    expect(screen.queryByTestId("bench-card")).not.toBeInTheDocument();
    expect(viewport()).toHaveAttribute("data-focus", "overview");
  });

  it("the vote card tells the truth about each record", () => {
    renderAt("/");
    fireEvent.click(screen.getByTestId("bench-vote"));
    expect(screen.getByTestId("bench-card")).toHaveTextContent(/nothing on the table/);
    fireEvent.click(screen.getByTestId("chip-session-opa.json"));
    expect(screen.getByTestId("bench-card")).toHaveTextContent(/a change was voted in/);
    expect(screen.getByTestId("bench-card")).toHaveTextContent(/3 seats/);
  });
});

/** The programme well (/): no protocol names in the primary chrome, one plain
 *  honesty sentence, two programme chips, four benches, plain readouts. */
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderAt } from "./render";

const PROTOCOL = /^(Timechain|Council|Hearth|Farm|Gym|Operator)$/i;

describe("programme well", () => {
  it("has no primary nav item named after a protocol object", () => {
    renderAt("/chronarch");
    const nav = screen.getByTestId("primary-nav");
    const labels = [...within(nav).getAllByRole("link"), ...within(nav).getAllByRole("button")].map((a) => a.textContent?.trim() ?? "");
    expect(labels).toContain("Technician");
    expect(labels).toContain("About");
    for (const label of labels) expect(label).not.toMatch(PROTOCOL);
    expect(screen.queryByTestId("tech-nav")).not.toBeInTheDocument();
    const header = document.querySelector("header")!;
    for (const a of Array.from(header.querySelectorAll("a"))) expect(a.textContent?.trim() ?? "").not.toMatch(PROTOCOL);
  });

  it("says what it is and is not, in plain English", () => {
    renderAt("/chronarch");
    const plain = screen.getByTestId("plain-status");
    expect(plain).toHaveTextContent(/^Chronarch/);
    expect(plain).toHaveTextContent(/research software for hypothesis-led programmes/);
    expect(plain).toHaveTextContent(/not a diagnostic/);
    expect(plain).toHaveTextContent(/not Foundation-endorsed/);
    expect(plain).toHaveTextContent(/not a medical device/);
    expect(screen.getByTestId("status-banner")).toHaveTextContent(/Not a medical device/);
  });

  it("Programme Zero vs the toy programme changes field_count 2 → 3 and bridge_count 1 → 2", () => {
    renderAt("/chronarch");
    expect(screen.getByTestId("field-count")).toHaveTextContent("2");
    expect(screen.getByTestId("bridge-count")).toHaveTextContent("1");
    fireEvent.click(screen.getByTestId("chip-programme-toy.json"));
    expect(screen.getByTestId("field-count")).toHaveTextContent("3");
    expect(screen.getByTestId("bridge-count")).toHaveTextContent("2");
    expect(screen.getByTestId("viewport-fallback")).toHaveAttribute("data-programme", "programme-toy");
    fireEvent.click(screen.getByTestId("chip-programme-zero.json"));
    expect(screen.getByTestId("field-count")).toHaveTextContent("2");
    expect(screen.getByTestId("ledger-count")).toHaveTextContent("6");
    expect(screen.getByTestId("register-count")).toHaveTextContent("4");
  });

  it("readouts are programme words; hex, credits and substrate names stay in the technician room", () => {
    renderAt("/chronarch");
    const floor = screen.getByTestId("human-readouts");
    for (const word of ["fields in this programme", "bridges declared", "assumptions rated", "falsifiers registered", "items locked", "stops on"]) expect(floor).toHaveTextContent(word);
    const main = document.querySelector("main")!;
    expect(main.textContent).not.toMatch(/[0-9a-f]{16,}/);
    expect(main.textContent).not.toMatch(/chronons|credits_by_reason|head_hash|ring_count|Timechain|Council|Hearth/);
    expect(screen.queryByTestId("head-hash")).not.toBeInTheDocument();
  });

  it("the benches read Fields, Bridges, Programmes, Synthesis; a click focuses once and opens one card", () => {
    renderAt("/chronarch");
    const benches = screen.getByTestId("benches");
    expect(within(benches).getAllByRole("button").map((b) => b.textContent)).toEqual(expect.arrayContaining([expect.stringMatching(/^Fields/), expect.stringMatching(/^Bridges/), expect.stringMatching(/^Programmes/), expect.stringMatching(/^Synthesis/)]));
    expect(benches.textContent).not.toMatch(/Vote|Council|Memory|Pulse/);
    const viewport = () => screen.getByTestId("viewport-fallback");
    expect(viewport()).toHaveAttribute("data-focus", "overview");
    fireEvent.click(screen.getByTestId("bench-fields"));
    expect(viewport()).toHaveAttribute("data-focus", "fields");
    expect(screen.getByTestId("bench-card")).toHaveAttribute("data-bench", "fields");
    expect(screen.getByTestId("bench-card")).toHaveTextContent(/2 fields, each with its own units/);
    fireEvent.click(screen.getByTestId("bench-bridges"));
    expect(screen.getAllByTestId("bench-card")).toHaveLength(1);
    expect(screen.getByTestId("bench-card")).toHaveTextContent(/NO_BRIDGE/);
    fireEvent.click(screen.getByTestId("bench-synthesis"));
    expect(screen.getByTestId("bench-card")).toHaveTextContent(/a question child, 2 parents, 3 bridges on its path/);
    fireEvent.click(screen.getByTestId("bench-synthesis"));
    expect(screen.queryByTestId("bench-card")).not.toBeInTheDocument();
    expect(viewport()).toHaveAttribute("data-focus", "overview");
  });

  it("the programmes card tells the truth about each programme", () => {
    renderAt("/chronarch");
    fireEvent.click(screen.getByTestId("bench-programmes"));
    expect(screen.getByTestId("bench-card")).toHaveTextContent(/Programme Zero/);
    expect(screen.getByTestId("bench-card")).toHaveTextContent(/example programme and first corpus/);
    fireEvent.click(screen.getByTestId("chip-programme-toy.json"));
    expect(screen.getByTestId("bench-card")).toHaveTextContent(/invented demo programme/);
    expect(screen.getByTestId("bench-card")).toHaveTextContent(/1 amendment/);
  });
});

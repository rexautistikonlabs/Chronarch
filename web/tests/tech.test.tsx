/** The technician room (/tech): the console with paste + fixtures, hashes,
 *  credits, the operator path, the gym list and the consortium line. */
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderAt } from "./render";

describe("technician room", () => {
  it("still has paste + fixtures by filename, and is not the default landing", () => {
    renderAt("/tech");
    expect(screen.getByTestId("json-input")).toBeInTheDocument();
    expect(screen.getByTestId("apply-json")).toBeInTheDocument();
    expect(screen.getByTestId("load-session-opa.json")).toBeInTheDocument();
    expect(screen.getByTestId("load-session-solo.json")).toBeInTheDocument();
    expect(screen.getByTestId("status-banner")).toHaveTextContent(/not a public chain/i);
    expect(screen.queryByTestId("tech-nav")).not.toBeInTheDocument(); // one room: no protocol sub-nav
  });

  it("is one room: no link in the chrome or the panel reads Council, Timechain, Hearth, Farm, Gym or Operator", () => {
    renderAt("/tech");
    const PROTOCOL = /^(Council|Timechain|Hearth|Farm|Gym|Operator)$/i;
    for (const a of Array.from(document.querySelectorAll("header a, header button, [data-testid=\"tech-panel\"] a"))) {
      expect(a.textContent?.trim() ?? "").not.toMatch(PROTOCOL);
    }
    // and no heading in the main column teaches the substrate's governance
    for (const h of Array.from(document.querySelectorAll("main h1, main h2"))) {
      expect(h.textContent ?? "").not.toMatch(/Council|Timechain|Hearth|G1[456]|proposal prism/i);
    }
  });

  it("sections come in the bench's order: works, actions, refuse glossary, programmes; the substrate is a closed details", () => {
    renderAt("/tech");
    const titles = Array.from(document.querySelectorAll("main > div > section > h2")).map((h) => h.textContent ?? "");
    const idx = (re: RegExp) => titles.findIndex((t) => re.test(t));
    expect(idx(/works/)).toBeGreaterThanOrEqual(0);
    expect(idx(/works/)).toBeLessThan(idx(/actions/));
    expect(idx(/actions/)).toBeLessThan(idx(/refuse glossary/));
    expect(idx(/refuse glossary/)).toBeLessThan(idx(/^programmes$/));
    const details = screen.getByTestId("substrate-details") as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(details).toHaveTextContent(/internal code name Chronarch — not the product/);
    expect(screen.getByTestId("refuse-codes")).toHaveTextContent(/FULLTEXT_FORBIDDEN/);
    expect(screen.getByTestId("refuse-codes")).toHaveTextContent(/NO_BRIDGE/);
  });

  it("the retired protocol paths land in the one room, never on a Council heading", () => {
    for (const path of ["/council", "/timechain", "/hearth", "/farm", "/gym", "/operator"]) {
      const { unmount } = renderAt(path);
      expect(screen.getByTestId("json-input")).toBeInTheDocument();
      expect(document.querySelector("main h1")?.textContent ?? "").toMatch(/One room for the operator/);
      unmount();
    }
    renderAt("/consortium");
    expect(screen.getByTestId("about-panel")).toBeInTheDocument();
  });

  it("shows hashes; credits, the command log and the self-test list live in the substrate details", () => {
    renderAt("/tech");
    fireEvent.click(screen.getByTestId("load-session-opa.json"));
    expect(screen.getByTestId("head-hash")).toHaveTextContent(/^ecdbe6b08f/);
    expect(screen.getByTestId("head-hash-full")).toHaveTextContent(/ecdbe6b08f83b611a2dd5c46935f95dd2e71d7ac006349de3b5aaebf9d1ad1ae/);
    expect(screen.getByTestId("operator-log").querySelectorAll("li").length).toBeGreaterThanOrEqual(10); // inside the closed substrate details
    expect(screen.getByTestId("gym-list")).toHaveTextContent(/fake_admin_key_tx/);
    expect(screen.getByTestId("gym-list").querySelectorAll("li")).toHaveLength(12);
    expect(screen.getByTestId("json-viewer")).toHaveTextContent(/peer-peer_add-net-node-2/);
  });

  it("/lab redirects into the technician room (the old console path never goes dark)", () => {
    renderAt("/lab");
    expect(screen.getByTestId("json-input")).toBeInTheDocument();
    expect(screen.getByTestId("status-banner")).toBeInTheDocument();
  });
});

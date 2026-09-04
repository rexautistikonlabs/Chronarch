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
    expect(screen.getByTestId("status-banner")).toHaveTextContent(/not a public blockchain/i);
    expect(screen.getByTestId("tech-nav")).toBeInTheDocument();
  });

  it("shows hashes, credits, the operator log, the gym list and the consortium line", () => {
    renderAt("/tech");
    fireEvent.click(screen.getByTestId("load-session-opa.json"));
    expect(screen.getByTestId("head-hash")).toHaveTextContent(/^ecdbe6b08f/);
    expect(screen.getByTestId("head-hash-full")).toHaveTextContent(/ecdbe6b08f83b611a2dd5c46935f95dd2e71d7ac006349de3b5aaebf9d1ad1ae/);
    expect(screen.getByTestId("operator-log").querySelectorAll("li").length).toBeGreaterThanOrEqual(10);
    expect(screen.getByTestId("gym-list")).toHaveTextContent(/fake_admin_key_tx/);
    expect(screen.getByTestId("gym-list").querySelectorAll("li")).toHaveLength(12);
    expect(screen.getByTestId("consortium-line")).toHaveTextContent(/studied, not sold/);
    expect(screen.getByTestId("json-viewer")).toHaveTextContent(/peer-peer_add-net-node-2/);
  });

  it("/lab redirects into the technician room (the old console path never goes dark)", () => {
    renderAt("/lab");
    expect(screen.getByTestId("json-input")).toBeInTheDocument();
    expect(screen.getByTestId("status-banner")).toBeInTheDocument();
  });
});

/** Opening a card, hovering a bench or switching a record must not remount the
 *  well (in jsdom: its still fallback stands where the canvas would). */
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderAt } from "./render";

describe("the well is never remounted by the HUD", () => {
  it("keeps the same DOM node across bench select, hover and a record switch", () => {
    renderAt("/");
    const node = screen.getByTestId("viewport-fallback");
    fireEvent.mouseEnter(screen.getByTestId("bench-memory"));
    fireEvent.click(screen.getByTestId("bench-memory"));
    expect(screen.getByTestId("bench-card")).toBeInTheDocument();
    expect(screen.getByTestId("viewport-fallback")).toBe(node);
    fireEvent.click(screen.getByTestId("chip-session-opa.json"));
    expect(screen.getByTestId("ring-count")).toHaveTextContent("5");
    expect(screen.getByTestId("viewport-fallback")).toBe(node);
    fireEvent.click(screen.getByTestId("bench-memory")); // close the card
    expect(screen.queryByTestId("bench-card")).not.toBeInTheDocument();
    expect(screen.getByTestId("viewport-fallback")).toBe(node);
  });
});

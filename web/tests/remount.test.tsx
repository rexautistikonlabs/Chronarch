/** Opening a card, hovering a bench or switching a programme must not remount
 *  the well (in jsdom: its still fallback stands where the canvas would). */
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderAt } from "./render";

describe("the well is never remounted by the HUD", () => {
  it("keeps the same DOM node across bench select, hover and a programme switch", () => {
    renderAt("/chronarch");
    const node = screen.getByTestId("viewport-fallback");
    fireEvent.mouseEnter(screen.getByTestId("bench-fields"));
    fireEvent.click(screen.getByTestId("bench-fields"));
    expect(screen.getByTestId("bench-card")).toBeInTheDocument();
    expect(screen.getByTestId("viewport-fallback")).toBe(node);
    fireEvent.click(screen.getByTestId("chip-programme-toy.json"));
    expect(screen.getByTestId("field-count")).toHaveTextContent("3");
    expect(screen.getByTestId("viewport-fallback")).toBe(node);
    fireEvent.click(screen.getByTestId("bench-fields")); // close the card
    expect(screen.queryByTestId("bench-card")).not.toBeInTheDocument();
    expect(screen.getByTestId("viewport-fallback")).toBe(node);
  });
});

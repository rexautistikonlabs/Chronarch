/** ⌘K: the palette opens on the shortcut and its items navigate or open a
 *  card. It never fetches and never spawns anything. */
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderAt } from "./render";

describe("command palette", () => {
  it("opens with ⌘K / Ctrl+K and a bench item opens that bench's card", async () => {
    renderAt("/");
    expect(screen.queryByTestId("palette-input")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const input = await screen.findByTestId("palette-input");
    expect(input).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("palette-memory"));
    expect(screen.getByTestId("bench-card")).toHaveAttribute("data-bench", "memory");
    expect(screen.getByTestId("viewport-fallback")).toHaveAttribute("data-focus", "timechain");
  });

  it("the ⌘K button opens it too, and 'Paste session' goes to the technician room", async () => {
    renderAt("/");
    fireEvent.click(screen.getByTestId("open-palette"));
    await screen.findByTestId("palette-input");
    fireEvent.click(screen.getByTestId("palette-paste"));
    expect(await screen.findByTestId("json-input")).toBeInTheDocument();
    expect(screen.getByTestId("tech-nav")).toBeInTheDocument();
  });
});

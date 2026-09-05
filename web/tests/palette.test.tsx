/** ⌘K: the palette opens on the shortcut and its items navigate or open a
 *  card. It never fetches and never spawns anything. */
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderAt } from "./render";

describe("command palette", () => {
  it("opens with ⌘K / Ctrl+K and a bench item opens that bench's card", async () => {
    renderAt("/chronarch");
    expect(screen.queryByTestId("palette-input")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    await screen.findByTestId("palette-input");
    fireEvent.click(screen.getByTestId("palette-fields"));
    expect(screen.getByTestId("bench-card")).toHaveAttribute("data-bench", "fields");
    expect(screen.getByTestId("viewport-fallback")).toHaveAttribute("data-focus", "fields");
  });

  it("the ⌘K button opens it too; 'Paste session' goes to the technician room, 'About' to the rules", async () => {
    renderAt("/chronarch");
    fireEvent.click(screen.getByTestId("open-palette"));
    await screen.findByTestId("palette-input");
    fireEvent.click(screen.getByTestId("palette-paste"));
    expect(await screen.findByTestId("json-input")).toBeInTheDocument();
    expect(screen.queryByTestId("tech-nav")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("open-palette"));
    await screen.findByTestId("palette-input");
    fireEvent.click(screen.getByTestId("palette-about"));
    expect(await screen.findByTestId("about-panel")).toHaveTextContent(/what chronarch will not ship/i);
  });
});

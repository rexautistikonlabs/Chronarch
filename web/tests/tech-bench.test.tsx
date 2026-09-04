/** /tech is a flat HTML bench: no well on that route; the visitor keeps it. */
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderAt } from "./render";

describe("operator bench", () => {
  it("/tech has no canvas, no well, no scanlines; / keeps the well", () => {
    const tech = renderAt("/tech");
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
    expect(screen.queryByTestId("viewport")).not.toBeInTheDocument();
    expect(screen.queryByTestId("viewport-fallback")).not.toBeInTheDocument();
    expect(document.querySelector(".scanlines")).toBeNull();
    expect(screen.getByTestId("tech-bench")).toBeInTheDocument();
    expect(screen.getByTestId("status-banner")).toHaveTextContent(/not a public chain/i);
    tech.unmount();
    renderAt("/");
    // jsdom has no WebGL: the well's still fallback stands where the canvas would
    expect(screen.getByTestId("viewport-fallback")).toBeInTheDocument();
  });

  it("sections come in the bench's order", () => {
    renderAt("/tech");
    const h2 = Array.from(document.querySelectorAll("main > div > section > h2")).map((h) => h.textContent ?? "");
    expect(h2.map((t) => t.split(" ·")[0])).toEqual(["works", "actions", "programmes and fixtures", "paste session json", "hashes (loaded session)", "refuse glossary"]);
    expect(screen.getByTestId("substrate-details")).not.toHaveAttribute("open");
  });

  it("select two cc-by stand-ins → Converge → an overlap child; one selection → NEED_PARENTS; a stub → Compare refuses; two stubs → Analyze asks", () => {
    renderAt("/tech");
    const status = () => screen.getByTestId("result-status");
    fireEvent.click(screen.getByTestId("select-work-pz-ledger-structure"));
    expect(screen.getByTestId("selected-count")).toHaveTextContent("1");
    fireEvent.click(screen.getByTestId("action-converge"));
    expect(status()).toHaveTextContent(/refused · NEED_PARENTS/);

    fireEvent.click(screen.getByTestId("select-work-pz-register-structure"));
    fireEvent.click(screen.getByTestId("action-converge"));
    expect(status()).toHaveTextContent(/ok · converge → kind overlap/);
    const child = JSON.parse(screen.getByTestId("result-child").textContent ?? "{}");
    expect(child.kind).toBe("overlap");
    expect(child.parents).toHaveLength(2);
    expect(within(screen.getByTestId("results-list")).getAllByRole("listitem")).toHaveLength(1);

    fireEvent.click(screen.getByTestId("select-work-pz-register-structure")); // deselect
    fireEvent.click(screen.getByTestId("select-work-stub-doi-example"));
    fireEvent.click(screen.getByTestId("action-compare"));
    expect(status()).toHaveTextContent(/refused · STUB_NO_FULLTEXT/);

    fireEvent.click(screen.getByTestId("select-work-pz-ledger-structure")); // deselect
    fireEvent.click(screen.getByTestId("select-work-stub-title-only"));
    fireEvent.click(screen.getByTestId("action-analyze"));
    expect(status()).toHaveTextContent(/ok · analyze → kind question/);
    expect(within(screen.getByTestId("results-list")).getAllByRole("listitem")).toHaveLength(2);
  });

  it("the three buttons carry their one-line help", () => {
    renderAt("/tech");
    const actions = screen.getByTestId("bench-actions");
    expect(actions).toHaveTextContent("shared identifiers / citations between selected works.");
    expect(actions).toHaveTextContent("agreement of two bodies.");
    expect(actions).toHaveTextContent("couple models, or open a question if a parent is only a stub.");
  });
});

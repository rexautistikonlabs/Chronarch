/** The example corpus on the workbench, on request: press its chip, select
 *  its programme, and the two stand-ins converge with the pack's assumptions
 *  and its grant. Nothing here runs on a cold load. */
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { loadExamplePackUI } from "../pack-ui";
import { renderAt } from "../render";

describe("example pack on the bench", () => {
  it("two cc-by stand-ins → Converge → an overlap child at 16% with the ledger's assumptions and the grant; a stub → Compare disabled", async () => {
    renderAt("/tech");
    await loadExamplePackUI();
    fireEvent.click(screen.getByTestId("tech-programme-zero.json"));
    expect(screen.getByTestId("tech-programme-zero.json")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByTestId("select-work-pz-ledger-structure"));
    fireEvent.click(screen.getByTestId("select-work-pz-register-structure"));
    fireEvent.click(screen.getByTestId("action-converge"));
    expect(screen.getByTestId("result-status")).toHaveTextContent(/ok · converge · kind overlap · ok/);
    const card = screen.getByTestId("result-card");
    expect(card).toHaveTextContent(/Assumption ledger \(structure only\)/);
    expect(card).toHaveTextContent(/Falsification register \(structure only\)/);
    expect(screen.getByTestId("jaccard")).toHaveTextContent("16%");
    expect(card).toHaveTextContent(/An assumption ledger lists every assumption/);
    expect(screen.getByTestId("note-findings")).toHaveTextContent(/15 tokens are shared/);
    expect(screen.getByTestId("note-findings")).toHaveTextContent(/\[work-pz-ledger-structure, work-pz-register-structure, metric:jaccard\]/);
    expect(screen.getByTestId("note-assumptions")).toHaveTextContent(/assumption-1 · conjectural/);
    expect(screen.getByTestId("note-is-not")).toHaveTextContent(/not an individual score/);
    const json = JSON.parse(screen.getByTestId("result-child").textContent ?? "{}");
    expect(json.child.grants[0].scope).toBe("autistikon-programme-zero");
    expect(within(screen.getByTestId("results-list")).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByTestId("results-list")).toHaveTextContent(/overlap · 16% · note/);
    fireEvent.click(screen.getByTestId("select-work-pz-register-structure")); // deselect
    fireEvent.click(screen.getByTestId("select-work-stub-doi-example")); // tissue-mechanics: in the pack's catalogue, a citation only
    expect(screen.getByTestId("action-compare")).toHaveAttribute("data-code", "STUB_NO_FULLTEXT");
    fireEvent.click(screen.getByTestId("action-compare"));
    expect(screen.getByTestId("result-status")).toHaveTextContent(/ok · converge/); // the earlier result stands
  });
});

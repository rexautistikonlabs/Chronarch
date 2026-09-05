/** The technician room shows the works list, the upload form (model only) and
 *  the refuse codes; the floor shows the starter-works count and its one line. */
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import preload from "../fixtures/works-preload.json";
import { renderAt } from "./render";

const COUNT = (preload as { works: unknown[] }).works.length;

describe("works in the UI", () => {
  it("the floor reads out the starter-works count and says what a tenant adds", () => {
    renderAt("/");
    expect(screen.getByTestId("works-count")).toHaveTextContent(String(COUNT));
    expect(screen.getByTestId("works-line")).toHaveTextContent("A few legal starter works. You add what you have rights to.");
  });

  it("/tech lists the preload works with licence, source and body status, and the refuse codes", () => {
    renderAt("/tech");
    const table = screen.getByTestId("works-table");
    expect(within(table).getAllByRole("row")).toHaveLength(COUNT + 1);
    expect(screen.getByTestId("work-work-stub-doi-example")).toHaveTextContent(/STUB_NO_FULLTEXT/);
    expect(screen.getByTestId("work-work-pz-ledger-structure")).toHaveTextContent(/present/);
    expect(screen.getByTestId("works-refusals")).toHaveTextContent(/FULLTEXT_FORBIDDEN/);
    expect(screen.getByTestId("works-refusals")).toHaveTextContent(/STUB_NO_FULLTEXT/);
  });

  it("the upload form refuses reserved + bytes and a missing licence, and accepts a rights-declared cc-by work into memory", () => {
    renderAt("/tech");
    const title = screen.getByTestId("upload-title");
    const license = screen.getByTestId("upload-license");
    fireEvent.change(title, { target: { value: "A paywalled paper" } });
    fireEvent.change(license, { target: { value: "all-rights-reserved" } });
    fireEvent.click(screen.getByTestId("upload-bytes"));
    fireEvent.click(screen.getByTestId("upload-rights"));
    fireEvent.click(screen.getByTestId("upload-submit"));
    expect(screen.getByTestId("upload-result")).toHaveTextContent(/refused · FULLTEXT_FORBIDDEN/);
    expect(within(screen.getByTestId("works-table")).getAllByRole("row")).toHaveLength(COUNT + 1);

    fireEvent.change(license, { target: { value: "" } });
    fireEvent.click(screen.getByTestId("upload-submit"));
    expect(screen.getByTestId("upload-result")).toHaveTextContent(/refused · LICENSE_MISSING/);

    fireEvent.change(title, { target: { value: "My cc-by preprint" } });
    fireEvent.change(license, { target: { value: "cc-by-4.0" } });
    fireEvent.click(screen.getByTestId("upload-submit"));
    expect(screen.getByTestId("upload-result")).toHaveTextContent(/accepted · work-upload-/);
    expect(within(screen.getByTestId("works-table")).getAllByRole("row")).toHaveLength(COUNT + 2);
    expect(screen.getByTestId("works-table")).toHaveTextContent(/My cc-by preprint/);
  });

  it("the upload form says what may be pasted and refuses 20 001 characters with TEXT_TOO_LONG and no row", () => {
    renderAt("/tech");
    expect(screen.getByTestId("upload-help")).toHaveTextContent("Paste only what you have rights to. Max 20 000 characters.");
    const before = document.querySelectorAll('[data-testid^="select-work-"]').length;
    fireEvent.change(screen.getByTestId("upload-title"), { target: { value: "Far too long" } });
    fireEvent.change(screen.getByTestId("upload-license"), { target: { value: "cc0" } });
    fireEvent.change(screen.getByTestId("upload-text"), { target: { value: "z".repeat(20001) } });
    fireEvent.click(screen.getByTestId("upload-rights"));
    fireEvent.click(screen.getByTestId("upload-submit"));
    expect(screen.getByTestId("upload-result")).toHaveTextContent(/refused · TEXT_TOO_LONG/);
    expect(document.querySelectorAll('[data-testid^="select-work-"]')).toHaveLength(before);
    expect(screen.getByTestId("works-refusals")).toHaveTextContent(/TEXT_TOO_LONG/);
  });
});

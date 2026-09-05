/** The project survives a reload on the same browser and travels as JSON.
 *  Storage and files are untrusted input; the guard is fail-closed. */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import example from "../fixtures/project-example.json";
import { STAND_INS } from "../src/lib/filters";
import { PROJECT_STORAGE_KEY } from "../src/lib/projectStore";
import { renderAt } from "./render";

const visibleIds = () => Array.from(document.querySelectorAll('[data-testid^="select-work-"]')).map((el) => (el.getAttribute("data-testid") ?? "").replace(/^select-/, ""));
const select = (id: string, value: string) => fireEvent.change(screen.getByTestId(id), { target: { value } });
const stored = () => JSON.parse(window.localStorage.getItem(PROJECT_STORAGE_KEY) ?? "null");

function declareNaturalHistoryOptics() {
  select("declare-left", "natural-history");
  select("declare-right", "optics");
  fireEvent.click(screen.getByTestId("declare-amendment"));
  fireEvent.click(screen.getByTestId("declare-bridge"));
}

async function importText(text: string, name = "project.json") {
  const before = screen.queryByTestId("import-status")?.textContent ?? null;
  const file = new File([text], name, { type: "application/json" });
  fireEvent.change(screen.getByTestId("import-file"), { target: { files: [file] } });
  // FileReader is asynchronous: wait for a status that is new, not the previous import's
  await waitFor(() => expect(screen.getByTestId("import-status").textContent).not.toBe(before));
  return screen.getByTestId("import-status");
}

describe("project persistence", () => {
  it("writes rexmetrix.project.v1 after rename, declare, note, upload and clear-bridges; nothing else is stored; no cookie", () => {
    renderAt("/tech");
    expect(screen.getByTestId("saved-line")).toHaveTextContent("Saved in this browser only.");
    expect(stored()).toBeNull(); // nothing is written until the project differs from a fresh one
    fireEvent.change(screen.getByTestId("project-name"), { target: { value: "Kept across reload" } });
    expect(stored().name).toBe("Kept across reload");
    declareNaturalHistoryOptics();
    expect(stored().extra_bridges).toHaveLength(1);
    expect(stored().extra_bridges[0]).toMatchObject({ id: "amend-natural-history-optics", origin: "operator" });
    fireEvent.click(screen.getByTestId("select-work-darwin-1859"));
    fireEvent.click(screen.getByTestId("select-work-newton-opticks"));
    fireEvent.click(screen.getByTestId("action-analyze"));
    expect(stored().notes).toHaveLength(1);
    expect(stored().notes[0].note.is_not).toContain("bridge was operator-declared");
    fireEvent.change(screen.getByTestId("upload-title"), { target: { value: "Session excerpt" } });
    select("upload-license", "cc0");
    select("upload-field", "optics");
    fireEvent.change(screen.getByTestId("upload-text"), { target: { value: "a short body" } });
    fireEvent.click(screen.getByTestId("upload-rights"));
    fireEvent.click(screen.getByTestId("upload-submit"));
    expect(stored().works.some((w: { source: string }) => w.source === "upload")).toBe(true);
    fireEvent.click(screen.getByTestId("clear-extra-bridges"));
    expect(stored().extra_bridges).toEqual([]);
    expect(stored().notes).toHaveLength(1);
    expect(Object.keys(window.localStorage)).toEqual([PROJECT_STORAGE_KEY]);
    expect(document.cookie).toBe("");
  });

  it("reload keeps the declared Darwin–Newton bridge: Analyze still enabled, the note still in the library, the upload still in the table", () => {
    const first = renderAt("/tech");
    fireEvent.change(screen.getByTestId("project-name"), { target: { value: "Survivor" } });
    declareNaturalHistoryOptics();
    fireEvent.click(screen.getByTestId("select-work-darwin-1859"));
    fireEvent.click(screen.getByTestId("select-work-newton-opticks"));
    fireEvent.click(screen.getByTestId("action-analyze"));
    expect(screen.getByTestId("result-status")).toHaveTextContent(/ok · analyze/);
    fireEvent.change(screen.getByTestId("upload-title"), { target: { value: "Session excerpt on lenses" } });
    select("upload-license", "cc0");
    select("upload-field", "optics");
    fireEvent.click(screen.getByTestId("upload-submit"));
    expect(screen.getByTestId("upload-result")).toHaveTextContent(/accepted/);
    first.unmount();

    // the page component mounts again on the same browser
    renderAt("/tech");
    expect(screen.getByTestId("project-name")).toHaveValue("Survivor");
    expect(screen.getByTestId("extra-amend-natural-history-optics")).toBeInTheDocument();
    expect(screen.getByTestId("edge-amend-natural-history-optics")).toHaveAttribute("data-origin", "operator");
    fireEvent.click(screen.getByTestId("select-work-darwin-1859"));
    fireEvent.click(screen.getByTestId("select-work-newton-opticks"));
    expect(screen.getByTestId("action-analyze")).toHaveAttribute("data-enabled", "true");
    const items = within(screen.getByTestId("notes-list")).getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent(/On the Origin of Species.*operator-declared bridge/);
    fireEvent.click(screen.getByTestId("note-open-1"));
    expect(screen.getByTestId("note-is-not")).toHaveTextContent(/bridge was operator-declared/);
    expect(visibleIds()).toHaveLength(13);
    expect(screen.getByText("Session excerpt on lenses")).toBeInTheDocument();
    // the shipped fixture did not change: six shipped edges, the seventh is the amendment
    const edges = Array.from(document.querySelectorAll('[data-testid^="edge-"]'));
    expect(edges.filter((e) => e.getAttribute("data-origin") === "shipped")).toHaveLength(6);
    expect(edges).toHaveLength(7);
  });

  it("corrupt storage is ignored: the page mounts Untitled and does not crash", () => {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, "{");
    renderAt("/tech");
    expect(screen.getByTestId("project-name")).toHaveValue("Untitled project");
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify({ works: [], extra_bridges: [], notes: [] }));
  });

  it("Download project.json: canonical JSON with the extra bridge and a note id after the fixture flow", () => {
    renderAt("/tech");
    declareNaturalHistoryOptics();
    fireEvent.click(screen.getByTestId("select-work-darwin-1859"));
    fireEvent.click(screen.getByTestId("select-work-newton-opticks"));
    fireEvent.click(screen.getByTestId("action-analyze"));
    expect(screen.getByTestId("export-project-json")).toHaveTextContent("Download project.json");
    const json = (screen.getByTestId("project-json") as HTMLTextAreaElement).value;
    const parsed = JSON.parse(json);
    expect(parsed.extra_bridges).toEqual([expect.objectContaining({ id: "amend-natural-history-optics", origin: "operator" })]);
    expect(parsed.notes).toHaveLength(1);
    expect(parsed.notes[0].result.child.id).toMatch(/^child-analyze-\d{3}$/);
    expect(parsed.notes[0].note.appendix.child_id).toBe(parsed.notes[0].result.child.id);
    expect(json).not.toMatch(/function|=>/);
    expect(json.indexOf('"created_at"')).toBeLessThan(json.indexOf('"name"'));
    expect(screen.getByTestId("project-json-preview")).not.toHaveAttribute("open");
  });

  it("import of the fixture project.json restores the name and one extra bridge; Darwin + Newton enables", async () => {
    renderAt("/tech");
    expect(screen.getByTestId("project-name")).toHaveValue("Untitled project");
    const status = await importText(JSON.stringify(example));
    expect(status).toHaveTextContent(/imported “Example project \(fixture\)” · 1 extra bridge · 0 notes/);
    expect(screen.getByTestId("project-name")).toHaveValue("Example project (fixture)");
    expect(screen.getByTestId("extra-amend-natural-history-optics")).toBeInTheDocument();
    expect(screen.getByTestId("project-summary")).toHaveTextContent(/2 works used · 1 extra bridge · 0 notes/);
    fireEvent.click(screen.getByTestId("select-work-darwin-1859"));
    fireEvent.click(screen.getByTestId("select-work-newton-opticks"));
    expect(screen.getByTestId("action-analyze")).toHaveAttribute("data-enabled", "true");
    expect(stored().name).toBe("Example project (fixture)");
    // the imported project is on the project, not in the shipped catalogue
    expect(Array.from(document.querySelectorAll('[data-testid^="edge-"][data-origin="shipped"]'))).toHaveLength(6);
  });

  it('import of "{" is IMPORT_INVALID and leaves the project unchanged; a non-operator bridge is stripped; unlicensed works are skipped with a count', async () => {
    renderAt("/tech");
    fireEvent.change(screen.getByTestId("project-name"), { target: { value: "Before" } });
    declareNaturalHistoryOptics();
    let status = await importText("{", "bad.json");
    expect(status).toHaveTextContent(/IMPORT_INVALID/);
    expect(status).toHaveTextContent(/project unchanged/);
    expect(screen.getByTestId("project-name")).toHaveValue("Before");
    expect(screen.getByTestId("extra-amend-natural-history-optics")).toBeInTheDocument();

    status = await importText(JSON.stringify({ works: [], extra_bridges: [], notes: [] }), "noname.json");
    expect(status).toHaveTextContent(/IMPORT_INVALID — missing name/);
    expect(screen.getByTestId("project-name")).toHaveValue("Before");

    status = await importText(JSON.stringify({
      name: "Stripped",
      works: [{ id: "w1", title: "no licence" }, { id: "w2", title: "still no licence" }, "work-faraday-ere-v1"],
      extra_bridges: [{ id: "bridge-optics-metrology", left: "optics", right: "metrology", status: "live", ledger: [], register: [] }],
      notes: [],
    }));
    expect(status).toHaveTextContent(/imported “Stripped”/);
    expect(status).toHaveTextContent(/2 works skipped/);
    expect(status).toHaveTextContent(/1 bridge stripped \(not operator-declared\)/);
    expect(screen.getByTestId("extra-bridges")).toHaveTextContent("no extra bridges");
    expect(screen.queryByTestId("edge-bridge-optics-metrology")).not.toBeInTheDocument();
    expect(document.querySelectorAll('[data-testid^="edge-"]')).toHaveLength(6);
  });

  it("Clear project needs the confirm checkbox, then wipes memory and the key; filters still show exactly the two stand-ins", () => {
    renderAt("/tech");
    fireEvent.change(screen.getByTestId("project-name"), { target: { value: "Doomed" } });
    declareNaturalHistoryOptics();
    expect(screen.getByTestId("clear-project")).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(screen.getByTestId("clear-project"));
    expect(screen.getByTestId("project-name")).toHaveValue("Doomed");
    fireEvent.click(screen.getByTestId("clear-project-confirm"));
    expect(screen.getByTestId("clear-project")).not.toHaveAttribute("aria-disabled", "true");
    fireEvent.click(screen.getByTestId("clear-project"));
    expect(screen.getByTestId("project-name")).toHaveValue("Untitled project");
    expect(screen.getByTestId("extra-bridges")).toHaveTextContent("no extra bridges");
    // the key is gone and a fresh Untitled project is not written back
    expect(stored()).toBeNull();
    fireEvent.click(screen.getByTestId("filter-autistikon"));
    expect(new Set(visibleIds())).toEqual(new Set(STAND_INS));
    expect(visibleIds()).toHaveLength(2);
  });
});

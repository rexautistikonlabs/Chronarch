/** Persistence and exchange are fail-closed: storage and files are untrusted
 *  input; a bridge that is not operator-declared never becomes shipped. */
import { describe, expect, it } from "vitest";

import example from "../fixtures/project-example.json";
import preload from "../fixtures/works-preload.json";
import { newProject } from "../src/lib/project";
import { clearSavedProject, loadProject, parseProject, PROJECT_STORAGE_KEY, projectJsonFilename, projectToJSON, saveProject } from "../src/lib/projectStore";
import type { WorksFile } from "../src/lib/works";

const PRELOAD = (preload as WorksFile).works;

describe("parseProject", () => {
  it('"{" is IMPORT_INVALID; a missing name is IMPORT_INVALID; a non-object is IMPORT_INVALID', () => {
    expect(parseProject("{", PRELOAD)).toMatchObject({ ok: false, code: "IMPORT_INVALID" });
    expect(parseProject('{"works":[],"extra_bridges":[],"notes":[]}', PRELOAD)).toMatchObject({ ok: false, code: "IMPORT_INVALID", detail: "missing name" });
    expect(parseProject('{"name":"x"}', PRELOAD)).toMatchObject({ ok: false, code: "IMPORT_INVALID" });
    expect(parseProject("[]", PRELOAD)).toMatchObject({ ok: false, code: "IMPORT_INVALID" });
    expect(parseProject('"a string"', PRELOAD)).toMatchObject({ ok: false, code: "IMPORT_INVALID" });
  });

  it("the fixture imports: name, two preload references, one operator bridge, no notes", () => {
    const r = parseProject(JSON.stringify(example), PRELOAD);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error(r.detail);
    expect(r.project.name).toBe("Example project (fixture)");
    expect(r.project.works.map((w) => w.id)).toEqual(["work-darwin-1859", "work-newton-opticks"]);
    expect(r.project.works[0]!.attribution).toMatch(/Project Gutenberg ebook #1228/); // resolved to the shipped row
    expect(r.project.extra_bridges).toHaveLength(1);
    expect(r.project.extra_bridges[0]).toMatchObject({ id: "amend-natural-history-optics", left: "natural-history", right: "optics", origin: "operator", status: "live", ledger: [], register: [] });
    expect(r.project.notes).toEqual([]);
    expect(r.project.created_at).toBe("2026-09-04T00:00:00Z");
    expect(r.stripped_bridges).toBe(0);
    expect(r.skipped_works).toBe(0);
  });

  it("bridges without origin operator are stripped and counted — never applied as shipped", () => {
    const text = JSON.stringify({
      name: "Sneaky",
      works: [],
      notes: [],
      extra_bridges: [
        { id: "bridge-natural-history-optics", left: "natural-history", right: "optics", status: "live", ledger: [{ id: "assumption-1", rating: "supported" }], register: [] },
        { id: "amend-optics-metrology", left: "optics", right: "metrology", origin: "shipped" },
        { id: "amend-x", left: "optics", right: "optics", origin: "operator" },
        { id: "amend-heredity-metrology", left: "heredity", right: "metrology", origin: "operator" },
      ],
    });
    const r = parseProject(text, PRELOAD);
    if (!r.ok) throw new Error(r.detail);
    expect(r.stripped_bridges).toBe(3);
    expect(r.project.extra_bridges.map((b) => b.id)).toEqual(["amend-heredity-metrology"]);
    expect(r.project.extra_bridges[0]!.origin).toBe("operator");
    expect(r.project.extra_bridges[0]!.ledger).toEqual([]); // an amendment carries no ledger even if the file claims one
  });

  it("works outside the preload enter only under the upload law; the rest are skipped and counted", () => {
    const text = JSON.stringify({
      name: "Mixed works",
      extra_bridges: [],
      notes: [],
      works: [
        "work-faraday-ere-v1", // a reference
        { id: "work-upload-7", title: "A licensed session excerpt", license: "cc0", bytes: "present", rights_declared: true, field: "optics", text: "a body", attribution: "me" },
        { id: "work-no-licence", title: "No licence at all", bytes: false },
        { id: "work-cc-by-nc", title: "Full text under a non-allowing licence", license: "cc-by-nc-4.0", bytes: "present", rights_declared: true, text: "a body" },
        { id: "work-faraday-ere-v1" }, // duplicate reference
      ],
    });
    const r = parseProject(text, PRELOAD);
    if (!r.ok) throw new Error(r.detail);
    expect(r.project.works.map((w) => w.id)).toEqual(["work-faraday-ere-v1", "work-upload-7"]);
    expect(r.project.works[1]).toMatchObject({ source: "upload", license: "cc0", bytes: "present", attribution: "me", rights_declared: true });
    expect(r.skipped_works).toBe(3);
  });

  it("malformed notes are dropped and counted; a well-formed note keeps its child id and is re-sequenced", () => {
    const good = { seq: 9, result: { ok: true, action: "analyze", child: { id: "child-analyze-004", kind: "couple", parents: [] }, parents: [], walk: [], bridges: [], metrics: null, question: null }, note: { question: "q", findings: [], is_not: ["not a fitted model"] } };
    const r = parseProject(JSON.stringify({ name: "n", works: [], extra_bridges: [], notes: [good, { seq: 1 }, { result: { ok: false }, note: {} }, "x"] }), PRELOAD);
    if (!r.ok) throw new Error(r.detail);
    expect(r.project.notes).toHaveLength(1);
    expect(r.project.notes[0]!.seq).toBe(1);
    expect(r.project.notes[0]!.result.child.id).toBe("child-analyze-004");
    expect(r.dropped_notes).toBe(3);
  });
});

describe("canonical JSON and storage", () => {
  it("projectToJSON sorts keys, round-trips through parseProject, and names the file from the project", () => {
    const p = { ...newProject(3), name: "Round trip" };
    const json = projectToJSON(p);
    expect(json.indexOf('"created_at"')).toBeLessThan(json.indexOf('"extra_bridges"'));
    expect(json.indexOf('"extra_bridges"')).toBeLessThan(json.indexOf('"name"'));
    expect(json).not.toMatch(/function/);
    const back = parseProject(json, PRELOAD);
    if (!back.ok) throw new Error(back.detail);
    expect(back.project).toEqual(p);
    expect(projectJsonFilename(p)).toBe("chronarch-project-round-trip.json");
  });

  it("saveProject writes the one key; loadProject reads it back; corrupt storage → null (start Untitled); clear removes it", () => {
    const p = { ...newProject(5), name: "Kept" };
    expect(saveProject(p)).toBe(true);
    expect(Object.keys(window.localStorage)).toEqual([PROJECT_STORAGE_KEY]);
    expect(loadProject(PRELOAD)).toEqual(p);
    window.localStorage.setItem(PROJECT_STORAGE_KEY, "{not json");
    expect(loadProject(PRELOAD)).toBeNull();
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify({ works: [], extra_bridges: [], notes: [] }));
    expect(loadProject(PRELOAD)).toBeNull();
    clearSavedProject();
    expect(window.localStorage.getItem(PROJECT_STORAGE_KEY)).toBeNull();
    expect(loadProject(PRELOAD)).toBeNull();
    expect(document.cookie).toBe("");
  });
});

/** The Project module: amendments live on the project only; the pack is text
 *  built in code; the shipped catalogue never gains an edge. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import classics from "../fixtures/programme-classics.json";
import example from "../fixtures/project-example.json";
import toy from "../fixtures/programme-toy.json";
import zero from "../fixtures/programme-zero.json";
import preload from "../fixtures/works-preload.json";
import { buildNote, IS_NOT_OPERATOR_BRIDGE } from "../src/lib/analysisNote";
import { availability, runAction } from "../src/lib/bench";
import { catalogueOf, type ProgrammeFile } from "../src/lib/programme";
import { declareBridge, isOperatorBridge, newProject, operatorBridgeIds, PACK_CLOSING, packFilename, projectToMarkdown, withExtraBridges, withNote, withUpload } from "../src/lib/project";
import { worksMap, type Work, type WorksFile } from "../src/lib/works";

const FILES = [zero as ProgrammeFile, toy as ProgrammeFile, classics as ProgrammeFile];
const shipped = catalogueOf(FILES);
const map = worksMap((preload as WorksFile).works);
const pick = (...ids: string[]) => ids.map((id) => map.get(id)!);

describe("project", () => {
  it("a new project has the default name, no works, no bridges, no notes, and a counter for created_at (no clock)", () => {
    const p = newProject(1);
    expect(p.name).toBe("Untitled project");
    expect(p.works).toEqual([]);
    expect(p.extra_bridges).toEqual([]);
    expect(p.notes).toEqual([]);
    expect(p.created_at).toBe("tick:1");
    expect(p.programme_ids).toEqual(["programme-zero", "programme-classics"]);
    // the fixture carries the ISO form
    expect(example.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(example.schema).toBe("rexmetrix.project/1");
  });

  it("declareBridge refuses without the amendment tick, a self-edge, an unknown field, a shipped pair, a duplicate; accepts natural-history — optics as origin operator", () => {
    const p = newProject(1);
    expect(declareBridge(p, shipped, "natural-history", "optics", false)).toMatchObject({ ok: false });
    expect(declareBridge(p, shipped, "optics", "optics", true)).toMatchObject({ ok: false });
    expect(declareBridge(p, shipped, "optics", "phrenology", true)).toMatchObject({ ok: false });
    expect(declareBridge(p, shipped, "heredity", "natural-history", true)).toMatchObject({ ok: false, reason: expect.stringContaining("bridge-natural-history-heredity") });
    const r = declareBridge(p, shipped, "natural-history", "optics", true);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error(r.reason);
    expect(r.bridge.origin).toBe("operator");
    expect(r.bridge.status).toBe("live");
    expect(r.bridge.ledger).toEqual([]);
    expect(r.bridge.register).toEqual([]);
    expect(isOperatorBridge(r.bridge)).toBe(true);
    const p2 = { ...p, extra_bridges: [r.bridge] };
    expect(declareBridge(p2, shipped, "optics", "natural-history", true)).toMatchObject({ ok: false, reason: expect.stringContaining("already declared") });
  });

  it("the overlay catalogue carries the amendment; the shipped catalogue and programme-classics.json do not", () => {
    const p = newProject(1);
    const r = declareBridge(p, shipped, "natural-history", "optics", true);
    if (!r.ok) throw new Error(r.reason);
    const cat = withExtraBridges(shipped, [r.bridge]);
    expect(cat.bridges.has(r.bridge.id)).toBe(true);
    expect(shipped.bridges.has(r.bridge.id)).toBe(false);
    expect(cat.fields).toBe(shipped.fields);
    const joins = (b: { left: string; right: string }) => new Set([b.left, b.right]).has("optics") && new Set([b.left, b.right]).has("natural-history");
    expect((classics as ProgrammeFile).bridges.some(joins)).toBe(false);
    const onDisk = JSON.parse(readFileSync(join(__dirname, "..", "fixtures", "programme-classics.json"), "utf8")) as ProgrammeFile;
    expect(onDisk.bridges.some(joins)).toBe(false);
    expect(onDisk.bridges.some((b) => "origin" in b)).toBe(false);
    expect(onDisk.bridges).toHaveLength(3);
  });

  it("Darwin + Newton: analyze refuses NO_BRIDGE on the shipped catalogue and passes over the amendment; the note says the bridge was operator-declared with no assumptions", () => {
    const sel = pick("work-darwin-1859", "work-newton-opticks");
    const before = availability(sel, shipped, FILES, map).find((a) => a.action === "analyze")!;
    expect(before).toMatchObject({ enabled: false, code: "NO_BRIDGE", missing: ["natural-history", "optics"] });
    const p = newProject(1);
    const d = declareBridge(p, shipped, "natural-history", "optics", true);
    if (!d.ok) throw new Error(d.reason);
    const proj = { ...p, extra_bridges: [d.bridge] };
    const cat = withExtraBridges(shipped, proj.extra_bridges);
    const after = availability(sel, cat, FILES, map).find((a) => a.action === "analyze")!;
    expect(after.enabled).toBe(true);
    const r = runAction("analyze", sel, cat, FILES, map);
    if (!r.ok) throw new Error(r.code);
    expect(r.child.path).toEqual([d.bridge.id]);
    const note = buildNote(r, map, FILES, operatorBridgeIds(proj));
    expect(note.is_not).toContain(IS_NOT_OPERATOR_BRIDGE);
    expect(note.is_not).toContain("not an individual score");
    expect(note.assumptions_used).toEqual([]);
    // the same result without the operator set is the plain note — the flag comes from the project, not from guessing
    expect(buildNote(r, map, FILES).is_not).not.toContain(IS_NOT_OPERATOR_BRIDGE);
  });

  it("withNote records the parents once each; withUpload appends a session work; the pack carries name, works table with URLs and attributions, extra bridges, notes in full, and the closing", () => {
    let p = newProject(1);
    const d = declareBridge(p, shipped, "natural-history", "optics", true);
    if (!d.ok) throw new Error(d.reason);
    p = { ...p, name: "Bench trial", extra_bridges: [d.bridge] };
    const cat = withExtraBridges(shipped, p.extra_bridges);
    const fm = runAction("analyze", pick("work-faraday-ere-v1", "work-maxwell-elem"), cat, FILES, map);
    const dn = runAction("analyze", pick("work-darwin-1859", "work-newton-opticks"), cat, FILES, map);
    if (!fm.ok || !dn.ok) throw new Error("expected ok");
    p = withNote(p, fm, buildNote(fm, map, FILES, operatorBridgeIds(p)), map);
    p = withNote(p, dn, buildNote(dn, map, FILES, operatorBridgeIds(p)), map);
    p = withNote(p, fm, buildNote(fm, map, FILES, operatorBridgeIds(p)), map); // Faraday and Maxwell already listed
    expect(p.works.map((w) => w.id)).toEqual(["work-faraday-ere-v1", "work-maxwell-elem", "work-darwin-1859", "work-newton-opticks"]);
    expect(p.notes.map((n) => n.seq)).toEqual([1, 2, 3]);
    const up: Work = { id: "work-upload-1", title: "My uploaded excerpt", license: "cc0", oa: true, source: "upload", bytes: "present", field: "optics", text: "a short body" };
    p = withUpload(withUpload(p, up), up);
    expect(p.works.filter((w) => w.id === up.id)).toHaveLength(1);

    const md = projectToMarkdown(p);
    expect(md.startsWith("# Bench trial\n")).toBe(true);
    expect(md).toContain("| work-darwin-1859 |");
    expect(md).toContain("https://www.gutenberg.org/ebooks/1228");
    expect(md).toContain("Project Gutenberg ebook #1228");
    expect(md).toContain("Experimental Researches in Electricity, Vol. 1");
    expect(md).toContain("My uploaded excerpt");
    expect(md).toContain("natural-history — optics · operator-declared");
    expect(md).toContain("### Note 1");
    expect(md).toContain("### Note 3");
    expect(md).toContain("bridge was operator-declared");
    expect((md.match(/^## 1\. Question$/gm) ?? []).length).toBe(3);
    for (const c of PACK_CLOSING) expect(md).toContain(`- ${c}`);
    expect(md).toContain("not Foundation-endorsed");
    expect(md).toContain("not a public chain");
    expect(packFilename(p)).toBe("chronarch-pack-bench-trial.md");
  });

  it("an empty project still packs, honestly", () => {
    const md = projectToMarkdown(newProject(2));
    expect(md).toContain("# Untitled project");
    expect(md).toContain("none yet");
    expect(md).toContain("none — every path in this pack runs over shipped, declared bridges");
    expect(md).toContain("- not peer review");
  });
});

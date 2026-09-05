/** The live-site holes: /workbench and /tech reach the bench; the first run
 *  never requires the Autistikon corpus; robots and sitemap are real files;
 *  Laterion has a one-line drawer and no door; About leads with the tool;
 *  the well's chips put Classics and Toy before Programme Zero. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BuildingKey } from "../src/campus/campusLayout";
import { STAND_INS } from "../src/lib/filters";
import { FIRST_RUN_STEPS } from "../src/lib/firstRun";
import { PROGRAMME_CHIPS } from "../src/lib/human";
import { renderAt } from "./render";

vi.mock("../src/campus/Campus", () => ({
  webglAvailable: () => true,
  Campus: ({ onPick }: { onPick: (k: BuildingKey) => void }) => (
    <div data-testid="campus-viewport">
      <canvas data-testid="campus-canvas" />
      <button type="button" data-testid="sign-laterion" onClick={() => onPick("laterion")}>LATERION · FORTHCOMING · NOT A DIAGNOSTIC</button>
    </div>
  ),
}));

const ROOT = join(__dirname, "..");

describe("routes", () => {
  it("/workbench and /tech render the workbench, not the 404", () => {
    for (const path of ["/workbench", "/tech"]) {
      const r = renderAt(path);
      expect(screen.getByTestId("tech-bench")).toBeInTheDocument();
      expect(document.querySelector("main h1")?.textContent).toBe("One room for the operator.");
      expect(document.body.textContent).not.toMatch(/No such page/);
      expect(document.querySelectorAll("canvas")).toHaveLength(0);
      r.unmount();
    }
    renderAt("/");
    expect(screen.getByTestId("landing-to-tech")).toHaveAttribute("href", "/chronarch/tech");
  });

  it("the static host has matching redirect lines before the SPA fallback", () => {
    const lines = readFileSync(join(ROOT, "public", "_redirects"), "utf8").trim().split("\n").map((l) => l.trim().split(/\s+/));
    expect(lines[0]).toEqual(["/workbench", "/chronarch/tech", "301"]);
    expect(lines[1]).toEqual(["/tech", "/chronarch/tech", "301"]);
    expect(lines[lines.length - 1]).toEqual(["/*", "/index.html", "200"]);
  });
});

describe("first run", () => {
  it("no step requires the Autistikon corpus: every step is Classics or the pack, and no stand-in id is a required parent", () => {
    const copy = FIRST_RUN_STEPS.map((s) => s.text).join("\n");
    expect(copy).not.toMatch(/Autistikon|Programme Zero|stand-in/i);
    for (const s of FIRST_RUN_STEPS) expect(s.filter === "classics" || s.filter === null).toBe(true);
    const src = readFileSync(join(ROOT, "src", "lib", "firstRun.ts"), "utf8");
    for (const id of STAND_INS) expect(src).not.toContain(id);
    expect(src).not.toMatch(/STAND_INS|autistikon/);
  });

  it("a cold workbench has Classics selected and the Autistikon chip unselected", () => {
    renderAt("/chronarch/tech");
    expect(screen.getByTestId("tech-programme-classics.json")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("filter-autistikon")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("filter-autistikon")).toHaveTextContent(/example corpus — not the product/);
  });
});

describe("static host files", () => {
  it("robots.txt is real text that starts with User-agent and names the sitemap", () => {
    const robots = readFileSync(join(ROOT, "public", "robots.txt"), "utf8");
    expect(robots.startsWith("User-agent: *")).toBe(true);
    expect(robots).toContain("Allow: /");
    expect(robots).toContain("Sitemap: https://rexmetrix.com/sitemap.xml");
    expect(robots).not.toMatch(/<html|<!doctype/i);
  });

  it("sitemap.xml is real XML listing exactly /, /chronarch, /chronarch/tech and /chronarch/about", () => {
    const xml = readFileSync(join(ROOT, "public", "sitemap.xml"), "utf8");
    expect(xml.startsWith("<?xml")).toBe(true);
    const locs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
    expect(locs).toEqual(["https://rexmetrix.com/", "https://rexmetrix.com/chronarch", "https://rexmetrix.com/chronarch/tech", "https://rexmetrix.com/chronarch/about"]);
    expect(xml).not.toMatch(/workbench/);
    expect(xml).not.toMatch(/<html/i);
  });
});

describe("Laterion", () => {
  it("clicking the mesh opens a one-line drawer with no href; the chapter still has no door", () => {
    renderAt("/");
    expect(screen.queryByTestId("laterion-drawer")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("sign-laterion"));
    const drawer = screen.getByTestId("laterion-drawer");
    expect(drawer).toHaveTextContent("Not shipping. Not a diagnostic. Not a person-score.");
    expect(drawer.querySelectorAll("a")).toHaveLength(0);
    expect(screen.getByTestId("chapter-laterion").querySelectorAll("a")).toHaveLength(0);
    for (const a of Array.from(document.querySelectorAll("a"))) expect(a.getAttribute("href") ?? "").not.toMatch(/laterion/i);
    fireEvent.click(screen.getByTestId("laterion-drawer-close"));
    expect(screen.queryByTestId("laterion-drawer")).not.toBeInTheDocument();
  });
});

describe("About and the well chips", () => {
  it("About leads with the tool; starter corpora are public-domain / CC / us-government; Programme Zero is one short example-corpus paragraph, not the longest section", () => {
    renderAt("/chronarch/about");
    const panel = screen.getByTestId("about-panel");
    const lede = panel.querySelector("header p:nth-of-type(2)")?.textContent ?? panel.textContent ?? "";
    expect(lede).toMatch(/declare the fields/);
    expect(lede).toMatch(/pin the sources/);
    expect(lede).toMatch(/names its parents/);
    const sections = Array.from(panel.querySelectorAll("section"));
    const titles = sections.map((s) => s.querySelector("h2")?.textContent ?? "");
    expect(titles[0]).toBe("what you get");
    expect(titles[1]).toBe("starter corpora");
    expect(titles[2]).toBe("example corpus — programme zero");
    expect(sections[1]).toHaveTextContent(/public-domain, Creative Commons or US-government/);
    const zero = sections[2]!.textContent?.length ?? 0;
    const tool = sections[0]!.textContent?.length ?? 0;
    expect(zero).toBeLessThan(tool);
    expect(sections[2]!.querySelectorAll("p")).toHaveLength(1);
    expect(panel).not.toHaveTextContent(/the first filled template/);
    expect(panel).toHaveTextContent(/example template/);
  });

  it("well chips: Classics and Toy before Programme Zero, whose label is an example template", () => {
    expect(PROGRAMME_CHIPS.map((c) => c.fixture)).toEqual(["programme-classics.json", "programme-toy.json", "programme-zero.json"]);
    expect(PROGRAMME_CHIPS[2]!.blurb).toMatch(/example template/);
    expect(PROGRAMME_CHIPS[2]!.blurb).not.toMatch(/first filled/);
    renderAt("/chronarch");
    const chips = within(screen.getByTestId("programme-chips")).getAllByRole("button").map((b) => b.getAttribute("data-testid"));
    expect(chips).toEqual(["chip-programme-classics.json", "chip-programme-toy.json", "chip-programme-zero.json"]);
  });
});

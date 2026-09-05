/** The RexMetrix landing: the company and a short catalogue of its products.
 *  With motion allowed and WebGL present, / is the campus — one canvas, drawn
 *  on demand, three buildings you approach or click, a docked HTML panel in
 *  the app's own chrome. Under prefers-reduced-motion, or without WebGL, the
 *  campus is not mounted and the same catalogue stands as three cards.
 *  Chronarch is the one product that runs here; the other two are one-sentence
 *  placeholders with no code behind them. This page never imports the
 *  Chronarch well. No model, no network. Every sentence obeys the visitor
 *  bans (specs/LEGAL.md). */
import { useMemo, useState } from "react";
import { Button } from "react-aria-components";
import { Link } from "react-router-dom";

import { Campus, webglAvailable } from "../campus/Campus";
import { BUILDINGS, SIGN_LINES, type BuildingKey } from "../campus/campusLayout";
import { HONESTY_LANDING } from "../components/StatusBanner";
import { usePrefersReducedMotion } from "../lib/motion";

export interface CatalogueEntry {
  key: BuildingKey;
  name: string;
  status: "running here" | "placeholder";
  line: string;
  isNot: string[];
  links: { to: string; label: string }[];
}

export const CATALOGUE: readonly CatalogueEntry[] = [
  {
    key: "chronarch",
    name: "Chronarch",
    status: "running here",
    line: "Research software for hypothesis-led programmes: an array of fields, the bridges a group declares between them, programmes as subgraphs, and syntheses that name their parents. This lab: the programme well, the technician's workbench, one project you can take home.",
    isNot: ["not a public chain", "not Foundation-endorsed", "not a diagnostic"],
    links: [
      { to: "/chronarch", label: "Programme well" },
      { to: "/chronarch/tech", label: "Workbench" },
      { to: "/chronarch/about", label: "About Chronarch" },
    ],
  },
  {
    key: "continuum",
    name: "Continuum",
    status: "placeholder",
    line: "A planned instrument for reading a programme's ledger and register over time; nothing is built and nothing more is claimed here.",
    isNot: ["not built", "not an engine shared with Chronarch"],
    links: [],
  },
  {
    key: "face-mapping",
    name: "Face mapping",
    status: "placeholder",
    line: "A planned instrument for describing landmark geometry in consented images as measurements a study can cite; nothing is built here and no image is read.",
    isNot: ["not a diagnostic", "not a person-score", "not an assessment of anyone"],
    links: [],
  },
];

export const RULES: readonly string[] = [
  "RexMetrix is the company. Chronarch is one of its products; the two names are not the same thing.",
  "Each product page says the same of itself: not Foundation-endorsed. No page will say otherwise.",
  "Chronarch is research software. It is not a public chain, not a coin, not a diagnostic.",
  "Face mapping, when it exists, describes geometry in consented images. It will not score, rank or assess anyone.",
  "Each product keeps its own engine and its own refusals; nothing here is one engine wearing three names.",
];

const FOOTER = "Static site. It spawns no process, opens no socket, reads no filesystem, calls no model. Domain reserved for the RexMetrix landing: rexmetrix.com. This page makes no claim about that domain's DNS.";

function HonestyStrip() {
  return (
    <div className="hud-strip flex flex-wrap items-baseline gap-x-5 gap-y-1 px-6 py-1.5 text-[11px]" data-testid="landing-honesty">
      <span className="hud-label">status</span>
      <span className="text-mute">{HONESTY_LANDING}</span>
    </div>
  );
}

function TitleRow() {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        <p className="readout text-[11px] uppercase tracking-wider text-dim">a product house</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight" data-testid="landing-title">RexMetrix</h1>
        <p className="mt-2 text-sm leading-relaxed text-mute" data-testid="landing-lede">RexMetrix builds research instruments and says on every page what each one is not. One runs here today — Chronarch. Two are named as placeholders, one sentence each, so no one mistakes a plan for a product.</p>
      </div>
      <nav aria-label="Products" className="flex items-center gap-2" data-testid="landing-nav">
        <Link to="/chronarch" className="hud-button" data-testid="landing-to-chronarch">Open Chronarch</Link>
        <Link to="/chronarch/tech" className="hud-button" data-testid="landing-to-tech">Workbench</Link>
      </nav>
    </header>
  );
}

/** The catalogue as three cards: the reduced-motion and no-WebGL landing, and the panel's source of copy. */
export function CatalogueCards({ reason }: { reason: "reduced-motion" | "no-webgl" }) {
  return (
    <div data-testid="campus-fallback" data-reason={reason}>
      <section className="mt-10">
        <h2 className="readout text-[11px] uppercase tracking-wider text-dim">catalogue{reason === "reduced-motion" ? " · motion off: the campus is not drawn" : ""}</h2>
        <ul className="mt-3 grid gap-4 md:grid-cols-3" data-testid="catalogue">
          {CATALOGUE.map((c) => (
            <li key={c.key} className={`border hair p-4 ${c.status === "running here" ? "bg-ink" : ""}`} data-testid={`product-${c.key}`} data-status={c.status}>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-lg font-semibold text-ivory">{c.name}</h3>
                <span className={`readout text-[10px] uppercase tracking-wider ${c.status === "running here" ? "text-verdigris" : "text-dim"}`}>{c.status}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-mute">{c.line}</p>
              <p className="readout mt-3 text-[11px] text-dim" data-testid={`is-not-${c.key}`}>{c.isNot.join(" · ")}</p>
              {c.links.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.links.map((l) => <Link key={l.to} to={l.to} className="hud-button" data-testid={`link-${c.key}-${l.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{l.label}</Link>)}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-10 max-w-3xl text-sm leading-relaxed text-mute" data-testid="landing-rules">
        <h2 className="readout text-[11px] uppercase tracking-wider text-dim">how RexMetrix talks about its products</h2>
        <ul className="mt-2 space-y-1">{RULES.map((r) => <li key={r}>{r}</li>)}</ul>
      </section>
    </div>
  );
}

/** The docked panel beside the campus: the selected building, or the rules. */
function CampusPanel({ selected, onSelect }: { selected: BuildingKey | null; onSelect: (k: BuildingKey | null) => void }) {
  const entry = selected ? CATALOGUE.find((c) => c.key === selected)! : null;
  const building = selected ? BUILDINGS.find((b) => b.key === selected)! : null;
  return (
    <div className="hud-card pointer-events-auto w-full max-w-xl" data-testid="campus-panel" data-selected={selected ?? ""}>
      {entry && building ? (
        <>
          <div className="flex items-baseline justify-between gap-4">
            <p className="hud-label">{SIGN_LINES[building.key]}</p>
            <Button onPress={() => onSelect(null)} className="readout text-[11px] text-dim hover:text-ivory" aria-label="Close panel">close</Button>
          </div>
          <h2 className="mt-1 text-base font-semibold text-ivory">{entry.name} <span className="readout text-[10px] uppercase tracking-wider text-dim">· {entry.status}</span></h2>
          <p className="mt-2 text-[13px] leading-relaxed text-mute">{entry.line}</p>
          <p className="readout mt-2 text-[11px] text-dim" data-testid={`is-not-${entry.key}`}>{entry.isNot.join(" · ")}</p>
          {building.route ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to={building.route} className="hud-button" data-testid="enter-chronarch">Enter Chronarch</Link>
              {entry.links.slice(1).map((l) => <Link key={l.to} to={l.to} className="hud-button" data-testid={`link-${entry.key}-${l.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{l.label}</Link>)}
            </div>
          ) : (
            <p className="mt-3 text-[11px] text-dim" data-testid="no-door">A card, not a door: this building has no route and no engine behind it.</p>
          )}
        </>
      ) : (
        <>
          <p className="hud-label">campus</p>
          <p className="mt-2 text-[13px] leading-relaxed text-mute">Three buildings on one plate. Approach one — drag to orbit, wheel to zoom — or click it, or use the plates below. Nothing here moves on its own.</p>
          <ul className="mt-2 space-y-0.5 text-[12px] text-mute" data-testid="campus-catalogue">
            {CATALOGUE.map((c) => (
              <li key={c.key}><span className="text-ivory">{c.name}</span> <span className="readout text-[10px] uppercase tracking-wider text-dim">· {c.status}</span> <span className="readout text-[11px] text-dim">· {c.isNot.join(" · ")}</span></li>
            ))}
          </ul>
          <ul className="mt-2 space-y-1 text-[12px] text-mute" data-testid="landing-rules">{RULES.map((r) => <li key={r}>{r}</li>)}</ul>
        </>
      )}
    </div>
  );
}

export function Landing() {
  const reduced = usePrefersReducedMotion();
  const webgl = useMemo(() => webglAvailable(), []);
  const [selected, setSelected] = useState<BuildingKey | null>(null);
  const campus = !reduced && webgl;

  if (!campus) {
    return (
      <div data-testid="landing-body" data-mode={reduced ? "reduced-motion" : "no-webgl"}>
        <div className="-mx-6"><HonestyStrip /></div>
        <div className="mt-6"><TitleRow /></div>
        <CatalogueCards reason={reduced ? "reduced-motion" : "no-webgl"} />
        <footer className="mt-12 border-t hair pt-4 text-[11px] text-dim" data-testid="landing-footer"><p>{FOOTER}</p></footer>
      </div>
    );
  }

  return (
    <div data-testid="landing-body" data-mode="campus">
      <Campus selected={selected} onSelect={setSelected} />
      <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between">
        <div className="pointer-events-auto">
          <HonestyStrip />
          <div className="px-6 pt-4"><TitleRow /></div>
        </div>
        <div className="flex flex-col gap-3 px-6 pb-4">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2" data-testid="campus-legend">
            <span className="hud-label">plates</span>
            {BUILDINGS.map((b) => (
              <Button key={b.key} onPress={() => setSelected(selected === b.key ? null : b.key)} className={`hud-chip ${selected === b.key ? "hud-chip-on" : ""}`} aria-pressed={selected === b.key} data-testid={`plate-${b.key}`}>{SIGN_LINES[b.key]}</Button>
            ))}
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <CampusPanel selected={selected} onSelect={setSelected} />
            <footer className="pointer-events-auto max-w-sm text-[11px] text-dim" data-testid="landing-footer"><p>{FOOTER}</p></footer>
          </div>
        </div>
      </div>
    </div>
  );
}

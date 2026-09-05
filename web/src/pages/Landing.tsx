/** The RexMetrix landing: the company and a short catalogue of its products.
 *  Chronarch is the one that runs here; the other two are one-sentence
 *  placeholders with no code behind them. Flat HTML, no well, no model, no
 *  network. Every sentence obeys the visitor bans (specs/LEGAL.md). */
import { Link } from "react-router-dom";

import { HONESTY_LANDING } from "../components/StatusBanner";

export interface CatalogueEntry {
  key: "chronarch" | "continuum" | "face-mapping";
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

export function Landing() {
  return (
    <div>
      <div className="hud-strip -mx-6 flex flex-wrap items-baseline gap-x-5 gap-y-1 px-6 py-1.5 text-[11px]" data-testid="landing-honesty">
        <span className="hud-label">status</span>
        <span className="text-mute">{HONESTY_LANDING}</span>
      </div>
      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="readout text-[11px] uppercase tracking-wider text-dim">a product house</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight" data-testid="landing-title">RexMetrix</h1>
          <p className="mt-2 text-sm leading-relaxed text-mute" data-testid="landing-lede">RexMetrix builds research instruments and says on every page what each one is not. One runs here today — Chronarch. Two are named below as placeholders, one sentence each, so no one mistakes a plan for a product.</p>
        </div>
        <nav aria-label="Products" className="flex items-center gap-2" data-testid="landing-nav">
          <Link to="/chronarch" className="hud-button" data-testid="landing-to-chronarch">Open Chronarch</Link>
          <Link to="/chronarch/tech" className="hud-button" data-testid="landing-to-tech">Workbench</Link>
        </nav>
      </header>

      <section className="mt-10">
        <h2 className="readout text-[11px] uppercase tracking-wider text-dim">catalogue</h2>
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
        <ul className="mt-2 space-y-1">
          <li>RexMetrix is the company. Chronarch is one of its products; the two names are not the same thing.</li>
          <li>Each product page says the same of itself: not Foundation-endorsed. No page will say otherwise.</li>
          <li>Chronarch is research software. It is not a public chain, not a coin, not a diagnostic.</li>
          <li>Face mapping, when it exists, describes geometry in consented images. It will not score, rank or assess anyone.</li>
          <li>Each product keeps its own engine and its own refusals; nothing here is one engine wearing three names.</li>
        </ul>
      </section>

      <footer className="mt-12 border-t hair pt-4 text-[11px] text-dim" data-testid="landing-footer">
        <p>Static site. It spawns no process, opens no socket, reads no filesystem, calls no model. Domain reserved for the RexMetrix landing: rexmetrix.com. This page makes no claim about that domain's DNS.</p>
      </footer>
    </div>
  );
}

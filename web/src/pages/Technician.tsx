import { useState } from "react";
import { Button, Label, TextArea, TextField } from "react-aria-components";
import { Link } from "react-router-dom";

import type { AnalysisNote } from "../lib/analysisNote";
import type { BenchResult } from "../lib/bench";
import { BenchActions } from "../components/BenchActions";
import { ExportPanel } from "../components/ExportPanel";
import { FieldGraph } from "../components/FieldGraph";
import { NotesLibrary } from "../components/NotesLibrary";
import { PackPanel } from "../components/PackPanel";
import { ProjectPanel } from "../components/ProjectPanel";
import { ResultCard } from "../components/ResultCard";
import { ErrorBoundary } from "../components/ErrorBoundary";
import JsonViewer from "../components/JsonViewer";
import { Legend } from "../components/Legend";
import { MotionBadge } from "../components/MotionBadge";
import { PageHeader, Section } from "../components/Page";
import { Readout } from "../components/Readout";
import { SessionMeta } from "../components/SessionMeta";
import { StatBar } from "../components/StatBar";
import { WorksPanel } from "../components/WorksPanel";
import { fmtChronons } from "../lib/format";
import { GYM_CASES } from "../lib/gym";
import { applyFilter, FILTERS, type FilterKey } from "../lib/filters";
import { PROGRAMME_CHIPS } from "../lib/human";
import { percent } from "../lib/metrics";
import { bridgePath } from "../lib/bench";
import { useProgramme, type ProgrammeName } from "../state/ProgrammeContext";
import { FIXTURES, useSession, type FixtureName } from "../state/SessionContext";

const REFUSE_CODES: readonly [string, string][] = [
  ["NEED_PARENTS", "select at least two works; a child needs parents"],
  ["NO_BRIDGE", "a synthesis across fields needs a declared path or clique of live bridges; a missing edge refuses (parents in one field need none)"],
  ["LICENSE_MISSING", "a licensed field with no grant, or a work with no licence"],
  ["INDIVIDUAL_SCORE_FORBIDDEN", "no person-level score, index or assessment, on any field"],
  ["CROSS_SECTOR_WRITE", "a child never writes into another sector's field"],
  ["FULLTEXT_FORBIDDEN", "full text claimed under a licence that does not allow it"],
  ["STUB_NO_FULLTEXT", "a citation, not a body: overlap, match and couple refuse it; a question may cite it"],
  ["RIGHTS_UNDECLARED", "full text claimed without the rights declaration"],
  ["BAD_KIND", "a job kind outside overlap | match | couple | question"],
  ["UNKNOWN_FIELD", "a parent names a field not in the catalogue"],
  ["UNKNOWN_WORK", "a parent cites a work not in the works catalogue"],
];

const EXAMPLE = `{"ok": true, "result": {"identity": "chronarch-pulse", "height": 3, "head_hash": "<64 hex>", "ring_count": 4, "scar_count": 0, "pins_ok": true, "i3": null, "credits_by_reason": {"space": 1}}}`;

/** The technician room — RexMetrix's one operator route. Sections in order:
 *  works, programmes/fixtures, paste JSON, hashes, refuse codes, and a closed
 *  <details> with the substrate instrument's readouts (internal code name
 *  Chronarch — not the product). Not the default landing. */
export function Technician() {
  const { session, error, loadFixture, loadText } = useSession();
  const { programmeName, loadProgramme, works, catalogue, results } = useProgramme();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [filter, setFilter] = useState<FilterKey>("all");
  const [fieldFilter, setFieldFilter] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{ r: BenchResult; n: AnalysisNote | null } | null>(null);
  const visible = applyFilter(works, filter, fieldFilter);
  const chosen = works.filter((w) => selected.has(w.id));
  // the first consecutive pair of selected fields with no declared live path
  const missing = (() => {
    const fields = chosen.map((w) => w.field).filter((f): f is string => !!f);
    for (let i = 0; i < fields.length - 1; i++) if (fields[i] !== fields[i + 1] && bridgePath(catalogue, fields[i]!, fields[i + 1]!) === null) return [fields[i]!, fields[i + 1]!] as [string, string];
    return null;
  })();
  const toggle = (id: string) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const [text, setText] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const s = session.state;
  const c = s.credits_by_reason;

  const apply = () => {
    const ok = loadText(text);
    setApplied(ok ? "applied" : "refused");
  };

  return (
    <div>
      <PageHeader eyebrow="rexmetrix · technician · workbench" title="One room for the operator." lede={<>Filters, the field–bridge graph, the project and its session bridges, the works and their licences, a selection, three actions that enable only when the bench law would pass, the note, the notes library, and the export — a note or the whole project as one pack. HTML only — no well on this route. The workbench calls no model, fetches nothing, adds no bridge on its own, and refuses anything that is not a well-formed input.</>} />

      <Section title="filters">
        <div className="flex flex-wrap items-center gap-2" data-testid="filters">
          {FILTERS.map((f) => (
            <Button key={f.key} onPress={() => setFilter(f.key)} aria-pressed={filter === f.key} className={`readout border hair px-2.5 py-1 text-xs ${filter === f.key ? "bg-panel text-ivory" : "text-mute hover:text-ivory"}`} data-testid={`filter-${f.key}`}>
              {f.label} <span className="text-dim">· {applyFilter(works, f.key, null).length}</span>
            </Button>
          ))}
          {fieldFilter && (
            <Button onPress={() => setFieldFilter(null)} className="readout border hair px-2.5 py-1 text-xs text-ivory" data-testid="clear-field-filter">field: {fieldFilter} ×</Button>
          )}
          <span className="readout text-[11px] text-dim">All = every preload + this session's uploads · Autistikon = the Programme Zero stand-ins · Classics = the six public-domain fields</span>
        </div>
      </Section>

      <Section title="field–bridge graph">
        <FieldGraph cat={catalogue} highlighted={new Set(chosen.map((w) => w.field ?? ""))} missing={missing} activeField={fieldFilter} onPickField={setFieldFilter} />
      </Section>

      <Section title="project · name and session bridges">
        <ProjectPanel />
      </Section>

      <Section title="works · only legal works enter">
        <WorksPanel selected={selected} onToggle={toggle} visible={visible} />
      </Section>

      <Section title="actions · converge, compare, analyze">
        <BenchActions selected={selected} onRun={(r, n) => setOutcome({ r, n })} />
      </Section>

      <Section title="result">
        {outcome === null ? <p className="text-xs text-dim">No action run yet.</p> : <ResultCard result={outcome.r} note={outcome.n} />}
        {results.length > 0 && (
          <div className="mt-3">
            <p className="readout text-[11px] uppercase tracking-wider text-dim">results this session ({results.length}, memory only)</p>
            <ul className="mt-1 space-y-0.5 text-[12px] text-mute" data-testid="results-list">
              {results.map((r) => (
                <li key={r.child.id}>
                  <span className="text-ivory">{r.parents.map((p) => p.title.split(" — ")[0]).join(" + ")}</span>
                  <span className="readout"> · {r.child.kind} · {r.metrics ? percent(r.metrics.jaccard) : "—"} · note</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section title="notes library">
        <NotesLibrary current={outcome?.r.ok ? outcome.r.child.id : null} onOpen={(n) => setOutcome({ r: n.result, n: n.note })} />
      </Section>

      <Section title="export">
        {outcome?.r.ok && outcome.n ? <ExportPanel result={outcome.r} note={outcome.n} /> : <p className="text-xs text-dim">Run an action; a successful note can be copied or downloaded as Markdown. The pack below carries the whole project. No network.</p>}
        <PackPanel />
      </Section>

      <Section title="refuse glossary">
        <ul className="readout grid gap-1 text-[11px] sm:grid-cols-2 lg:grid-cols-3" data-testid="refuse-codes">
          {REFUSE_CODES.map(([code, note]) => (
            <li key={code} className="flex gap-2"><span className="shrink-0 text-ivory">{code}</span><span className="text-mute">{note}</span></li>
          ))}
        </ul>
        <p className="mt-2 text-xs">Refusals are hard errors: a refused job writes nothing. Rules: <code className="readout">specs/SYNTHESIS.md</code>, <code className="readout">specs/WORKS.md</code>, <code className="readout">specs/LEGAL.md</code>; for institutions, <Link to="/about" className="text-ivory underline underline-offset-2">About</Link>.</p>
      </Section>

      <details className="mt-8 border hair bg-ink" data-testid="substrate-details">
        <summary className="cursor-pointer px-4 py-2 text-xs text-mute">
          <span className="readout uppercase tracking-wider text-dim">substrate instrument</span>
          <span className="ml-2">internal code name Chronarch — not the product</span>
        </summary>
        <div className="px-4 pb-4 text-sm text-mute">
          <p className="mt-2 text-xs">Under RexMetrix sits a research substrate: an append-only history of pins, a forbidden-key screen, a fail-closed replay. None of this is offered to a tenant as a feature; it is here so an operator can read what the node JSON says.</p>
          <Section title="programmes (drive the visitor well)">
            <div className="flex flex-wrap items-center gap-2" data-testid="tech-programmes">
              {PROGRAMME_CHIPS.map((chip) => (
                <Button key={chip.fixture} onPress={() => loadProgramme(chip.fixture as ProgrammeName)} className={`readout border hair px-2.5 py-1 text-xs ${programmeName === chip.fixture ? "bg-panel text-ivory" : "text-mute hover:text-ivory"}`} data-testid={`tech-${chip.fixture}`} aria-pressed={programmeName === chip.fixture}>
                  {chip.label} <span className="text-dim">· {chip.fixture}</span>
                </Button>
              ))}
            </div>
          </Section>
          <Section title="session fixtures (substrate records)">
            <div className="flex flex-wrap items-center gap-2">
              {(Object.keys(FIXTURES) as FixtureName[]).map((name) => (
                <Button key={name} onPress={() => { loadFixture(name); setApplied(null); }} className="readout border hair bg-panel px-2.5 py-1 text-xs text-ivory hover:bg-line pressed:bg-line" data-testid={`load-${name}`}>
                  {name}
                </Button>
              ))}
            </div>
            <div className="mt-2"><SessionMeta /></div>
          </Section>
          <Section title="paste session json">
            <TextField className="flex flex-col gap-1" aria-label="Session JSON">
              <Label className="readout text-[11px] uppercase tracking-wider text-dim">session json</Label>
              <TextArea value={text} onChange={(e) => setText(e.target.value)} placeholder={EXAMPLE} rows={10} spellCheck={false} className="readout w-full resize-y border hair bg-ink p-3 text-xs text-ivory placeholder:text-dim" data-testid="json-input" />
            </TextField>
            <div className="mt-2 flex items-center gap-3">
              <Button onPress={apply} isDisabled={!text.trim()} className="border hair bg-panel px-3 py-1.5 text-sm text-ivory hover:bg-line disabled:opacity-40" data-testid="apply-json">Apply pasted JSON</Button>
              <Button onPress={() => { setText(""); setApplied(null); }} className="px-2 py-1.5 text-sm text-mute hover:text-ivory">Clear</Button>
              {applied === "applied" && <span className="readout text-xs text-verdigris" data-testid="apply-result">applied</span>}
              {applied === "refused" && <span className="readout text-xs text-ivory" data-testid="apply-result">refused — {error}</span>}
              <span className="ml-auto"><MotionBadge /></span>
            </div>
          </Section>
          <Section title="hashes (loaded session)">
            <StatBar state={s} />
            <p className="readout mt-2 break-all text-[11px] text-dim" data-testid="head-hash-full">head_hash {s.head_hash || "—"}</p>
          </Section>
          <Section title="credits by reason (counts, not a price)">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Readout label="space" value={fmtChronons(c.space)} />
              <Readout label="pin" value={fmtChronons(c.pin)} />
              <Readout label="compute" value={fmtChronons(c.compute)} hint="paid only for an attested receipt" />
              <Readout label="treasury" value={fmtChronons(c.treasury)} />
            </div>
          </Section>
          <Section title="loaded session (raw, read-only)">
            <ErrorBoundary name="viewer">
              <JsonViewer value={JSON.stringify(session.steps.length ? { label: session.label, focus_home: session.focus_home, steps: session.steps } : s, null, 2)} />
            </ErrorBoundary>
          </Section>
          <Section title={`command log · ${session.steps.length} step${session.steps.length === 1 ? "" : "s"}`}>
            {session.steps.length === 0 ? (
              <p>The loaded input was a single CLI output, not a session envelope.</p>
            ) : (
              <ol className="readout space-y-1 text-xs" data-testid="operator-log">
                {session.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-dim">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-ivory">{step.cmd}</span>
                    <span className={`ml-auto ${step.output.ok ? "text-verdigris" : "text-ivory"}`}>{step.output.ok ? "ok" : step.output.error_code ?? "error"}</span>
                  </li>
                ))}
              </ol>
            )}
          </Section>
          <Section title="self-test case catalogue">
            <ul className="grid gap-1 text-xs sm:grid-cols-2" data-testid="gym-list">
              {GYM_CASES.map((g) => (
                <li key={g.id} className="flex gap-2">
                  <code className="readout shrink-0 text-ivory">{g.id}</code>
                  <span className="text-mute">{g.note}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs">Attested compute in this session: <span className="readout text-ivory" data-testid="attested">{String(s.attested)}</span>.</p>
          </Section>
          <Section title="what the instrument's shapes mean">
            <Legend />
          </Section>
        </div>
      </details>
    </div>
  );
}

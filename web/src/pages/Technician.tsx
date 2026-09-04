import { useState } from "react";
import { Button, Label, TextArea, TextField } from "react-aria-components";
import { Link } from "react-router-dom";

import { ErrorBoundary } from "../components/ErrorBoundary";
import JsonViewer from "../components/JsonViewer";
import { Legend } from "../components/Legend";
import { MotionBadge } from "../components/MotionBadge";
import { NotList, PageHeader, Section } from "../components/Page";
import { Readout } from "../components/Readout";
import { SessionMeta } from "../components/SessionMeta";
import { StatBar } from "../components/StatBar";
import { fmtChronons } from "../lib/format";
import { GYM_CASES } from "../lib/gym";
import { Viewport } from "../scene/Scene";
import { FIXTURES, useSession, type FixtureName } from "../state/SessionContext";

const EXAMPLE = `{"ok": true, "result": {"identity": "chronarch-pulse", "height": 3, "head_hash": "<64 hex>", "ring_count": 4, "scar_count": 0, "pins_ok": true, "i3": null, "credits_by_reason": {"space": 1}}}`;

const PROTOCOL_VIEWS = [
  ["/timechain", "Timechain", "stacked rings; scars as sealed rim lesions"],
  ["/council", "Council", "seats; the proposal docks only on approved + ratified"],
  ["/hearth", "Hearth", "the self-bond as a tensegrity; credits by reason"],
  ["/farm", "Farm", "pins as rods in a well; I3 is the only amber"],
  ["/gym", "Gym", "DummyMind as a sealed box; attested compute"],
  ["/operator", "Operator", "the loaded session's literal command log"],
  ["/consortium", "Consortium", "how a research group joins"],
] as const;

/** The technician room: the console (paste JSON, fixtures by filename), the
 *  raw session, every hash and credit, the operator path, the gym list and
 *  the consortium line. Not the default landing. */
export function Technician() {
  const { session, error, loadFixture, loadText } = useSession();
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
      <PageHeader eyebrow="technician room · lab console" title="Paste a session. Drive the scene." lede={<>Paste the JSON that <code className="readout text-ivory">chronarch memory</code>, <code className="readout text-ivory">pulse</code>, <code className="readout text-ivory">net status</code> or a captured session envelope printed, and the instrument redraws from it. The console never runs a node, never reads your disk, opens no socket, and refuses anything that is not a well-formed lab output. The loaded session is shown as plain text: an instrument, not an IDE.</>} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="readout text-[11px] uppercase tracking-wider text-dim">fixtures</span>
            {(Object.keys(FIXTURES) as FixtureName[]).map((name) => (
              <Button key={name} onPress={() => { loadFixture(name); setApplied(null); }} className="readout border hair bg-panel px-2.5 py-1 text-xs text-ivory hover:bg-line pressed:bg-line" data-testid={`load-${name}`}>
                {name}
              </Button>
            ))}
          </div>
          <TextField className="flex flex-col gap-1" aria-label="Session JSON">
            <Label className="readout text-[11px] uppercase tracking-wider text-dim">session json</Label>
            <TextArea value={text} onChange={(e) => setText(e.target.value)} placeholder={EXAMPLE} rows={12} spellCheck={false} className="readout w-full resize-y border hair bg-ink p-3 text-xs text-ivory placeholder:text-dim" data-testid="json-input" />
          </TextField>
          <div className="flex items-center gap-3">
            <Button onPress={apply} isDisabled={!text.trim()} className="border hair bg-panel px-3 py-1.5 text-sm text-ivory hover:bg-line disabled:opacity-40" data-testid="apply-json">Apply pasted JSON</Button>
            <Button onPress={() => { setText(""); setApplied(null); }} className="px-2 py-1.5 text-sm text-mute hover:text-ivory">Clear</Button>
            {applied === "applied" && <span className="readout text-xs text-verdigris" data-testid="apply-result">applied</span>}
            {applied === "refused" && <span className="readout text-xs text-ivory" data-testid="apply-result">refused — {error}</span>}
          </div>
          <div className="flex items-center justify-between gap-4">
            <SessionMeta />
            <MotionBadge />
          </div>
        </div>
        <Viewport state={s} focus="overview" className="aspect-[4/3] w-full lg:aspect-auto lg:h-[520px]" />
      </div>

      <Section title="readouts (protocol names, hex)">
        <StatBar state={s} />
        <p className="readout mt-2 break-all text-[11px] text-dim" data-testid="head-hash-full">head_hash {s.head_hash || "—"}</p>
      </Section>

      <Section title="chronos credits by reason (counts, not a price)">
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

      <Section title={`operator path · ${session.steps.length} step${session.steps.length === 1 ? "" : "s"}`}>
        {session.steps.length === 0 ? (
          <p>The loaded input was a single CLI output, not a session envelope; load <code className="readout text-ivory">session-opa.json</code> to see the full path. The command log with every step's JSON is on <Link to="/operator" className="text-ivory underline underline-offset-2">Operator</Link>.</p>
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
        <p className="mt-2 text-xs">Every step's full JSON: <Link to="/operator" className="text-ivory underline underline-offset-2">Operator</Link>. The same sequence is <code className="readout">tests/test_operator_path.py</code>.</p>
      </Section>

      <Section title="immune gym · case catalogue">
        <ul className="grid gap-1 text-xs sm:grid-cols-2" data-testid="gym-list">
          {GYM_CASES.map((g) => (
            <li key={g.id} className="flex gap-2">
              <code className="readout shrink-0 text-ivory">{g.id}</code>
              <span className="text-mute">{g.note}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs">Gym cases target Chronarch only; a case against an external target is rejected at the schema layer. Attested compute in this session: <span className="readout text-ivory" data-testid="attested">{String(s.attested)}</span>.</p>
      </Section>

      <Section title="protocol views">
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {PROTOCOL_VIEWS.map(([to, label, note]) => (
            <li key={to} className="flex gap-2">
              <Link to={to} className="readout shrink-0 text-ivory underline underline-offset-2">{label}</Link>
              <span className="text-mute">{note}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3"><Legend /></div>
      </Section>

      <Section title="consortium">
        <p data-testid="consortium-line">Chronarch is studied, not sold. There is no token sale, no allocation, no price, nothing to connect a wallet to, and no public node to run: lab-v0 is in-process or loopback only. A research group joins by running the lab, reading the law, and — if it has a change — writing a Proposal and standing a slashing-backed Ballot; there is no admin key to ask for. Details: <Link to="/consortium" className="text-ivory underline underline-offset-2">Consortium</Link>.</p>
        <NotList items={["a public blockchain, a public network, or peer discovery", "Chia, or a claim about Chia's plot format", "an asset, a market, or anything with a price", "AGI, or a claim about consciousness"]} />
      </Section>
    </div>
  );
}

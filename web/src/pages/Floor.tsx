import { useState } from "react";
import { Button } from "react-aria-components";
import { Link } from "react-router-dom";

import { MotionBadge } from "../components/MotionBadge";
import { BENCHES, FIXTURE_CHIPS, humanReadouts, type BenchKey } from "../lib/human";
import { Viewport } from "../scene/Scene";
import { useSession, type FixtureName } from "../state/SessionContext";

/** The lab floor: one scene, four benches, two records, plain words. */
export const PLAIN_STATUS =
  "Chronarch is a research organism that runs on one computer, or on two talking over a local wire. It is not a public blockchain, not a coin, and not a claim about minds.";

export function Floor() {
  const { session, source, loadFixture } = useSession();
  const [bench, setBench] = useState<BenchKey | null>(null);
  const active = BENCHES.find((b) => b.key === bench) ?? null;
  const card = active?.card(session.state) ?? null;
  const readouts = humanReadouts(session.state);

  return (
    <div>
      <p className="max-w-3xl text-base leading-relaxed text-ivory" data-testid="plain-status">{PLAIN_STATUS}</p>

      <div className="mt-6 flex flex-wrap items-center gap-2" data-testid="fixture-chips">
        <span className="readout text-[11px] uppercase tracking-wider text-dim">a record</span>
        {FIXTURE_CHIPS.map((chip) => {
          const on = source === `fixture: ${chip.fixture}`;
          return (
            <Button key={chip.fixture} onPress={() => loadFixture(chip.fixture as FixtureName)} className={`border hair px-3 py-1.5 text-sm ${on ? "bg-panel text-ivory" : "text-mute hover:text-ivory"}`} data-testid={`chip-${chip.fixture}`} aria-pressed={on}>
              <span>{chip.label}</span>
              <span className="readout ml-2 text-[11px] text-dim">{chip.blurb}</span>
            </Button>
          );
        })}
        {source === "pasted JSON" && <span className="readout text-[11px] text-dim">· a record pasted in the technician room</span>}
      </div>

      <div className="mt-4">
        <Viewport state={session.state} focus={active?.focus ?? "overview"} className="h-[460px] w-full" />
        <div className="mt-2 flex items-center justify-end"><MotionBadge /></div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-4" role="group" aria-label="Benches" data-testid="benches">
        {BENCHES.map((b) => {
          const on = b.key === bench;
          return (
            <Button key={b.key} onPress={() => setBench(on ? null : b.key)} aria-pressed={on} className={`border hair px-4 py-3 text-left ${on ? "bg-panel" : "hover:bg-ink"}`} data-testid={`bench-${b.key}`}>
              <span className="block text-base font-semibold text-ivory">{b.title}</span>
              <span className="mt-0.5 block text-xs text-mute">{b.tagline}</span>
            </Button>
          );
        })}
      </div>

      {card && active && (
        <div className="mt-4 max-w-3xl border hair bg-ink p-5" data-testid="bench-card" data-bench={active.key}>
          <p className="readout text-[11px] uppercase tracking-wider text-dim">{active.title}</p>
          <h2 className="mt-1 text-lg font-semibold text-ivory">{card.heading}</h2>
          {card.body.map((para, i) => (
            <p key={i} className="mt-3 text-sm leading-relaxed text-mute">{para}</p>
          ))}
          <p className="mt-4 text-xs text-dim">
            The protocol view, with its real names and numbers: <Link to={card.techPath} className="text-mute underline underline-offset-2 hover:text-ivory">technician room</Link>.
          </p>
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" data-testid="human-readouts">
        {readouts.map((r) => (
          <div key={r.key} className="border hair bg-panel px-3 py-2" title={r.note}>
            <div className="text-[11px] text-dim">{r.label}</div>
            <div className={`readout mt-0.5 text-xl ${r.tone === "amber" ? "text-amber" : r.tone === "mute" ? "text-mute" : "text-ivory"}`} data-testid={r.testId}>{r.value}</div>
            <div className="mt-1 text-[11px] leading-snug text-dim">{r.note}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 max-w-3xl text-sm leading-relaxed text-mute">
        <p>Everything on this floor is drawn from one saved record of a lab run. Nothing here is live, nothing is connecting to anything, and nothing moves unless the record changes — then it moves once and rests. If you want the real names — Timechain, Council, Hearth, pins, the operator path — and the hashes behind them, the <Link to="/tech" className="text-ivory underline underline-offset-2">technician room</Link> has all of it.</p>
      </div>
    </div>
  );
}

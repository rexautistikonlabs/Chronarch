/** The visitor's HUD: programmes, benches, plain readouts, one card. All of it
 *  reads static fixtures; nothing here is live and nothing is for sale. */
import { Button } from "react-aria-components";
import { Link } from "react-router-dom";

import { MotionBadge } from "../components/MotionBadge";
import { BENCHES, PROGRAMME_CHIPS, programmeReadouts } from "../lib/human";
import { useProgramme, type ProgrammeName } from "../state/ProgrammeContext";
import { useWell } from "../state/WellContext";

export function FloorHud() {
  const { programme, programmeName, child, childVerdict, loadProgramme, preloadCount } = useProgramme();
  const { bench, hovered, selectBench, setHovered } = useWell();
  const active = BENCHES.find((b) => b.key === bench) ?? null;
  const card = active?.card(programme, child, childVerdict) ?? null;
  const readouts = programmeReadouts(programme);

  return (
    <main className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex flex-col gap-3 px-5 pb-4" data-testid="floor">
      {card && active && (
        <div className="hud-card pointer-events-auto max-w-xl self-end" data-testid="bench-card" data-bench={active.key}>
          <div className="flex items-baseline justify-between gap-4">
            <p className="hud-label">{active.title}</p>
            <Button onPress={() => selectBench(null)} className="readout text-[11px] text-dim hover:text-ivory" aria-label="Close card">close</Button>
          </div>
          <h2 className="mt-1 text-base font-semibold text-ivory">{card.heading}</h2>
          {card.body.map((para, i) => (
            <p key={i} className="mt-2 text-[13px] leading-relaxed text-mute">{para}</p>
          ))}
          <p className="mt-3 text-[11px] text-dim">
            The written rules: <Link to="/chronarch/about" className="text-mute underline underline-offset-2 hover:text-ivory">about Chronarch</Link>. The substrate's hashes: <Link to={card.techPath} className="text-mute underline underline-offset-2 hover:text-ivory">technician room</Link>.
          </p>
        </div>
      )}

      <p className="pointer-events-auto self-start text-[11px] text-dim" data-testid="works-line">A few legal starter works. You add what you have rights to.</p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2" data-testid="programme-chips">
          <span className="hud-label">programme</span>
          {PROGRAMME_CHIPS.map((chip) => {
            const on = programmeName === chip.fixture;
            return (
              <Button key={chip.fixture} onPress={() => loadProgramme(chip.fixture as ProgrammeName)} className={`hud-chip ${on ? "hud-chip-on" : ""}`} data-testid={`chip-${chip.fixture}`} aria-pressed={on}>
                <span>{chip.label}</span>
                <span className="readout ml-2 text-[10px] text-dim">{chip.blurb}</span>
              </Button>
            );
          })}
        </div>
        <div className="pointer-events-auto flex flex-wrap gap-1" role="group" aria-label="Benches" data-testid="benches">
          {BENCHES.map((b) => {
            const on = b.key === bench;
            const hot = b.key === hovered;
            return (
              <Button key={b.key} onPress={() => selectBench(on ? null : b.key)} onHoverStart={() => setHovered(b.key)} onHoverEnd={() => setHovered(null)} aria-pressed={on} className={`hud-bench ${on ? "hud-bench-on" : ""} ${hot ? "hud-bench-hot" : ""}`} data-testid={`bench-${b.key}`}>
                <span className="block text-sm font-semibold">{b.title}</span>
                <span className="block text-[10px] text-dim">{b.tagline}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="pointer-events-auto flex flex-wrap items-stretch gap-2" data-testid="human-readouts">
        {readouts.map((r) => (
          <div key={r.key} className="hud-readout" title={r.note}>
            <div className="text-[10px] text-dim">{r.label}</div>
            <div className={`readout text-lg leading-tight ${r.tone === "amber" ? "text-amber" : r.tone === "mute" ? "text-mute" : "text-phosphor"}`} data-testid={r.testId}>{r.value}</div>
          </div>
        ))}
        <div className="hud-readout" title="A few legal starter works. You add what you have rights to.">
          <div className="text-[10px] text-dim">starter works</div>
          <div className="readout text-lg leading-tight text-phosphor" data-testid="works-count">{preloadCount}</div>
        </div>
        <div className="ml-auto self-end"><MotionBadge /></div>
      </div>
    </main>
  );
}

/** The first-run panel: four steps above the filters, each ticked from the
 *  workbench's own state — fields in the catalogue, works selected, a note
 *  written, the pack downloaded. Not a modal — nothing traps focus. Esc or
 *  "I'm a professional — skip" sets the seen flag; so does finishing. The
 *  one "go" control offers a public-domain starter pack; it never sets a
 *  corpus filter and nothing here names a fixture id. */
import { useEffect } from "react";
import { Button } from "react-aria-components";

import { FIRST_RUN_STEPS, type FirstRunAction, type FirstRunState } from "../lib/firstRun";
import { HONESTY } from "./StatusBanner";

export function FirstRun({ state, onDismiss, onGo }: { state: FirstRunState; onDismiss: () => void; onGo: (action: FirstRunAction) => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onDismiss(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);
  const states = FIRST_RUN_STEPS.map((s) => ({ ...s, ok: s.done(state) }));
  const doneCount = states.filter((s) => s.ok).length;
  const finished = doneCount === states.length;

  return (
    <aside className="mb-6 border hair bg-ink p-4" data-testid="first-run" aria-label="first run" data-done={doneCount}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="readout text-[11px] uppercase tracking-wider text-dim">first run · your fields, your sources, one pack</h2>
        <Button onPress={onDismiss} className="readout border hair px-2.5 py-1 text-xs text-mute hover:text-ivory" data-testid="first-run-skip">I’m a professional — skip</Button>
      </div>
      <p className="mt-2 text-sm text-mute">A blank programme, a real result and a file to keep, with nothing to read first. Each step ticks itself from what the workbench holds. Esc closes this and it stays closed.</p>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" data-testid="first-run-steps">
        {states.map((s) => (
          <li key={s.n} className={`border hair p-3 ${s.ok ? "bg-panel" : ""}`} data-testid={`first-run-step-${s.n}`} data-done={String(s.ok)}>
            <p className="readout text-[11px] text-dim">
              step {s.n} · <span className={s.ok ? "text-verdigris" : "text-mute"} data-testid={`first-run-mark-${s.n}`}>{s.ok ? "done ✓" : "to do"}</span>
            </p>
            <p className="mt-1 text-sm text-ivory">{s.text}</p>
            {!s.ok && s.action && (
              <Button onPress={() => onGo(s.action!)} className="readout mt-2 border hair px-2 py-0.5 text-[11px] text-mute hover:text-ivory" data-testid={`first-run-go-${s.n}`}>{s.action.label}</Button>
            )}
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {finished && <Button onPress={onDismiss} className="border hair bg-panel px-3 py-1.5 text-sm text-ivory hover:bg-line" data-testid="first-run-finish">Done — close this</Button>}
        <p className="readout text-[11px] text-dim" data-testid="first-run-honesty">{HONESTY}</p>
      </div>
    </aside>
  );
}

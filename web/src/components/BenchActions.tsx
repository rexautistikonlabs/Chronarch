/** Three actions over the selected works, and the result. Each action is a
 *  synthesis job run through the product's law; the result is the child pin
 *  as JSON, or the refuse code. Results accumulate in memory for the session.
 *  No model is called, nothing is fetched. */
import { useState } from "react";
import { Button } from "react-aria-components";

import { ACTIONS, runAction, type ActionKind, type BenchResult } from "../lib/bench";
import { worksMap } from "../lib/works";
import { useProgramme } from "../state/ProgrammeContext";

export function BenchActions({ selected }: { selected: ReadonlySet<string> }) {
  const { works, catalogue, files, results, addResult } = useProgramme();
  const [result, setResult] = useState<{ action: ActionKind; r: BenchResult } | null>(null);

  const run = (action: ActionKind) => {
    const map = worksMap(works);
    const chosen = works.filter((w) => selected.has(w.id));
    const r = runAction(action, chosen, catalogue, files, map);
    setResult({ action, r });
    if (r.ok) addResult(r.child);
  };

  return (
    <div>
      <p className="text-xs text-mute">
        Selected: <span className="readout text-ivory" data-testid="selected-count">{selected.size}</span> work{selected.size === 1 ? "" : "s"}. Each action writes one child pin with these as parents — or refuses.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3" data-testid="bench-actions">
        {ACTIONS.map((a) => (
          <div key={a.key} className="border hair bg-ink p-3">
            <Button onPress={() => run(a.key)} className="border hair bg-panel px-3 py-1.5 text-sm text-ivory hover:bg-line" data-testid={`action-${a.key}`}>{a.label}</Button>
            <p className="mt-2 text-[11px] text-dim">{a.help}</p>
          </div>
        ))}
      </div>

      <div className="mt-4" data-testid="result-panel">
        <p className="readout text-[11px] uppercase tracking-wider text-dim">result</p>
        {result === null ? (
          <p className="mt-1 text-xs text-dim">No action run yet.</p>
        ) : result.r.ok ? (
          <div>
            <p className="readout mt-1 text-xs text-verdigris" data-testid="result-status">ok · {result.action} → kind {result.r.child.kind} · {result.r.bridges.length} bridge{result.r.bridges.length === 1 ? "" : "s"} · walk {result.r.walk.join(" → ")}</p>
            <pre className="readout mt-2 overflow-auto border hair bg-ink p-3 text-[11px] leading-snug text-mute" style={{ maxHeight: 360 }} data-testid="result-child">{JSON.stringify(result.r.child, null, 2)}</pre>
          </div>
        ) : (
          <p className="readout mt-1 text-xs text-ivory" data-testid="result-status">refused · {result.r.code} — {result.r.detail}</p>
        )}
      </div>

      {results.length > 0 && (
        <div className="mt-4">
          <p className="readout text-[11px] uppercase tracking-wider text-dim">results this session ({results.length}, memory only)</p>
          <ul className="readout mt-1 space-y-0.5 text-[11px] text-mute" data-testid="results-list">
            {results.map((c) => (
              <li key={c.id}>{c.id} · {c.kind} · {c.parents.map((p) => p.work ?? p.pin).join(" + ")}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

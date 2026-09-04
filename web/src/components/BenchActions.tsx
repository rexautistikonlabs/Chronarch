/** Three actions over the selected works, and the readable result. Each action
 *  is a synthesis job run through the product's law; the result is a card —
 *  the two parents, their snippets, a token-overlap bar when both have bodies,
 *  a question sentence when a stub is among them — with the child's JSON under
 *  a closed details. Results accumulate in memory. No model, no fetch. */
import { useState } from "react";
import { Button } from "react-aria-components";

import { ACTIONS, runAction, type ActionKind, type BenchResult } from "../lib/bench";
import { percent } from "../lib/metrics";
import { worksMap } from "../lib/works";
import { useProgramme } from "../state/ProgrammeContext";
import { ResultCard } from "./ResultCard";

export function BenchActions({ selected }: { selected: ReadonlySet<string> }) {
  const { works, catalogue, files, results, addResult } = useProgramme();
  const [result, setResult] = useState<BenchResult | null>(null);

  const run = (action: ActionKind) => {
    const map = worksMap(works);
    const chosen = works.filter((w) => selected.has(w.id));
    const r = runAction(action, chosen, catalogue, files, map);
    setResult(r);
    if (r.ok) addResult(r);
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
        {result === null ? <p className="mt-1 text-xs text-dim">No action run yet.</p> : <div className="mt-2"><ResultCard result={result} /></div>}
      </div>

      {results.length > 0 && (
        <div className="mt-4">
          <p className="readout text-[11px] uppercase tracking-wider text-dim">results this session ({results.length}, memory only)</p>
          <ul className="mt-1 space-y-0.5 text-[12px] text-mute" data-testid="results-list">
            {results.map((r) => (
              <li key={r.child.id}>
                <span className="text-ivory">{r.parents.map((p) => p.title.split(" — ")[0]).join(" + ")}</span>
                <span className="readout"> · {r.child.kind} · {r.metrics ? percent(r.metrics.jaccard) : "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

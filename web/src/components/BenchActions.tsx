/** Three actions over the selected works. Each is enabled only when the
 *  current selection would pass the bench law for that job; otherwise it is
 *  disabled and says why (the first blocking code, and the missing field pair
 *  for NO_BRIDGE). Clicking runs the same law and hands the result up. */
import { Button } from "react-aria-components";

import { buildNote, type AnalysisNote } from "../lib/analysisNote";
import { ACTIONS, availability, runAction, type ActionKind, type BenchResult } from "../lib/bench";
import { worksMap } from "../lib/works";
import { useProgramme } from "../state/ProgrammeContext";

export function BenchActions({ selected, onRun }: { selected: ReadonlySet<string>; onRun: (r: BenchResult, note: AnalysisNote | null) => void }) {
  const { works, catalogue, files, addResult, operatorBridges } = useProgramme();
  const map = worksMap(works);
  const chosen = works.filter((w) => selected.has(w.id));
  const avail = availability(chosen, catalogue, files, map);
  const blocking = avail.find((a) => !a.enabled) ?? null;
  const allBlocked = avail.every((a) => !a.enabled);

  const run = (action: ActionKind) => {
    const r = runAction(action, chosen, catalogue, files, map);
    const note = r.ok ? buildNote(r, map, files, operatorBridges) : null;
    if (r.ok && note) addResult({ ...r, note });
    onRun(r, note);
  };

  return (
    <div>
      <p className="text-xs text-mute">
        Selected: <span className="readout text-ivory" data-testid="selected-count">{selected.size}</span> work{selected.size === 1 ? "" : "s"}. Each action writes one child pin with these as parents — or is disabled with its reason.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3" data-testid="bench-actions">
        {ACTIONS.map((a) => {
          const av = avail.find((x) => x.action === a.key)!;
          return (
            <div key={a.key} className="border hair bg-ink p-3">
              <Button
                onPress={() => run(a.key)}
                isDisabled={!av.enabled}
                aria-disabled={!av.enabled}
                className={`border hair px-3 py-1.5 text-sm ${av.enabled ? "bg-panel text-ivory hover:bg-line" : "text-dim opacity-60"}`}
                data-testid={`action-${a.key}`}
                data-enabled={String(av.enabled)}
                data-code={av.code ?? ""}
                aria-label={av.enabled ? a.label : `${a.label} — disabled: ${av.code}`}
              >
                {a.label}
              </Button>
              <p className="mt-2 text-[11px] text-dim">{a.help}</p>
              {!av.enabled && <p className="readout mt-1 text-[10px] text-mute" data-testid={`why-${a.key}`}>{av.code}{av.missing ? ` · no path ${av.missing[0]} — ${av.missing[1]}` : ""}</p>}
            </div>
          );
        })}
      </div>
      <p className="readout mt-2 text-[11px] text-mute" data-testid="actions-helper">
        {allBlocked && blocking
          ? `blocked: ${blocking.code}${blocking.missing ? ` — no path ${blocking.missing[0]} — ${blocking.missing[1]}` : ""}${blocking.reason && !blocking.reason.startsWith("no path") ? ` · ${blocking.reason}` : ""}`
          : blocking
            ? `some actions are blocked: ${blocking.code}${blocking.missing ? ` — no path ${blocking.missing[0]} — ${blocking.missing[1]}` : ""}`
            : "every action would pass the bench law for this selection."}
      </p>
    </div>
  );
}

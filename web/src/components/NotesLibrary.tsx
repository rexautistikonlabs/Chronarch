/** The project's notes in time order. Clicking one re-opens its eight-section
 *  card. Saved in this browser only (with the project); portable as project.json. */
import { Button } from "react-aria-components";

import { percent } from "../lib/metrics";
import type { ProjectNote } from "../lib/project";
import { useProgramme } from "../state/ProgrammeContext";

export function NotesLibrary({ current, onOpen }: { current: string | null; onOpen: (n: ProjectNote) => void }) {
  const { notes } = useProgramme();
  return (
    <div data-testid="notes-library">
      <p className="text-xs text-mute">{notes.length === 0 ? "No notes in this project yet. A successful action adds one." : `${notes.length} note${notes.length === 1 ? "" : "s"} in this project, oldest first.`} <span className="readout text-dim">saved in this browser only — reload keeps them; project.json carries them elsewhere</span></p>
      {notes.length > 0 && (
        <ol className="mt-2 space-y-1" data-testid="notes-list">
          {notes.map((n) => {
            const title = n.result.parents.map((p) => p.title.split(" — ")[0]).join(" + ");
            const open = current === n.result.child.id;
            return (
              <li key={n.result.child.id}>
                <Button onPress={() => onOpen(n)} className={`readout w-full border hair px-2 py-1 text-left text-[12px] ${open ? "bg-panel text-ivory" : "text-mute hover:text-ivory"}`} data-testid={`note-open-${n.seq}`} aria-pressed={open}>
                  <span className="text-dim">{String(n.seq).padStart(2, "0")}</span> <span className="text-ivory">{title}</span> · {n.note.kind} · {n.result.metrics ? percent(n.result.metrics.jaccard) : "—"}{n.note.is_not.includes("bridge was operator-declared") ? " · operator-declared bridge" : ""}
                </Button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

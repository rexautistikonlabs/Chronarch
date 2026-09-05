/** The session project's name and its bridge amendments. "Declare bridge"
 *  adds a live edge to this project only — never to a programme file — and
 *  only when the operator ticks "amendment, not evidence". */
import { useRef, useState } from "react";
import { Button } from "react-aria-components";

import { PROJECT_STORAGE_KEY } from "../lib/projectStore";
import { useProgramme } from "../state/ProgrammeContext";

export function ProjectPanel() {
  const { project, setProjectName, declareBridge, clearExtraBridges, shippedCatalogue, importProject, clearProject, saved } = useProgramme();
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const applyImport = (text: string) => {
    const r = importProject(text);
    if (!r.ok) { setImportStatus(`IMPORT_INVALID — ${r.detail} · project unchanged`); return; }
    const parts = [`imported “${r.project.name}”`, `${r.project.extra_bridges.length} extra bridge${r.project.extra_bridges.length === 1 ? "" : "s"}`, `${r.project.notes.length} note${r.project.notes.length === 1 ? "" : "s"}`];
    if (r.skipped_works) parts.push(`${r.skipped_works} work${r.skipped_works === 1 ? "" : "s"} skipped`);
    if (r.stripped_bridges) parts.push(`${r.stripped_bridges} bridge${r.stripped_bridges === 1 ? "" : "s"} stripped (not operator-declared)`);
    if (r.dropped_notes) parts.push(`${r.dropped_notes} note${r.dropped_notes === 1 ? "" : "s"} dropped`);
    setImportStatus(parts.join(" · "));
  };
  const onFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => applyImport(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => setImportStatus("IMPORT_INVALID — the file could not be read · project unchanged");
    reader.readAsText(file);
  };
  const fields = [...shippedCatalogue.fields.keys()].sort();
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [amendment, setAmendment] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const declare = () => {
    const r = declareBridge(left, right, amendment);
    setStatus(r.ok ? `declared ${r.bridge.id} — on this project only` : `refused — ${r.reason}`);
  };

  return (
    <div data-testid="project-panel">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="readout text-[11px] uppercase tracking-wider text-dim">project name</span>
          <input value={project.name} onChange={(e) => setProjectName(e.target.value)} className="readout border hair bg-ink p-2 text-xs text-ivory" data-testid="project-name" aria-label="project name" />
        </label>
        <p className="readout text-[11px] text-dim" data-testid="project-summary">
          {project.programme_ids.join(" + ")} · {project.works.length} work{project.works.length === 1 ? "" : "s"} used · {project.extra_bridges.length} extra bridge{project.extra_bridges.length === 1 ? "" : "s"} · {project.notes.length} note{project.notes.length === 1 ? "" : "s"}
        </p>
      </div>
      <p className="readout mt-1 text-[11px] text-mute" data-testid="saved-line">
        Saved in this browser only.{" "}
        <span className="text-dim">{saved ? `localStorage key ${PROJECT_STORAGE_KEY} · no cookies, no server, no analytics · hand it around as project.json below` : "this browser refused storage — the project lives in memory until you download it"}</span>
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-mute">
          <span className="readout text-[11px] uppercase tracking-wider text-dim">import project.json</span>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={(e) => { onFile(e.target.files?.[0]); if (fileRef.current) fileRef.current.value = ""; }} className="readout text-[11px] text-mute" data-testid="import-file" aria-label="import project.json" />
        </label>
        {importStatus && <span className="readout text-xs text-ivory" data-testid="import-status">{importStatus}</span>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-mute">
          <input type="checkbox" checked={confirmClear} onChange={(e) => setConfirmClear(e.target.checked)} data-testid="clear-project-confirm" />
          I understand: this wipes the project in memory and in this browser's storage.
        </label>
        <Button onPress={() => { clearProject(); setConfirmClear(false); setImportStatus(null); setStatus(null); }} isDisabled={!confirmClear} aria-disabled={!confirmClear} className={`readout border hair px-2.5 py-1 text-xs ${confirmClear ? "text-ivory hover:bg-line" : "text-dim opacity-60"}`} data-testid="clear-project">Clear project</Button>
      </div>

      <div className="mt-4 border hair bg-ink p-3">
        <p className="readout text-[11px] uppercase tracking-wider text-dim">declare bridge · session amendment</p>
        <p className="mt-1 text-xs text-mute">Joins two fields for this project only. It is an operator's amendment: no ledger, no register, not evidence. It is never written into a programme file, and a note that runs over it says so.</p>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="readout text-[11px] text-dim">left field</span>
            <select value={left} onChange={(e) => setLeft(e.target.value)} className="readout border hair bg-ink p-2 text-xs text-ivory" data-testid="declare-left" aria-label="left field">
              <option value="">—</option>
              {fields.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="readout text-[11px] text-dim">right field</span>
            <select value={right} onChange={(e) => setRight(e.target.value)} className="readout border hair bg-ink p-2 text-xs text-ivory" data-testid="declare-right" aria-label="right field">
              <option value="">—</option>
              {fields.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-mute">
            <input type="checkbox" checked={amendment} onChange={(e) => setAmendment(e.target.checked)} data-testid="declare-amendment" />
            amendment, not evidence.
          </label>
          <Button onPress={declare} className="border hair bg-panel px-3 py-1.5 text-sm text-ivory hover:bg-line" data-testid="declare-bridge">Declare bridge</Button>
          {status && <span className="readout text-xs text-ivory" data-testid="declare-status">{status}</span>}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <ul className="readout flex flex-wrap gap-2 text-[11px]" data-testid="extra-bridges">
            {project.extra_bridges.length === 0 && <li className="text-dim">no extra bridges</li>}
            {project.extra_bridges.map((b) => (
              <li key={b.id} className="border hair px-2 py-0.5 text-ivory" data-testid={`extra-${b.id}`}>{b.left} — {b.right} <span className="text-dim">· operator-declared</span></li>
            ))}
          </ul>
          {project.extra_bridges.length > 0 && (
            <Button onPress={() => { clearExtraBridges(); setStatus("extra bridges cleared"); }} className="readout border hair px-2.5 py-1 text-xs text-mute hover:text-ivory" data-testid="clear-extra-bridges">Clear extra bridges</Button>
          )}
        </div>
      </div>
    </div>
  );
}

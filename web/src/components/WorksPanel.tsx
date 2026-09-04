/** Technician room: the works list, the upload form (model only), and the
 *  refuse codes. No file binary is stored anywhere; an accepted upload is a
 *  record in this session's memory. */
import { useState } from "react";
import { Button, Checkbox, Label, Select, SelectValue, TextField, Input, Popover, ListBox, ListBoxItem } from "react-aria-components";

import { hasFullText, LICENSES, REFUSAL_CODES_WORKS, type License } from "../lib/works";
import { useProgramme } from "../state/ProgrammeContext";

export function WorksPanel() {
  const { works, preloadCount, upload } = useProgramme();
  const [title, setTitle] = useState("");
  const [license, setLicense] = useState<License | "">("");
  const [claimsBytes, setClaimsBytes] = useState(false);
  const [rights, setRights] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const submit = () => {
    const r = upload({ title, license: license || null, claimsBytes, rights });
    if (r.ok) {
      setResult(`accepted · ${r.work.id} (${r.work.license}${r.work.bytes === "present" ? ", full text flagged" : ", citation only"})`);
      setTitle("");
      setClaimsBytes(false);
      setRights(false);
    } else {
      setResult(`refused · ${r.code} — ${r.detail}`);
    }
  };

  return (
    <div>
      <p className="text-xs text-mute">A few legal starter works ship with RexMetrix ({preloadCount} preloaded). A tenant adds what it has rights to. Every record carries a licence; full text may be flagged present only under cc-by-4.0, cc0, mit, public-domain or arxiv-nonexclusive; a stub is a citation, not a body. No bytes are stored here — <code className="readout">bytes</code> is a flag.</p>

      <div className="mt-3 overflow-x-auto border hair">
        <table className="readout w-full text-[11px]" data-testid="works-table">
          <thead className="text-dim">
            <tr>
              <th className="px-2 py-1 text-left">id</th>
              <th className="px-2 py-1 text-left">title</th>
              <th className="px-2 py-1 text-left">license</th>
              <th className="px-2 py-1 text-left">oa</th>
              <th className="px-2 py-1 text-left">source</th>
              <th className="px-2 py-1 text-left">body</th>
            </tr>
          </thead>
          <tbody>
            {works.map((w) => (
              <tr key={w.id} className="border-t hair text-mute" data-testid={`work-${w.id}`}>
                <td className="px-2 py-1 text-ivory">{w.id}</td>
                <td className="px-2 py-1">{w.title}</td>
                <td className="px-2 py-1">{w.license}</td>
                <td className="px-2 py-1">{String(w.oa)}</td>
                <td className="px-2 py-1">{w.source}</td>
                <td className="px-2 py-1">{hasFullText(w) ? "present" : "STUB_NO_FULLTEXT"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form className="mt-4 flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); submit(); }} data-testid="upload-form">
        <p className="hud-label inline-block self-start">add a work you have rights to (model only)</p>
        <TextField className="flex flex-col gap-1" value={title} onChange={setTitle}>
          <Label className="readout text-[11px] uppercase tracking-wider text-dim">title</Label>
          <Input className="readout border hair bg-ink p-2 text-xs text-ivory" data-testid="upload-title" />
        </TextField>
        <div className="flex flex-col gap-1">
          <label className="readout text-[11px] uppercase tracking-wider text-dim" htmlFor="upload-license">license</label>
          <select id="upload-license" value={license} onChange={(e) => setLicense(e.target.value as License | "")} className="readout border hair bg-ink p-2 text-xs text-ivory" data-testid="upload-license">
            <option value="">— none declared —</option>
            {LICENSES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs text-mute">
          <input type="checkbox" checked={claimsBytes} onChange={(e) => setClaimsBytes(e.target.checked)} data-testid="upload-bytes" />
          this record carries full text (flag only; no bytes are stored here)
        </label>
        <label className="flex items-center gap-2 text-xs text-mute">
          <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} data-testid="upload-rights" />
          I have rights to this file
        </label>
        <div className="flex items-center gap-3">
          <Button type="submit" className="border hair bg-panel px-3 py-1.5 text-sm text-ivory hover:bg-line" data-testid="upload-submit">Add work</Button>
          {result && <span className="readout text-xs text-ivory" data-testid="upload-result">{result}</span>}
        </div>
      </form>

      <div className="mt-4 text-xs">
        <p className="readout text-[11px] uppercase tracking-wider text-dim">refuse codes</p>
        <ul className="readout mt-1 grid gap-1 sm:grid-cols-2" data-testid="works-refusals">
          {REFUSAL_CODES_WORKS.map((c) => (
            <li key={c} className="text-mute"><span className="text-ivory">{c}</span></li>
          ))}
        </ul>
        <p className="mt-2 text-mute">FULLTEXT_FORBIDDEN: full text claimed under a licence that does not allow it. LICENSE_MISSING: no licence on the record. STUB_NO_FULLTEXT: a citation, not a body — overlap, match and couple refuse it; a question may cite it. RIGHTS_UNDECLARED: full text claimed without the rights declaration.</p>
      </div>
      {/* react-aria pieces imported for parity with the rest of the console; the native select keeps the form testable */}
      <span className="hidden"><Select aria-label="unused"><SelectValue /><Popover><ListBox><ListBoxItem>—</ListBoxItem></ListBox></Popover></Select><Checkbox aria-label="unused" /></span>
    </div>
  );
}

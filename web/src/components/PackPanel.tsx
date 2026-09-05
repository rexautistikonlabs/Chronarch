/** "Download pack": one Markdown file for the whole project — name, works
 *  table, extra bridges, every note in full, the closing negations. Built
 *  locally in the browser; nothing is sent anywhere. */
import { useState } from "react";
import { Button } from "react-aria-components";

import { packFilename, projectToMarkdown } from "../lib/project";
import { useProgramme } from "../state/ProgrammeContext";

export function PackPanel() {
  const { project } = useProgramme();
  const md = projectToMarkdown(project);
  const [status, setStatus] = useState<string | null>(null);

  const download = () => {
    try {
      if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
        setStatus("download unavailable — open the preview and select the text");
        return;
      }
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = packFilename(project);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      setStatus(`downloaded ${packFilename(project)}`);
    } catch {
      setStatus("download refused — open the preview and select the text");
    }
  };

  return (
    <div className="mt-3" data-testid="pack-panel">
      <div className="flex flex-wrap items-center gap-3">
        <Button onPress={download} className="border hair bg-panel px-3 py-1.5 text-sm text-ivory hover:bg-line" data-testid="export-pack">Download pack</Button>
        <span className="readout text-[11px] text-dim">one .md: project name · works table · extra bridges · every note in full · closing</span>
        {status && <span className="readout text-xs text-mute" data-testid="pack-status">{status}</span>}
      </div>
      <details className="mt-2 border hair bg-ink" data-testid="pack-preview">
        <summary className="readout cursor-pointer px-3 py-1.5 text-[11px] uppercase tracking-wider text-dim">pack preview ({md.length} chars)</summary>
        <textarea readOnly value={md} rows={8} className="readout w-full border-t hair bg-ink p-2 text-[11px] text-mute" aria-label="Project pack markdown" data-testid="pack-markdown" />
      </details>
    </div>
  );
}

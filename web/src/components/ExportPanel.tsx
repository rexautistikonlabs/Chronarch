/** Export a successful note as Markdown: copy to the clipboard, or download a
 *  .md file the browser builds locally. No network. The markdown is also kept
 *  in a read-only field so it can be selected by hand where those APIs are
 *  unavailable. */
import { useState } from "react";
import { Button } from "react-aria-components";

import type { AnalysisNote } from "../lib/analysisNote";
import type { BenchOk } from "../lib/bench";
import { markdownFilename, noteToMarkdown } from "../lib/exportNote";

export function ExportPanel({ result, note }: { result: BenchOk; note: AnalysisNote }) {
  const md = noteToMarkdown(result, note);
  const [status, setStatus] = useState<string | null>(null);

  const copy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(md);
        setStatus("copied");
      } else {
        setStatus("clipboard unavailable — select the text below");
      }
    } catch {
      setStatus("clipboard refused — select the text below");
    }
  };

  const download = () => {
    try {
      if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
        setStatus("download unavailable — select the text below");
        return;
      }
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = markdownFilename(note);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      setStatus(`downloaded ${markdownFilename(note)}`);
    } catch {
      setStatus("download refused — select the text below");
    }
  };

  return (
    <div data-testid="export-panel">
      <div className="flex flex-wrap items-center gap-3">
        <Button onPress={copy} className="border hair bg-panel px-3 py-1.5 text-sm text-ivory hover:bg-line" data-testid="export-copy">Copy Markdown</Button>
        <Button onPress={download} className="border hair bg-panel px-3 py-1.5 text-sm text-ivory hover:bg-line" data-testid="export-download">Download .md</Button>
        {status && <span className="readout text-xs text-mute" data-testid="export-status">{status}</span>}
      </div>
      <textarea readOnly value={md} rows={6} className="readout mt-3 w-full border hair bg-ink p-2 text-[11px] text-mute" aria-label="Markdown export" data-testid="export-markdown" />
    </div>
  );
}

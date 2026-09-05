/** The gate: a full-screen still panel before any 3D. The law in four lines,
 *  two attributions (credit, not endorsement), a checkbox and a button that
 *  stays disabled until the box is ticked. No animation in either motion
 *  mode; accepting writes one flag so a return visit skips it. */
import { useState } from "react";
import { Button } from "react-aria-components";

import { ATTRIBUTION_NOTE, ATTRIBUTIONS, GATE_LINES } from "../lib/gate";

export function Gate({ onAccept }: { onAccept: () => void }) {
  const [ticked, setTicked] = useState(false);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-void px-6" data-testid="gate" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <div className="hud-card w-full max-w-xl" data-testid="gate-card">
        <p className="hud-label">before you enter</p>
        <h1 id="gate-title" className="mt-2 text-2xl font-semibold tracking-tight text-ivory">RexMetrix</h1>
        <ul className="mt-3 space-y-1.5 text-[14px] leading-relaxed text-mute" data-testid="gate-lines">
          {GATE_LINES.map((l) => <li key={l}>{l}</li>)}
        </ul>
        <div className="mt-4 border-t hair pt-3">
          <p className="readout text-[11px] uppercase tracking-wider text-dim">attributions · {ATTRIBUTION_NOTE}</p>
          <ul className="mt-1 space-y-1 text-[12px] text-mute" data-testid="gate-attributions">
            {ATTRIBUTIONS.map((a) => (
              <li key={a.href}>
                <a href={a.href} target="_blank" rel="noopener noreferrer" className="text-ivory underline underline-offset-2" data-testid={`attribution-${a.label}`}>{a.label}</a>
                <span> — {a.what}</span>
              </li>
            ))}
          </ul>
        </div>
        <label className="mt-4 flex items-start gap-2 text-[13px] text-mute">
          <input type="checkbox" checked={ticked} onChange={(e) => setTicked(e.target.checked)} className="mt-1" data-testid="gate-check" />
          <span>I have read this. I understand that nothing here is a diagnostic, a medical device, a public chain, or endorsed by any Foundation.</span>
        </label>
        <div className="mt-4 flex items-center gap-3">
          <Button onPress={onAccept} isDisabled={!ticked} aria-disabled={!ticked} className={`border hair px-4 py-2 text-sm ${ticked ? "bg-panel text-ivory hover:bg-line" : "text-dim opacity-60"}`} data-testid="gate-enter">Enter</Button>
          <span className="readout text-[11px] text-dim">remembered in this browser only</span>
        </div>
      </div>
    </div>
  );
}

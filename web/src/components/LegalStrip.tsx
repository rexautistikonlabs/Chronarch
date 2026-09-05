/** The legal text, twice and never as a wall: a compact strip on the first
 *  screen (always visible, no checkbox), and the same text again in the
 *  footer behind a "Legal" control that expands it in place. */
import { useState } from "react";
import { Button } from "react-aria-components";

import { ATTRIBUTION_NOTE, ATTRIBUTIONS, LEGAL } from "../lib/legal";

export function Attributions({ prefix }: { prefix: string }) {
  return (
    <span data-testid={`${prefix}-attributions`}>
      <span className="readout uppercase tracking-wider">{ATTRIBUTION_NOTE}</span>{" "}
      {ATTRIBUTIONS.map((a, i) => (
        <span key={a.href}>
          {i > 0 ? " · " : ""}
          <a href={a.href} target="_blank" rel="noopener noreferrer" className="text-ivory underline underline-offset-2 hover:text-ivory" data-testid={`${prefix}-attribution-${a.label}`}>{a.href}</a>
          <span> — {a.what}</span>
        </span>
      ))}
    </span>
  );
}

export function LegalText({ prefix }: { prefix: string }) {
  return (
    <div className="space-y-1 text-[12px] leading-relaxed text-mute" data-testid={`${prefix}-text`}>
      <p><span className="text-ivory" data-testid={`${prefix}-llc`}>{LEGAL.llc}</span>. {LEGAL.products}</p>
      <p>{LEGAL.continuum} {LEGAL.laterion}</p>
      <p data-testid={`${prefix}-split`}>{LEGAL.split}</p>
      <p data-testid={`${prefix}-data`}>{LEGAL.data}</p>
      <p><Attributions prefix={prefix} /></p>
    </div>
  );
}

/** The first screen's strip. */
export function LegalStrip() {
  return (
    <div className="hud-strip pointer-events-auto px-6 py-2" data-testid="legal-strip">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[11px]">
        <span className="hud-label">status</span>
        <LegalText prefix="strip" />
      </div>
    </div>
  );
}

/** The footer's "Legal": the same text, expanded in place. */
export function LegalFooter() {
  const [open, setOpen] = useState(false);
  return (
    <div data-testid="legal-footer">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-ivory" data-testid="footer-llc">{LEGAL.llc}</span>
        <Attributions prefix="footer" />
        <Button onPress={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="legal-panel" className="readout uppercase tracking-wider text-mute underline underline-offset-2 hover:text-ivory" data-testid="footer-legal">Legal</Button>
      </p>
      {open && (
        <div id="legal-panel" className="mt-3 border hair p-3" data-testid="legal-panel">
          <LegalText prefix="panel" />
        </div>
      )}
    </div>
  );
}

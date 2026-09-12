/** The legal text, three ways and never as a wall: a compact strip on the
 *  first screen (no checkbox, nothing to agree to), the same text again in
 *  the footer behind a "Legal" control that expands it in place, and the same
 *  text again in the lab's spec board. The strip may be hidden — "Hide
 *  notice", a real button — and the footer's text, the footer's LLC line and
 *  both attribution links stay whatever the visitor hides. See lib/notice.ts. */
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

/** The first screen's strip. `onHide` adds the control that dismisses it;
 *  without it the strip is simply always there. */
export function LegalStrip({ onHide }: { onHide?: () => void }) {
  return (
    <div id="legal-strip" className="hud-strip pointer-events-auto px-6 py-2" data-testid="legal-strip" role="region" aria-label="Legal notice">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[11px]">
          <span className="hud-label">status</span>
          <LegalText prefix="strip" />
        </div>
        {onHide && (
          <Button onPress={onHide} className="readout shrink-0 whitespace-nowrap text-[11px] uppercase tracking-wider text-mute underline underline-offset-2 hover:text-ivory" data-testid="strip-hide">Hide notice</Button>
        )}
      </div>
    </div>
  );
}

/** The header's "Legal": the one control that brings a hidden strip back (and
 *  hides it again). It is in the tab order beside the product links, so the
 *  law is one key away in either state. */
export function LegalToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <Button onPress={onToggle} aria-expanded={open} aria-controls="legal-strip" className="readout text-[11px] uppercase tracking-wider text-mute underline underline-offset-2 hover:text-ivory" data-testid="header-legal">Legal</Button>
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

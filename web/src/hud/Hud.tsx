/** The HUD over the well. Top: the STATUS line, the brand, the honesty
 *  sentence, ⌘K, "About" and a "Technician" text button. That is the whole
 *  primary chrome — no bar of protocol names, nothing sold. */
import { Command } from "lucide-react";
import { Button } from "react-aria-components";
import { Link, NavLink } from "react-router-dom";

import { HONESTY } from "../components/StatusBanner";
import { useSession } from "../state/SessionContext";
import { useWell } from "../state/WellContext";

export const PLAIN_STATUS =
  "Chronarch is research software for hypothesis-led programmes: an array of fields, the bridges a group declares between them, and syntheses that name their parents. It is not a diagnostic, it is not Foundation-endorsed, and it is not a public chain. Made by RexMetrix, a product house.";

export function HudTop({ fixed = true }: { fixed?: boolean }) {
  const { isTech, setPaletteOpen } = useWell();
  const { session } = useSession();
  return (
    <header className={fixed ? "pointer-events-none fixed inset-x-0 top-0 z-30" : "relative z-30 border-b hair pb-4"} data-testid="hud-top" data-fixed={String(fixed)}>
      <div className="hud-strip pointer-events-auto flex w-full flex-wrap items-baseline gap-x-5 gap-y-1 px-5 py-1.5 text-[11px]" data-testid="status-banner" data-fixed={String(fixed)}>
        <span className="hud-label">status</span>
        <span className="text-mute">{HONESTY}</span>
        {isTech && session.status && <span className="readout text-dim">substrate {session.status.lab} · not_a_public_blockchain={String(session.status.not_a_public_blockchain)}</span>}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-4">
        <div className="pointer-events-auto max-w-2xl">
          <NavLink to="/chronarch" className="flex items-baseline gap-2">
            <span className="text-lg font-semibold tracking-tight text-ivory" data-testid="title-row">{isTech ? "Chronarch · Technician · workbench" : "Chronarch"}</span>
            <span className="hud-label">{isTech ? "operator" : "programme well"}</span>
          </NavLink>
          <p className="mt-2 text-sm leading-relaxed text-ivory/90" data-testid="plain-status">{PLAIN_STATUS}</p>
          {isTech && <p className="readout mt-2 text-[11px] text-dim" data-testid="amateur-strip">Pick two or more works → choose Converge, Compare, or Analyze → read the note.</p>}
        </div>
        <nav aria-label="Rooms" className="pointer-events-auto flex items-center gap-2" data-testid="primary-nav">
          <Button onPress={() => setPaletteOpen(true)} className="hud-button flex items-center gap-1.5" aria-label="Open the command palette (⌘K)" data-testid="open-palette">
            <Command size={13} strokeWidth={1.75} aria-hidden />
            <span className="readout">⌘K</span>
          </Button>
          <Link to="/chronarch/about" className="hud-button" data-testid="to-about">About</Link>
          {isTech ? (
            <Link to="/chronarch" className="hud-button">Programme well</Link>
          ) : (
            <Link to="/chronarch/tech" className="hud-button" data-testid="to-tech">Technician</Link>
          )}
          <Link to="/" className="hud-button" data-testid="to-rexmetrix">RexMetrix</Link>
        </nav>
      </div>
    </header>
  );
}

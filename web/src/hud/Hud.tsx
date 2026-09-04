/** The HUD over the well. Top: the STATUS line, the brand, the honesty
 *  sentence, ⌘K and a "Technician" text button. That is the whole primary
 *  chrome — no bar of protocol names. */
import { Command } from "lucide-react";
import { Button } from "react-aria-components";
import { Link, NavLink } from "react-router-dom";

import { HONESTY } from "../components/StatusBanner";
import { useSession } from "../state/SessionContext";
import { useWell } from "../state/WellContext";

export const PLAIN_STATUS =
  "Chronarch is a research organism that runs on one computer, or on two talking over a local wire. It is not a public blockchain, not a coin, and not a claim about minds.";

export function HudTop() {
  const { isTech, setPaletteOpen } = useWell();
  const { session } = useSession();
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30">
      <div className="hud-strip pointer-events-auto flex flex-wrap items-baseline gap-x-5 gap-y-1 px-5 py-1.5 text-[11px]" data-testid="status-banner">
        <span className="hud-label">status</span>
        <span className="text-mute">{HONESTY}</span>
        {session.status && <span className="readout text-dim">{session.status.lab} · not_a_public_blockchain={String(session.status.not_a_public_blockchain)}</span>}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-4">
        <div className="pointer-events-auto max-w-2xl">
          <NavLink to="/" className="flex items-baseline gap-2">
            <span className="text-lg font-semibold tracking-tight text-ivory">Chronarch</span>
            <span className="hud-label">{isTech ? "technician room" : "lab well"}</span>
          </NavLink>
          <p className="mt-2 text-sm leading-relaxed text-ivory/90" data-testid="plain-status">{PLAIN_STATUS}</p>
        </div>
        <nav aria-label="Rooms" className="pointer-events-auto flex items-center gap-2" data-testid="primary-nav">
          <Button onPress={() => setPaletteOpen(true)} className="hud-button flex items-center gap-1.5" aria-label="Open the command palette (⌘K)" data-testid="open-palette">
            <Command size={13} strokeWidth={1.75} aria-hidden />
            <span className="readout">⌘K</span>
          </Button>
          {isTech ? (
            <Link to="/" className="hud-button">Lab floor</Link>
          ) : (
            <Link to="/tech" className="hud-button" data-testid="to-tech">Technician</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

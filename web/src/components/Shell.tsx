import type { ReactNode } from "react";

import { FloorHud } from "../hud/FloorHud";
import { HudTop } from "../hud/Hud";
import { Iris } from "../hud/Iris";
import { Palette } from "../hud/Palette";
import { Well } from "../scene/Well";
import { useLocation } from "react-router-dom";

import { useWell } from "../state/WellContext";
import { ErrorBoundary } from "./ErrorBoundary";

/** One app, two rooms. The visitor gets the well and its HUD. The technician
 *  gets a flat HTML bench — no canvas, no rig, no scanlines on that route:
 *  works, selection, three actions, result, programmes, paste, hashes,
 *  glossary. Both wear the STATUS line and the same chrome. */
export function Shell({ children }: { children: ReactNode }) {
  const { isTech } = useWell();
  const { pathname } = useLocation();
  const about = pathname === "/about";
  return (
    <div className="min-h-full text-ivory">
      {!isTech && <Well />}
      <HudTop fixed={!isTech} />
      <Iris />
      <ErrorBoundary name="palette" fallback={() => null}>
        <Palette />
      </ErrorBoundary>
      {isTech ? (
        <div className="min-h-screen bg-void" data-testid="tech-bench">
          <main className="mx-auto max-w-6xl px-6 pb-16 pt-2">{children}</main>
          <footer className="mx-auto max-w-6xl px-6 pb-8 text-[11px] text-dim">
            <p>web/ is a static viewer of saved JSON fixtures. It spawns no node, opens no socket, reads no filesystem and calls no model.</p>
          </footer>
        </div>
      ) : about ? (
        <div className="tech-panel fixed inset-x-0 bottom-0 top-[168px] z-20 overflow-y-auto md:left-auto md:right-0 md:w-[min(760px,100%)]" data-testid="about-panel">
          <main className="px-6 pb-16 pt-6">{children}</main>
        </div>
      ) : (
        <>
          {children}
          <FloorHud />
        </>
      )}
    </div>
  );
}

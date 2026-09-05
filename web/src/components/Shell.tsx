import type { ReactNode } from "react";

import { FloorHud } from "../hud/FloorHud";
import { HudTop } from "../hud/Hud";
import { Iris } from "../hud/Iris";
import { Palette } from "../hud/Palette";
import { Well } from "../scene/Well";
import { useLocation } from "react-router-dom";

import { useWell } from "../state/WellContext";
import { ErrorBoundary } from "./ErrorBoundary";

/** The RexMetrix landing at / is a flat catalogue page with its own header —
 *  no well, no Chronarch chrome. Under /chronarch: the visitor gets the well
 *  and its HUD; the technician gets a flat HTML bench — no canvas, no rig, no
 *  scanlines on that route. Both Chronarch rooms wear the STATUS line. */
export function Shell({ children }: { children: ReactNode }) {
  const { isTech } = useWell();
  const { pathname } = useLocation();
  const landing = pathname === "/";
  const about = pathname === "/chronarch/about";
  if (landing) {
    return (
      <div className="min-h-screen bg-void text-ivory" data-testid="landing-page">
        <ErrorBoundary name="palette" fallback={() => null}>
          <Palette />
        </ErrorBoundary>
        <main>{children}</main>
      </div>
    );
  }
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

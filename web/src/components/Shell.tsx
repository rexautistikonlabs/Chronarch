import type { ReactNode } from "react";

import { FloorHud } from "../hud/FloorHud";
import { HudTop } from "../hud/Hud";
import { Iris } from "../hud/Iris";
import { Palette } from "../hud/Palette";
import { Well } from "../scene/Well";
import { useLocation } from "react-router-dom";

import { useWell } from "../state/WellContext";
import { ErrorBoundary } from "./ErrorBoundary";
import { TechNav } from "./TechNav";

/** One well, two audiences. The visitor gets the well and its HUD. The
 *  technician gets the same well behind a scrolling panel of protocol names,
 *  hashes and the console. Both wear the STATUS line at the very top. */
export function Shell({ children }: { children: ReactNode }) {
  const { isTech } = useWell();
  const { pathname } = useLocation();
  const about = pathname === "/about";
  return (
    <div className="min-h-full text-ivory">
      <Well />
      <HudTop />
      <Iris />
      <ErrorBoundary name="palette" fallback={() => null}>
        <Palette />
      </ErrorBoundary>
      {isTech ? (
        <div className="tech-panel fixed inset-x-0 bottom-0 top-[168px] z-20 overflow-y-auto md:left-auto md:right-0 md:w-[min(760px,100%)]" data-testid="tech-panel">
          <TechNav />
          <main className="px-6 pb-16 pt-4">{children}</main>
          <footer className="px-6 pb-6 text-[11px] text-dim">
            <p>web/ is a static viewer of saved JSON fixtures. It spawns no node, opens no socket and reads no filesystem.</p>
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

import { FlaskConical, Radar } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { HONESTY, StatusBanner } from "./StatusBanner";

/** Two rooms, one organism. The floor (/) is for a normal person: no protocol
 *  names in its chrome. The technician room (/tech and the protocol views)
 *  keeps every name, hash and credit. Both wear the same STATUS banner. */
export const TECH_PATHS = ["/tech", "/timechain", "/council", "/hearth", "/farm", "/gym", "/consortium", "/operator", "/lab"] as const;

export function isTechPath(pathname: string): boolean {
  return TECH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const TECH_VIEWS = [
  { to: "/tech", label: "Console" },
  { to: "/timechain", label: "Timechain" },
  { to: "/council", label: "Council" },
  { to: "/hearth", label: "Hearth" },
  { to: "/farm", label: "Farm" },
  { to: "/gym", label: "Gym" },
  { to: "/operator", label: "Operator" },
  { to: "/consortium", label: "Consortium" },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const tech = isTechPath(pathname);
  return (
    <div className="flex min-h-full flex-col bg-void text-ivory">
      <StatusBanner />
      <header className="border-b hair">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
          <NavLink to="/" className="flex items-baseline gap-2">
            <span className="text-base font-semibold tracking-tight">Chronarch</span>
            <span className="readout text-[11px] uppercase tracking-wider text-dim">{tech ? "technician room" : "lab floor"}</span>
          </NavLink>
          <nav aria-label="Rooms" className="flex flex-wrap gap-1 text-sm" data-testid="primary-nav">
            <NavLink to="/" end className={({ isActive }) => `flex items-center gap-1.5 rounded-sm px-2.5 py-1 ${isActive ? "bg-panel text-ivory" : "text-mute hover:text-ivory"}`}>
              <Radar size={14} strokeWidth={1.75} aria-hidden />
              Lab floor
            </NavLink>
            <NavLink to="/tech" className={() => `flex items-center gap-1.5 rounded-sm px-2.5 py-1 ${tech ? "bg-panel text-ivory" : "text-mute hover:text-ivory"}`}>
              <FlaskConical size={14} strokeWidth={1.75} aria-hidden />
              Technician
            </NavLink>
          </nav>
        </div>
        {tech && (
          <div className="border-t hair bg-ink">
            <nav aria-label="Protocol views" className="mx-auto flex max-w-7xl flex-wrap gap-1 px-5 py-1.5 text-xs" data-testid="tech-nav">
              {TECH_VIEWS.map((v) => (
                <NavLink key={v.to} to={v.to} className={({ isActive }) => `readout rounded-sm px-2 py-1 ${isActive ? "text-ivory" : "text-dim hover:text-ivory"}`}>
                  {v.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8">{children}</main>
      <footer className="border-t hair">
        <div className="mx-auto max-w-7xl px-5 py-6 text-xs text-dim">
          <p>{HONESTY} One process, or two on loopback TCP; a few home directories; no peer discovery; no external listener. Not Chia, not CHIP-48, not AGI.</p>
          <p className="mt-2 readout">web/ is a static viewer of saved session JSON. It spawns no node, opens no socket and reads no filesystem.</p>
        </div>
      </footer>
    </div>
  );
}

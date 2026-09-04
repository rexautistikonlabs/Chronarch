import { Activity, BookOpen, Box, FlaskConical, Landmark, Layers, Radar, Sprout, Terminal } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { HONESTY, StatusBanner } from "./StatusBanner";

const NAV = [
  { to: "/", label: "Landing", icon: Radar },
  { to: "/lab", label: "Lab", icon: FlaskConical },
  { to: "/timechain", label: "Timechain", icon: Layers },
  { to: "/council", label: "Council", icon: Landmark },
  { to: "/hearth", label: "Hearth", icon: Activity },
  { to: "/farm", label: "Farm", icon: Sprout },
  { to: "/gym", label: "Gym", icon: Box },
  { to: "/consortium", label: "Consortium", icon: BookOpen },
  { to: "/operator", label: "Operator", icon: Terminal },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-void text-ivory">
      <StatusBanner />
      <header className="border-b hair">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
          <NavLink to="/" className="flex items-baseline gap-2">
            <span className="text-base font-semibold tracking-tight">Chronarch</span>
            <span className="readout text-[11px] uppercase tracking-wider text-dim">lab · instrument ui</span>
          </NavLink>
          <nav aria-label="Sections" className="flex flex-wrap gap-1 text-sm">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `flex items-center gap-1.5 rounded-sm px-2.5 py-1 ${isActive ? "bg-panel text-ivory" : "text-mute hover:text-ivory"}`}>
                <Icon size={14} strokeWidth={1.75} aria-hidden />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8">{children}</main>
      <footer className="border-t hair">
        <div className="mx-auto max-w-7xl px-5 py-6 text-xs text-dim">
          <p>{HONESTY} One process, or two on loopback TCP; a few home directories; no peer discovery; no external listener. Not Chia, not CHIP-48, not AGI.</p>
          <p className="mt-2 readout">web/ is a static viewer of session JSON. It spawns no node and reads no filesystem.</p>
        </div>
      </footer>
    </div>
  );
}

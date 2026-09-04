import { NavLink } from "react-router-dom";

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

/** Protocol views by their real names — technician room only. */
export function TechNav() {
  return (
    <nav aria-label="Protocol views" className="hud-strip sticky top-0 z-10 flex flex-wrap gap-1 px-5 py-2 text-xs" data-testid="tech-nav">
      {TECH_VIEWS.map((v) => (
        <NavLink key={v.to} to={v.to} className={({ isActive }) => `readout rounded-sm px-2 py-1 ${isActive ? "text-phosphor" : "text-dim hover:text-ivory"}`}>
          {v.label}
        </NavLink>
      ))}
    </nav>
  );
}

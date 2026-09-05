/** The RexMetrix landing is a shop window: the catalogue is visible on first
 *  paint, with the law in a compact strip beside it and again in the footer
 *  behind "Legal" — never a wall, never a checkbox. No storage flag is needed
 *  to see the campus; rexmetrix.gate.v1, if a browser still holds it, is
 *  ignored. One canvas behind the story; scroll progress is the camera's
 *  only driver. Chronarch is a door (a ≤ 800 ms door tween, then /chronarch;
 *  the campus unmounts). Continuum is a door to another origin: it opens in a
 *  new tab with no opener, at once, so this tab never holds a half-open door
 *  and Back never lands on an ivory plane. Whatever is open resets when the
 *  document hides or shows again (pagehide, pageshow incl. BFCache,
 *  visibilitychange): plane gone, ledger asleep, campus clickable. Laterion
 *  has no door.
 *  Continuum has one state (RUNNING) and one product URL; its source
 *  repository is named once, as a source. Under prefers-reduced-motion, or
 *  without WebGL, the campus is not mounted and the same page stands as
 *  stacked HTML. Continuum is never mounted inside this app; this page never
 *  imports the Chronarch well. */
import { invalidate } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Campus, webglAvailable } from "../campus/Campus";
import { BUILDINGS, type BuildingKey, type Door } from "../campus/campusLayout";
import { DoorIris } from "../components/DoorIris";
import { LegalFooter, LegalStrip } from "../components/LegalStrip";
import { attachDoorReset, createDoorState } from "../lib/doorState";
import { BUYER_LINE, CONTINUUM_URL, exits, LLC, SCIENTIFICLAB_URL } from "../lib/legal";
import { usePrefersReducedMotion } from "../lib/motion";
import { touch } from "../scene/renderPolicy";

export interface Chapter {
  key: BuildingKey;
  name: string;
  status: "RUNNING" | "FORTHCOMING";
  sentences: string[]; // at most three
  isNot: string[];
  door: Door | null; // the chapter's CTA is the building's door
  source?: { href: string; label: string }; // a source repository, named once, new tab — never the door
}

export const CHAPTERS: readonly Chapter[] = [
  {
    key: "chronarch",
    name: "Chronarch",
    status: "RUNNING",
    sentences: ["Research software that is running.", "An array of fields, the bridges a group declares between them, programmes as subgraphs, and syntheses that name their parents.", "The programme well, the technician's workbench, one project you can take home."],
    isNot: ["not a diagnostic", "not a medical device", "not Foundation-endorsed"],
    door: { kind: "route", to: "/chronarch" },
  },
  {
    key: "continuum",
    name: "Continuum",
    status: "RUNNING",
    sentences: ["Continuum is a simulation; its numbers are model outputs, not measurements of any person.", "It runs at its own address, not inside this app."],
    isNot: ["not a measurement of any person", "not embedded here", "not an engine shared with Chronarch"],
    door: { kind: "external", href: CONTINUUM_URL },
    source: { href: SCIENTIFICLAB_URL, label: "source repository" },
  },
  {
    key: "laterion",
    name: "Laterion",
    status: "FORTHCOMING",
    sentences: ["Laterion records facial kinematics including partial trials and laterality.", "It is not a diagnostic, not a person-score, and not an assessment of anyone.", "It is not shipping in this repository: no camera, no image, no landmark code here."],
    isNot: ["not a diagnostic", "not a person-score", "not an assessment of anyone"],
    door: null,
  },
];

export const FOOTER_RULES: readonly string[] = [
  "RexMetrix is the company. Chronarch is one of its products; the two names are not the same thing.",
  "Each product keeps its own engine and its own refusals; nothing here is one engine wearing three names.",
];
const DOMAIN = "Domain reserved for the RexMetrix landing: rexmetrix.com. This page makes no claim about that domain's DNS.";

function Hero() {
  return (
    <section className="pointer-events-none relative flex min-h-screen flex-col" data-testid="hero" aria-label="RexMetrix">
      <LegalStrip />
      {/* text takes no pointer: the buildings behind it stay clickable; only the links do */}
      <div className="pointer-events-none flex flex-wrap items-baseline justify-between gap-6 px-6 pt-5">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="landing-title">RexMetrix <span className="readout text-[11px] uppercase tracking-wider text-dim">· {LLC}</span></h1>
        <nav aria-label="Products" className="pointer-events-auto flex items-center gap-5 text-sm" data-testid="landing-nav">
          <Link to="/chronarch" className="text-mute underline-offset-4 hover:text-ivory hover:underline" data-testid="landing-to-chronarch">Chronarch</Link>
          <a href={CONTINUUM_URL} target="_blank" rel="noopener noreferrer" className="text-mute underline-offset-4 hover:text-ivory hover:underline" data-testid="landing-to-continuum">Continuum</a>
          <Link to="/chronarch/tech" className="text-mute underline-offset-4 hover:text-ivory hover:underline" data-testid="landing-to-tech">Workbench</Link>
        </nav>
      </div>
      {/* the buyer line sits low, over the empty pad, so it never covers a sign; still above the fold */}
      <div className="pointer-events-none mt-auto px-6 pb-6">
        <p className="max-w-xl text-[14px] leading-relaxed text-mute" data-testid="buyer-line">{BUYER_LINE}</p>
        <p className="readout mt-3 text-[11px] text-dim" data-testid="hero-hint">scroll</p>
      </div>
    </section>
  );
}

function ChapterBlock({ c, stacked, onDoor }: { c: Chapter; stacked: boolean; onDoor: (k: BuildingKey) => void }) {
  return (
    <section id={c.key} className={`${stacked ? "" : "pointer-events-none "}flex ${stacked ? "py-16" : "min-h-screen items-center justify-end"} px-6`} style={{ scrollMarginTop: "3rem" }} data-testid={`chapter-${c.key}`} data-status={c.status} aria-labelledby={`${c.key}-title`}>
      <div className={`hud-card pointer-events-auto ${stacked ? "w-full max-w-2xl" : "w-full max-w-md"}`}>
        <p className="hud-label">{c.name.toUpperCase()} · {c.status}{c.key === "laterion" ? " · NOT A DIAGNOSTIC" : ""}</p>
        <h2 id={`${c.key}-title`} className="mt-2 text-xl font-semibold text-ivory">{c.name}</h2>
        {c.sentences.map((s) => <p key={s} className="mt-2 text-[14px] leading-relaxed text-mute">{s}</p>)}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {c.door?.kind === "route" && (
            <a href={c.door.to} onClick={(e) => { e.preventDefault(); onDoor(c.key); }} className="hud-button inline-block" data-testid={`cta-${c.key}`} data-door="route">Open {c.name}</a>
          )}
          {c.door?.kind === "external" && (
            <a href={c.door.href} target="_blank" rel="noopener noreferrer" className="hud-button inline-block" data-testid={`cta-${c.key}`} data-door="external">Open {c.name} ↗</a>
          )}
          {c.source && (
            <a href={c.source.href} target="_blank" rel="noopener noreferrer" className="readout text-[11px] text-dim underline underline-offset-2 hover:text-ivory" data-testid={`source-${c.key}`}>{c.source.label}</a>
          )}
          {!c.door && (
            <p className="readout text-[11px] uppercase tracking-wider text-dim" data-testid={`forthcoming-${c.key}`}>forthcoming · no door, no route in this app, no engine here</p>
          )}
        </div>
        <p className="readout mt-3 text-[11px] text-dim" data-testid={`is-not-${c.key}`}>{c.isNot.join(" · ")}</p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="pointer-events-auto border-t hair px-6 py-6 text-[11px] text-dim" data-testid="landing-footer">
      <LegalFooter />
      <ul className="mt-3 space-y-1" data-testid="landing-rules">{FOOTER_RULES.map((r) => <li key={r}>{r}</li>)}</ul>
      <p className="mt-3">Static site. It spawns no process, opens no socket, reads no filesystem, calls no model. {DOMAIN}</p>
    </footer>
  );
}

export function Landing() {
  const reduced = usePrefersReducedMotion();
  const webgl = webglAvailable();
  const campus = !reduced && webgl;
  const navigate = useNavigate();
  const progress = useRef(0);
  const door = useRef<BuildingKey | null>(null);
  const doorState = useMemo(() => createDoorState(), []);
  const [leaving, setLeaving] = useState<BuildingKey | null>(null);

  // The door's lifecycle: React state follows the helper; the document's
  // hide/show events reset it (a BFCache restore included). On reset the
  // plane unmounts (its effect releases the ledger and kills the tween), the
  // rig's door goal clears, and one frame is asked for so the campus paints.
  useEffect(() => {
    const unsub = doorState.subscribe((k) => {
      door.current = (k as BuildingKey | null);
      setLeaving(k as BuildingKey | null);
      if (k === null) invalidate();
    });
    const detach = attachDoorReset(doorState);
    return () => { unsub(); detach(); doorState.reset(); };
  }, [doorState]);

  // Scroll is the camera's driver: each event updates the progress the rig
  // reads and touches the render ledger; the loop sleeps after the last one.
  useEffect(() => {
    if (!campus) return;
    const read = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      progress.current = Math.min(1, Math.max(0, window.scrollY / max));
      touch("scroll");
    };
    read();
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => {
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, [campus]);

  // A building is a door (Chronarch: a route, after the tween; Continuum:
  // another origin, at once, in a new tab) or a bookmark (Laterion).
  const pick = useCallback((k: BuildingKey) => {
    const b = BUILDINGS.find((x) => x.key === k)!;
    if (!b.door) {
      document.getElementById(k)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      return;
    }
    if (b.door.kind === "external") { exits.open(b.door.href); return; } // synchronous: inside the click, no tween, no half-open door
    if (doorState.isOpen()) return;
    if (!campus) { navigate(b.door.to); return; } // no tween without the campus
    doorState.start(k); // the rig eases at the volume while the door opens
  }, [campus, doorState, navigate, reduced]);
  const doorDone = useCallback(() => {
    const k = doorState.complete();
    const d = k ? BUILDINGS.find((x) => x.key === k)?.door : null;
    if (d?.kind === "route") navigate(d.to);
  }, [doorState, navigate]);

  return (
    <div data-testid="landing-body" data-mode={campus ? "campus" : reduced ? "reduced-motion" : "no-webgl"} data-leaving={leaving ?? ""}>
      {campus && <Campus progress={progress} door={door} onPick={pick} />}
      {leaving && <DoorIris onDone={doorDone} />}
      <div className={campus ? "pointer-events-none relative z-10" : ""}>
        <Hero />
        <div data-testid="chapters">
          {CHAPTERS.map((c) => <ChapterBlock key={c.key} c={c} stacked={!campus} onDoor={pick} />)}
        </div>
        <Footer />
      </div>
    </div>
  );
}

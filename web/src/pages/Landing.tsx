/** The RexMetrix landing is a shop window on a working lab. The first screen
 *  is the room itself — the instrument lab, visible on first paint — with the
 *  law in a compact strip across the top and again in the footer behind
 *  "Legal"; never a wall, never a checkbox, no storage flag (an old
 *  rexmetrix.gate.v1, if a browser still holds it, is ignored). One canvas,
 *  drawn on demand. Every piece on the floor is a hotspot with a sentence and
 *  a job: click it and the operator walks there, then the piece acts —
 *  Chronarch's bench is a door (a ≤ 800 ms door tween, then /chronarch; the
 *  lab unmounts); Continuum's console is a door to another origin in this
 *  same tab (the same tween, then one location.assign to
 *  continuum.rexmetrix.com; the header link and the chapter CTA are ordinary
 *  anchors to that URL — one click, one navigation); Laterion's covered bench
 *  opens a one-line drawer and nothing else; the spec board opens the legal
 *  text; the lab book is a door to the workbench. Whatever door is open
 *  resets when the document hides or shows again (pagehide, pageshow incl. a
 *  BFCache restore, visibilitychange): plane gone, ledger asleep, lab
 *  clickable — so Back from Continuum shows the lab, not an ivory plane.
 *  Continuum has one state (RUNNING) and one product URL; its source
 *  repository is named once, as a source. The strip that carries the law can
 *  be hidden — "Hide notice" — so the room is full-bleed; the choice is one
 *  flag in this browser, the header's "Legal" brings it straight back, and
 *  the footer's "Legal", the footer's LLC line, both attribution links and
 *  the lab's spec board keep every sentence either way. Nothing is ever
 *  agreed to: no checkbox, no wall. Under prefers-reduced-motion, or
 *  without WebGL, the lab is not mounted: the same catalogue stands as an
 *  HTML station list with the same doors and the same refusals, and a door
 *  is an immediate route change. Continuum is never mounted inside this app;
 *  this page never imports the Chronarch well. */
import { invalidate } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { DoorIris } from "../components/DoorIris";
import { LegalFooter, LegalStrip, LegalText, LegalToggle } from "../components/LegalStrip";
import { Lab, webglAvailable } from "../lab/Lab";
import { PROPS, propByKey, type Door, type PropKey, type StationKey, type WalkRequest } from "../lab/labLayout";
import { attachDoorReset, createDoorState } from "../lib/doorState";
import { BUYER_LINE, CONTINUUM_URL, exits, LLC, SCIENTIFICLAB_URL } from "../lib/legal";
import { usePrefersReducedMotion } from "../lib/motion";
import { noticeHidden, setNoticeHidden } from "../lib/notice";

export interface Chapter {
  key: StationKey;
  name: string;
  status: "RUNNING" | "NOT SHIPPING"; // one status word per product, the same as its station
  sentences: string[]; // at most three
  isNot: string[];
  door: Door | null; // the chapter's CTA is the station's door
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
    sentences: ["Continuum is a literature-informed biotensegrity and afferent-flow teaching simulation on https://continuum.rexmetrix.com.", "Model outputs, not measurements of a person. Not a diagnostic. Not a programme ledger.", "It runs at its own address, not inside this app; its source repository is public."],
    isNot: ["not a measurement of a person", "not a diagnostic", "not embedded here"],
    door: { kind: "external", href: CONTINUUM_URL },
    source: { href: SCIENTIFICLAB_URL, label: "source repository" },
  },
  {
    key: "laterion",
    name: "Laterion",
    status: "NOT SHIPPING",
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
const LAB_HINT = "Click a station: the operator walks there. Drag to look around.";

/** The first screen's chrome, over the lab: the strip, the wordmark, three
 *  links, the buyer line and the hovered piece's sentence. Text takes no
 *  pointer, so the pieces behind it stay clickable; only the links do. */
function Hero({ lab, hovered, notice, onHideNotice, onToggleNotice }: { lab: boolean; hovered: PropKey | null; notice: boolean; onHideNotice: () => void; onToggleNotice: () => void }) {
  return (
    <section className={`pointer-events-none flex flex-col ${lab ? "absolute inset-0" : "relative"}`} data-testid="hero" aria-label="RexMetrix">
      {/* hidden, the strip leaves the layout entirely: the room is full-bleed and the header keeps the way back */}
      {notice && <LegalStrip onHide={onHideNotice} />}
      <div className="pointer-events-none flex flex-wrap items-baseline justify-between gap-6 px-6 pt-5">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="landing-title">RexMetrix <span className="readout text-[11px] uppercase tracking-wider text-dim">· {LLC}</span></h1>
        <nav aria-label="Products" className="pointer-events-auto flex items-center gap-5 text-sm" data-testid="landing-nav">
          <Link to="/chronarch" className="text-mute underline-offset-4 hover:text-ivory hover:underline" data-testid="landing-to-chronarch">Chronarch</Link>
          <a href={CONTINUUM_URL} className="text-mute underline-offset-4 hover:text-ivory hover:underline" data-testid="landing-to-continuum">Continuum</a>
          <Link to="/chronarch/tech" className="text-mute underline-offset-4 hover:text-ivory hover:underline" data-testid="landing-to-tech">Workbench</Link>
          <LegalToggle open={notice} onToggle={onToggleNotice} />
        </nav>
      </div>
      {/* the buyer line sits low, over the floor in front of the benches, so it never covers a sign; still above the fold */}
      <div className={`pointer-events-none px-6 pb-6 ${lab ? "mt-auto" : "mt-8"}`}>
        <p className="max-w-xl text-[14px] leading-relaxed text-mute" data-testid="buyer-line">{BUYER_LINE}</p>
        {lab && <p className="readout mt-3 min-h-[1.25rem] max-w-2xl text-[11px] text-dim" data-testid="lab-sentence">{hovered ? `${propByKey(hovered).sentence} Click: the operator walks there.` : LAB_HINT}</p>}
      </div>
    </section>
  );
}

/** Without the lab (reduced motion, no WebGL): the same pieces as an HTML
 *  list — the same doors, the same statuses, the same refusals. */
function StationList({ onPick }: { onPick: (k: PropKey) => void }) {
  return (
    <section className="px-6 pb-4 pt-2" aria-label="Stations" data-testid="station-list">
      <p className="hud-label">stations</p>
      <ul className="mt-3 space-y-3">
        {PROPS.map((p) => (
          <li key={p.key} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px]" data-testid={`station-${p.key}`} data-status={p.status ?? ""}>
            {p.door?.kind === "route" && <Link to={p.door.to} className="hud-button" data-testid={`station-door-${p.key}`}>{p.sign}</Link>}
            {p.door?.kind === "external" && <a href={p.door.href} className="hud-button" data-testid={`station-door-${p.key}`}>{p.sign}</a>}
            {!p.door && <button type="button" onClick={() => onPick(p.key)} className="hud-button" data-testid={`station-door-${p.key}`}>{p.sign}</button>}
            <span className="text-mute">{p.sentence}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChapterBlock({ c, onDoor }: { c: Chapter; onDoor: (k: StationKey) => void }) {
  return (
    <section id={c.key} className="flex px-6 py-16" style={{ scrollMarginTop: "3rem" }} data-testid={`chapter-${c.key}`} data-status={c.status} aria-labelledby={`${c.key}-title`}>
      <div className="hud-card w-full max-w-2xl">
        <p className="hud-label">{c.name.toUpperCase()} · {c.status}{c.key === "laterion" ? " · NOT A DIAGNOSTIC" : ""}</p>
        <h2 id={`${c.key}-title`} className="mt-2 text-xl font-semibold text-ivory">{c.name}</h2>
        {c.sentences.map((s) => <p key={s} className="mt-2 text-[14px] leading-relaxed text-mute">{s}</p>)}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {c.door?.kind === "route" && (
            <a href={c.door.to} onClick={(e) => { if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; e.preventDefault(); onDoor(c.key); }} className="hud-button inline-block" data-testid={`cta-${c.key}`} data-door="route">Open {c.name}</a>
          )}
          {c.door?.kind === "external" && (
            <a href={c.door.href} className="hud-button inline-block" data-testid={`cta-${c.key}`} data-door="external">Open {c.name} ↗</a>
          )}
          {c.source && (
            <a href={c.source.href} target="_blank" rel="noopener noreferrer" className="readout text-[11px] text-dim underline underline-offset-2 hover:text-ivory" data-testid={`source-${c.key}`}>{c.source.label}</a>
          )}
          {!c.door && (
            <p className="readout text-[11px] uppercase tracking-wider text-dim" data-testid={`no-door-${c.key}`}>not shipping · no door, no route in this app, no engine here</p>
          )}
        </div>
        <p className="readout mt-3 text-[11px] text-dim" data-testid={`is-not-${c.key}`}>{c.isNot.join(" · ")}</p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t hair px-6 py-6 text-[11px] text-dim" data-testid="landing-footer">
      <LegalFooter />
      <ul className="mt-3 space-y-1" data-testid="landing-rules">{FOOTER_RULES.map((r) => <li key={r}>{r}</li>)}</ul>
      <p className="mt-3">Static site. It spawns no process, opens no socket, reads no filesystem, calls no model. {DOMAIN}</p>
    </footer>
  );
}

export function Landing() {
  const reduced = usePrefersReducedMotion();
  const webgl = webglAvailable();
  const lab = !reduced && webgl;
  const navigate = useNavigate();
  const door = useRef<PropKey | null>(null);
  const doorState = useMemo(() => createDoorState(), []);
  const [leaving, setLeaving] = useState<PropKey | null>(null);
  const [walk, setWalk] = useState<WalkRequest | null>(null);
  const walking = useRef(false);
  const departing = useRef(false); // a door has completed: the plane and the camera hold at the piece until the route changes
  const [hovered, setHovered] = useState<PropKey | null>(null);
  const [drawer, setDrawer] = useState<"laterion" | "spec" | null>(null);
  // The notice starts as this browser last left it. Hiding it changes what is
  // shown first, never what is available: the footer and the spec board keep
  // the same sentences, and the header's control brings the strip back.
  const [notice, setNotice] = useState(() => !noticeHidden());
  const hideNotice = useCallback(() => { setNotice(false); setNoticeHidden(true); }, []);
  const toggleNotice = useCallback(() => {
    setNotice((open) => {
      setNoticeHidden(open); // open now means the click hides it, and the other way round
      return !open;
    });
  }, []);

  // The door's lifecycle: React state follows the helper. When a door
  // completes, the plane and the rig's goal stay at the piece (the route is
  // changing; the lab is about to unmount, and nothing should move or draw
  // meanwhile). When the document hides or shows again (a BFCache restore
  // included) or becomes visible, everything clears: the helper resets, the
  // plane unmounts (its effect releases the ledger and kills the tween), the
  // rig's door goal clears, a walk in flight may be clicked past, and one
  // frame is asked for so the lab paints.
  useEffect(() => {
    const unsub = doorState.subscribe((k) => {
      if (k === null && departing.current) return;
      door.current = k as PropKey | null;
      setLeaving(k as PropKey | null);
      if (k === null) invalidate();
    });
    const clear = () => {
      departing.current = false;
      walking.current = false;
      door.current = null;
      setWalk(null); // a walk in flight is cancelled too: nothing arrives, so no door opens without a click
      setLeaving(null);
      invalidate();
    };
    const onVisible = () => { if (document.visibilityState === "visible") clear(); };
    const detach = attachDoorReset(doorState);
    window.addEventListener("pagehide", clear);
    window.addEventListener("pageshow", clear);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      unsub();
      detach();
      window.removeEventListener("pagehide", clear);
      window.removeEventListener("pageshow", clear);
      document.removeEventListener("visibilitychange", onVisible);
      doorState.reset();
    };
  }, [doorState]);

  // Where a door leads, once it has opened: a route in this app, or one
  // navigation of this tab to the other origin.
  const go = useCallback((k: PropKey) => {
    const d = propByKey(k).door;
    if (!d) return;
    if (d.kind === "route") navigate(d.to);
    else exits.leave(d.href);
  }, [navigate]);

  // What a piece does once the operator stands at it: a product door
  // (Chronarch, Continuum, the lab book), the one-line refusal (Laterion),
  // or the legal text (the spec board). Without the lab, a door is immediate.
  const act = useCallback((k: PropKey) => {
    walking.current = false;
    setWalk(null); // served: a remount never replays it
    if (k === "laterion") { setDrawer("laterion"); return; }
    if (k === "specboard") { setDrawer("spec"); return; }
    if (!propByKey(k).door || doorState.isOpen()) return;
    if (!lab) { go(k); return; }
    departing.current = false;
    doorState.start(k); // the rig eases at the piece while the door opens
  }, [doorState, go, lab]);

  // A click on a piece — its meshes or its HTML hotspot: the operator walks
  // there first when the lab is mounted; one walk at a time.
  const pick = useCallback((k: PropKey) => {
    if (doorState.isOpen() || departing.current) return;
    if (!lab) { act(k); return; }
    if (walking.current) return;
    walking.current = true;
    setWalk((w) => ({ key: k, n: (w?.n ?? 0) + 1 }));
  }, [act, doorState, lab]);
  // The chapter CTA below the fold: the door without the walk (the room may
  // be scrolled out of view; the operator has nothing to show there).
  const enter = useCallback((k: PropKey) => {
    if (doorState.isOpen() || departing.current || walking.current) return;
    act(k);
  }, [act, doorState]);
  const doorDone = useCallback(() => {
    departing.current = true;
    const k = doorState.complete() as PropKey | null;
    if (k) go(k);
    else departing.current = false;
  }, [doorState, go]);

  return (
    <div data-testid="landing-body" data-mode={lab ? "lab" : reduced ? "reduced-motion" : "no-webgl"} data-leaving={leaving ?? ""} data-notice={notice ? "open" : "hidden"}>
      <section className={lab ? "relative h-screen" : "relative"} data-testid="first-screen">
        {lab && <Lab walk={walk} door={door} onPick={pick} onHover={setHovered} onArrive={act} />}
        <Hero lab={lab} hovered={hovered} notice={notice} onHideNotice={hideNotice} onToggleNotice={toggleNotice} />
      </section>
      {!lab && <StationList onPick={pick} />}
      {leaving && <DoorIris key={leaving} onDone={doorDone} />}
      {drawer === "laterion" && (
        <div className="hud-card fixed inset-x-6 bottom-6 z-30 flex items-baseline justify-between gap-4 sm:left-auto sm:w-[28rem]" role="status" data-testid="laterion-drawer">
          <p className="text-[13px] text-ivory"><span className="hud-label mr-2">LATERION</span>Not shipping. Not a diagnostic. Not a person-score.</p>
          <button type="button" onClick={() => setDrawer(null)} className="readout text-[11px] text-dim hover:text-ivory" aria-label="Close" data-testid="laterion-drawer-close">close</button>
        </div>
      )}
      {drawer === "spec" && (
        <div className="hud-card fixed inset-x-6 bottom-6 z-30 sm:left-auto sm:w-[36rem]" role="status" data-testid="spec-drawer">
          <div className="flex items-baseline justify-between gap-4">
            <p className="hud-label">SPEC BOARD · LEGAL</p>
            <button type="button" onClick={() => setDrawer(null)} className="readout text-[11px] text-dim hover:text-ivory" aria-label="Close" data-testid="spec-drawer-close">close</button>
          </div>
          <div className="mt-2"><LegalText prefix="board" /></div>
        </div>
      )}
      <div data-testid="chapters">
        {CHAPTERS.map((c) => <ChapterBlock key={c.key} c={c} onDoor={enter} />)}
      </div>
      <Footer />
    </div>
  );
}

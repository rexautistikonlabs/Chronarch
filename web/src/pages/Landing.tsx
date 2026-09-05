/** The RexMetrix landing: an Apple-style product story over one 3D campus.
 *  The canvas is fixed behind the page; scroll progress 0–1 is the only
 *  driver of the camera (no idle spin). A hero — STATUS, the wordmark, two
 *  text links — then three chapters, each at most three sentences, with a
 *  scroll margin so #chronarch, #continuum and #laterion deep-link.
 *  Chronarch is the one product that runs here and the only door. Continuum
 *  is a chapter whose one link is its source repository on GitHub (an
 *  external text link; nothing of it is embedded here). Laterion is a chapter
 *  with no route and no engine; it is not shipping in this repository. Under prefers-reduced-motion,
 *  or without WebGL, the campus is not mounted and the same hero and chapters
 *  stand as stacked HTML. This page never imports the Chronarch well. */
import { useCallback, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Campus, webglAvailable } from "../campus/Campus";
import { BUILDINGS, type BuildingKey } from "../campus/campusLayout";
import { HONESTY_LANDING } from "../components/StatusBanner";
import { usePrefersReducedMotion } from "../lib/motion";
import { touch } from "../scene/renderPolicy";

export interface Chapter {
  key: BuildingKey;
  name: string;
  status: "RUNNING" | "FORTHCOMING";
  sentences: string[]; // at most three
  isNot: string[];
  cta: { to: string; label: string; external?: true } | null; // Chronarch's door, or Continuum's source link
}

export const SCIENTIFICLAB_URL = "https://github.com/rexautistikonlabs/scientificlab";

export const CHAPTERS: readonly Chapter[] = [
  {
    key: "chronarch",
    name: "Chronarch",
    status: "RUNNING",
    sentences: ["Research software that is running.", "An array of fields, the bridges a group declares between them, programmes as subgraphs, and syntheses that name their parents.", "The programme well, the technician's workbench, one project you can take home."],
    isNot: ["not a public chain", "not Foundation-endorsed", "not a diagnostic"],
    cta: { to: "/chronarch", label: "Open Chronarch" },
  },
  {
    key: "continuum",
    name: "Continuum",
    status: "FORTHCOMING",
    sentences: ["A planned instrument for reading a programme's ledger and register over time.", "Its source lives in the scientificlab repository on GitHub; nothing of it is embedded here, and there is no Continuum route in this app."],
    isNot: ["not embedded here", "not an engine shared with Chronarch"],
    cta: { to: SCIENTIFICLAB_URL, label: "Continuum source", external: true },
  },
  {
    key: "laterion",
    name: "Laterion",
    status: "FORTHCOMING",
    sentences: ["Laterion records facial kinematics including partial trials and laterality.", "It is not a diagnostic, not a person-score, and not an assessment of anyone.", "It is not shipping in this repository: no camera, no image, no landmark code here."],
    isNot: ["not a diagnostic", "not a person-score", "not an assessment of anyone"],
    cta: null,
  },
];

export const FOOTER_RULES: readonly string[] = [
  "RexMetrix is the company. Chronarch is one of its products; the two names are not the same thing.",
  "Each product keeps its own engine and its own refusals; nothing here is one engine wearing three names.",
];
const DOMAIN = "Domain reserved for the RexMetrix landing: rexmetrix.com. This page makes no claim about that domain's DNS.";

function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col" data-testid="hero" aria-label="RexMetrix">
      <div className="hud-strip pointer-events-auto flex flex-wrap items-baseline gap-x-5 gap-y-1 px-6 py-1.5 text-[11px]" data-testid="landing-honesty">
        <span className="hud-label">status</span>
        <span className="text-mute">{HONESTY_LANDING}</span>
      </div>
      <div className="pointer-events-auto flex items-baseline justify-between gap-6 px-6 pt-5">
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="landing-title">RexMetrix</h1>
        <nav aria-label="Products" className="flex items-center gap-5 text-sm" data-testid="landing-nav">
          <Link to="/chronarch" className="text-mute underline-offset-4 hover:text-ivory hover:underline" data-testid="landing-to-chronarch">Chronarch</Link>
          <Link to="/chronarch/tech" className="text-mute underline-offset-4 hover:text-ivory hover:underline" data-testid="landing-to-tech">Workbench</Link>
        </nav>
      </div>
      <p className="readout mt-auto self-start px-6 pb-6 text-[11px] text-dim" data-testid="hero-hint">scroll</p>
    </section>
  );
}

function ChapterBlock({ c, stacked }: { c: Chapter; stacked: boolean }) {
  return (
    <section id={c.key} className={`flex ${stacked ? "py-16" : "min-h-screen items-center justify-end"} px-6`} style={{ scrollMarginTop: "3rem" }} data-testid={`chapter-${c.key}`} data-status={c.status} aria-labelledby={`${c.key}-title`}>
      <div className={`hud-card pointer-events-auto ${stacked ? "w-full max-w-2xl" : "w-full max-w-md"}`}>
        <p className="hud-label">{c.name.toUpperCase()} · {c.status}{c.key === "laterion" ? " · NOT A DIAGNOSTIC" : ""}</p>
        <h2 id={`${c.key}-title`} className="mt-2 text-xl font-semibold text-ivory">{c.name}</h2>
        {c.sentences.map((s) => <p key={s} className="mt-2 text-[14px] leading-relaxed text-mute">{s}</p>)}
        <p className="readout mt-3 text-[11px] text-dim" data-testid={`is-not-${c.key}`}>{c.isNot.join(" · ")}</p>
        {c.cta?.external ? (
          <a href={c.cta.to} target="_blank" rel="noopener noreferrer" className="hud-button mt-4 inline-block" data-testid={`cta-${c.key}`}>{c.cta.label} ↗</a>
        ) : c.cta ? (
          <Link to={c.cta.to} className="hud-button mt-4 inline-block" data-testid={`cta-${c.key}`}>{c.cta.label}</Link>
        ) : null}
        {c.status === "FORTHCOMING" && (
          <p className="readout mt-3 text-[11px] uppercase tracking-wider text-dim" data-testid={`forthcoming-${c.key}`}>forthcoming · no route in this app, no engine here</p>
        )}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="pointer-events-auto border-t hair bg-void/80 px-6 py-6 text-[11px] text-dim" data-testid="landing-footer">
      <ul className="space-y-1" data-testid="landing-rules">{FOOTER_RULES.map((r) => <li key={r}>{r}</li>)}</ul>
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

  // A building is a door (Chronarch) or a bookmark (scroll to its chapter).
  const pick = useCallback((k: BuildingKey) => {
    const b = BUILDINGS.find((x) => x.key === k)!;
    if (b.route) navigate(b.route);
    else document.getElementById(k)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [navigate]);

  return (
    <div data-testid="landing-body" data-mode={campus ? "campus" : reduced ? "reduced-motion" : "no-webgl"}>
      {campus && <Campus progress={progress} onPick={pick} />}
      {/* Over the campus the page is transparent to the pointer except where it has content, so the buildings can be hovered, dragged and clicked. */}
      <div className={campus ? "pointer-events-none relative z-10" : ""}>
        <Hero />
        <div data-testid="chapters">
          {CHAPTERS.map((c) => <ChapterBlock key={c.key} c={c} stacked={!campus} />)}
        </div>
        <Footer />
      </div>
    </div>
  );
}

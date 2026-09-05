/** The well's state: which bench is in focus (from a bench choice on the
 *  floor, or from the route in the technician room), what the pointer hovers,
 *  the one-shot event counter that spikes energy (bloom, grain, iris), and
 *  the ⌘K palette. Nothing here ticks: every change is caused by a person. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { BENCHES, type BenchKey } from "../lib/human";
import type { FocusKey } from "../scene/focus";
import { useProgramme } from "./ProgrammeContext";
import { useSession } from "./SessionContext";

export type EventKind = "record" | "programme" | "bench" | "none";

interface WellCtx {
  focus: FocusKey;
  bench: BenchKey | null;
  hovered: BenchKey | null;
  eventId: number;
  eventKind: EventKind;
  paletteOpen: boolean;
  selectBench: (b: BenchKey | null) => void;
  setHovered: (b: BenchKey | null) => void;
  setPaletteOpen: (open: boolean) => void;
  isTech: boolean;
}

const Ctx = createContext<WellCtx | null>(null);

/** The operator room is one route (plus its old alias). */
export const TECH_PATHS = ["/chronarch/tech", "/tech", "/lab"] as const;

export function isTechPath(pathname: string): boolean {
  return TECH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function benchFocus(bench: BenchKey | null): FocusKey {
  return BENCHES.find((b) => b.key === bench)?.focus ?? "overview";
}

export function WellProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { session } = useSession();
  const { programmeName } = useProgramme();
  const [bench, setBench] = useState<BenchKey | null>(null);
  const [hovered, setHovered] = useState<BenchKey | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [event, setEvent] = useState<{ id: number; kind: EventKind }>({ id: 0, kind: "none" });
  const lastHead = useRef(session.state.head_hash);
  const lastProgramme = useRef(programmeName);

  // A record switch is a one-shot event: energy spikes once, then decays.
  useEffect(() => {
    if (lastHead.current !== session.state.head_hash) {
      lastHead.current = session.state.head_hash;
      setEvent((e) => ({ id: e.id + 1, kind: "record" }));
    }
  }, [session.state.head_hash]);

  // So is a programme switch: the subgraph settles once, then still.
  useEffect(() => {
    if (lastProgramme.current !== programmeName) {
      lastProgramme.current = programmeName;
      setEvent((e) => ({ id: e.id + 1, kind: "programme" }));
    }
  }, [programmeName]);

  const selectBench = useCallback((b: BenchKey | null) => {
    setBench(b);
    if (b !== null) setEvent((e) => ({ id: e.id + 1, kind: "bench" }));
  }, []);

  const tech = isTechPath(pathname);
  const focus: FocusKey = tech ? "overview" : benchFocus(bench);

  const value = useMemo<WellCtx>(
    () => ({ focus, bench, hovered, eventId: event.id, eventKind: event.kind, paletteOpen, selectBench, setHovered, setPaletteOpen, isTech: tech }),
    [focus, bench, hovered, event, paletteOpen, selectBench, tech],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWell(): WellCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWell outside WellProvider");
  return ctx;
}

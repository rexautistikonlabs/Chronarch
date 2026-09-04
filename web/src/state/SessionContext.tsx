/** Session state for the whole app: one loaded session (a fixture or pasted
 *  JSON) drives every page's readouts and the scene. Nothing here talks to a
 *  filesystem or a process — fixtures are imported statically at build time. */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import opaFixture from "../../fixtures/session-opa.json";
import soloFixture from "../../fixtures/session-solo.json";
import { parseSession, sessionFromJson, type Session } from "../lib/session";

export const FIXTURES = {
  "session-solo.json": soloFixture,
  "session-opa.json": opaFixture,
} as const;
export type FixtureName = keyof typeof FIXTURES;

interface SessionCtx {
  session: Session;
  source: string; // "fixture: session-solo.json" | "pasted JSON"
  error: string | null;
  loadFixture: (name: FixtureName) => void;
  loadText: (text: string) => boolean;
}

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children, initial = "session-solo.json" }: { children: ReactNode; initial?: FixtureName }) {
  const [session, setSession] = useState<Session>(() => sessionFromJson(FIXTURES[initial]));
  const [source, setSource] = useState<string>(`fixture: ${initial}`);
  const [error, setError] = useState<string | null>(null);

  const loadFixture = useCallback((name: FixtureName) => {
    setSession(sessionFromJson(FIXTURES[name]));
    setSource(`fixture: ${name}`);
    setError(null);
  }, []);

  const loadText = useCallback((text: string) => {
    try {
      setSession(parseSession(text));
      setSource("pasted JSON");
      setError(null);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }, []);

  const value = useMemo(() => ({ session, source, error, loadFixture, loadText }), [session, source, error, loadFixture, loadText]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession outside SessionProvider");
  return ctx;
}

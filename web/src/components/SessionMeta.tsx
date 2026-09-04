import { useSession } from "../state/SessionContext";

export function SessionMeta() {
  const { session, source } = useSession();
  return (
    <p className="readout text-[11px] text-dim" data-testid="session-source">
      source: {source} · {session.label}{session.focus_home ? ` · focus ${session.focus_home}` : ""}
    </p>
  );
}

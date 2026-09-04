import { useSession } from "../state/SessionContext";
import { assertHonest } from "../lib/banned";

/** The honesty line, on every page, above the fold. The sentence is fixed
 *  copy; the longer paragraph comes from the session's own `chronarch status`
 *  output when present (screened for banned language before display). */
export const HONESTY = "Chronarch lab-v0 is a research organism on an in-process or loopback net. It is not a public blockchain.";

export function StatusBanner() {
  const { session } = useSession();
  return (
    <div className="border-b hair bg-ink" data-testid="status-banner">
      <div className="mx-auto flex max-w-7xl flex-wrap items-baseline gap-x-6 gap-y-1 px-5 py-2 text-xs">
        <span className="readout uppercase tracking-wider text-dim">status</span>
        <span className="text-mute">{HONESTY}</span>
        {session.status && (
          <span className="readout text-dim" title={assertHonest(session.status.status)}>
            {session.status.lab} · not_a_public_blockchain={String(session.status.not_a_public_blockchain)}
          </span>
        )}
      </div>
    </div>
  );
}

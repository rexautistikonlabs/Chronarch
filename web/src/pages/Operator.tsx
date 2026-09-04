import { NotList, PageHeader, Section } from "../components/Page";
import { SessionMeta } from "../components/SessionMeta";
import { useSession } from "../state/SessionContext";

export function Operator() {
  const { session } = useSession();
  return (
    <div>
      <PageHeader eyebrow="specs/OPERATOR.md · a test, not prose" title="Operator path" lede="Pulse a home, stand up a two-home net, propose a peer-set change, ballot it from each steward, tally and ratify onto every home, read status, pulse again. The same sequence runs as tests/test_operator_path.py. Below is the loaded session's literal command log — each step is the JSON the CLI printed." />
      <SessionMeta />
      <Section title={`command log · ${session.steps.length} step${session.steps.length === 1 ? "" : "s"}`}>
        {session.steps.length === 0 ? (
          <p>The loaded input was a single CLI output, not a session envelope; load <code className="readout text-ivory">session-opa.json</code> in the Lab console to see the full path.</p>
        ) : (
          <ol className="space-y-3">
            {session.steps.map((step, i) => (
              <li key={i} className="border hair bg-ink">
                <div className="flex flex-wrap items-baseline gap-3 border-b hair px-3 py-2">
                  <span className="readout text-xs text-dim">{String(i + 1).padStart(2, "0")}</span>
                  <code className="readout text-xs text-ivory">{step.cmd}</code>
                  {step.home && <span className="readout text-[10px] uppercase tracking-wider text-dim">home {step.home}</span>}
                  <span className={`readout ml-auto text-[10px] uppercase tracking-wider ${step.output.ok ? "text-verdigris" : "text-ivory"}`}>{step.output.ok ? "ok" : step.output.error_code ?? "error"}</span>
                </div>
                <pre className="readout overflow-x-auto px-3 py-2 text-[11px] leading-snug text-mute">{JSON.stringify(step.output.result ?? step.output, null, 2)}</pre>
              </li>
            ))}
          </ol>
        )}
      </Section>
      <Section title="what the path is not">
        <NotList items={["a deployment — two homes on an in-process bus or loopback TCP, on one machine", "peer discovery — the fleet is a voted peers.json, and a home never farms a fleet that disagrees with what it is", "run by this page — the log is a fixture or pasted JSON; the browser spawns nothing"]} />
      </Section>
    </div>
  );
}

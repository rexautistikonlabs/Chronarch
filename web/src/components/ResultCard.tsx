/** The readable result: an AnalysisNote in eight sections — question, objects,
 *  what was compared, findings, assumptions used, what would falsify this
 *  reading, what this is not, appendix (bar + closed JSON). A refusal shows
 *  its code and the selected parents. Numbers are token counts; nothing here
 *  is a finding a model wrote. */
import type { AnalysisNote } from "../lib/analysisNote";
import type { BenchResult } from "../lib/bench";
import { percent, type PairMetrics } from "../lib/metrics";

export function ResultCard({ result, note }: { result: BenchResult; note: AnalysisNote | null }) {
  const head = result.ok ? `${result.action} · kind ${result.child.kind} · ok` : `${result.action} · ${result.code}`;
  return (
    <article className="border hair bg-ink p-4" data-testid="result-card" data-ok={String(result.ok)}>
      <p className="readout text-xs" data-testid="result-status">
        <span className={result.ok ? "text-verdigris" : "text-ivory"}>{result.ok ? "ok" : "refused"}</span> · {head}
      </p>
      {!result.ok && <p className="mt-1 text-xs text-mute" data-testid="result-detail">{result.detail}</p>}

      {result.ok && note && (
        <>
          <NoteSection n={1} title="Question" testId="note-question">
            <p className="text-sm leading-relaxed text-ivory">{note.question}</p>
          </NoteSection>
        </>
      )}

      {result.parents.length > 0 && (
        <NoteSection n={2} title="Objects" testId="note-objects">
          <div className="grid gap-3 sm:grid-cols-2" data-testid="result-parents">
            {result.parents.map((p, i) => (
              <div key={p.id} className="border hair p-3" data-testid={`parent-${p.id}`}>
                <p className="text-sm text-ivory">{p.title}</p>
                <p className="readout mt-1 text-[11px] text-dim">{p.field} · {p.license}{note ? ` · role ${note.objects[i]?.role ?? "—"}` : ""}</p>
                {p.snippet ? <p className="mt-2 text-[12px] leading-snug text-mute">{p.snippet}</p> : <p className="readout mt-2 text-[11px] text-dim">no body — a citation only</p>}
              </div>
            ))}
          </div>
        </NoteSection>
      )}

      {result.ok && note && (
        <>
          <NoteSection n={3} title="What was compared" testId="note-compared">
            <ul className="readout space-y-0.5 text-[11px] text-mute">
              <li>path: {note.compared.path.length ? note.compared.path.join(" → ") : "none — parents share one field"}</li>
              <li>grants: {note.compared.grants.length ? note.compared.grants.join(", ") : "none needed"}</li>
              <li data-testid="metric-line">
                metric:{" "}
                {note.compared.tokens ? <><span data-testid="jaccard">{percent(note.compared.tokens.jaccard)}</span> Jaccard · {note.compared.tokens.shared.length} shared · {note.compared.tokens.onlyLeft.length} only left · {note.compared.tokens.onlyRight.length} only right</> : "none — a body is missing, so no token comparison was made"}
              </li>
            </ul>
          </NoteSection>

          <NoteSection n={4} title="Findings" testId="note-findings">
            {note.findings.length === 0 ? (
              <p className="text-xs text-dim">No findings: a stub is among the parents, so no body supports one. The question above is the whole result.</p>
            ) : (
              <ul className="space-y-1.5 text-[13px] leading-relaxed text-mute">
                {note.findings.map((f, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="readout text-dim">·</span>
                    <span>
                      {f.text} <span className="readout text-[10px] text-dim">[{f.cites.join(", ")}]</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {note.kind === "match" && <p className="readout mt-2 text-[11px] text-dim">lexical overlap only.</p>}
            {note.kind === "couple" && <p className="readout mt-2 text-[11px] text-dim" data-testid="couple-caption">lexical overlap only — not a fitted model.</p>}
          </NoteSection>

          <NoteSection n={5} title="Assumptions used" testId="note-assumptions">
            {note.assumptions_used.length === 0 ? (
              <p className="text-xs text-dim">none declared on these pins</p>
            ) : (
              <ul className="readout grid gap-0.5 text-[11px] text-mute sm:grid-cols-2">
                {note.assumptions_used.map((a) => (
                  <li key={a.id}><span className="text-ivory">{a.id}</span>{a.rating ? ` · ${a.rating}` : ""} — {a.text}</li>
                ))}
              </ul>
            )}
          </NoteSection>

          <NoteSection n={6} title="What would falsify this reading" testId="note-falsify">
            <p className="text-[13px] leading-relaxed text-mute">{note.would_falsify}</p>
          </NoteSection>

          <NoteSection n={7} title="What this is not" testId="note-is-not">
            <ul className="readout flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-mute">
              {note.is_not.map((s) => <li key={s}>{s}</li>)}
            </ul>
          </NoteSection>

          <NoteSection n={8} title="Appendix" testId="note-appendix">
            {result.metrics && <OverlapBar metrics={result.metrics} />}
            <details className="mt-3 border hair" data-testid="result-json">
              <summary className="readout cursor-pointer px-3 py-1.5 text-[11px] uppercase tracking-wider text-dim">child pin + note (json)</summary>
              <pre className="readout overflow-auto px-3 pb-3 text-[11px] leading-snug text-mute" style={{ maxHeight: 360 }} data-testid="result-child">{JSON.stringify({ child: result.child, note }, null, 2)}</pre>
            </details>
          </NoteSection>
        </>
      )}
    </article>
  );
}

function NoteSection({ n, title, testId, children }: { n: number; title: string; testId: string; children: React.ReactNode }) {
  return (
    <section className="mt-4" data-testid={testId}>
      <h3 className="readout text-[11px] uppercase tracking-wider text-dim">
        <span className="text-phosphor">{n}</span> · {title}
      </h3>
      <div className="mt-1">{children}</div>
    </section>
  );
}

function OverlapBar({ metrics }: { metrics: PairMetrics }) {
  const s = metrics.shared.length;
  const l = metrics.onlyLeft.length;
  const r = metrics.onlyRight.length;
  const total = Math.max(1, s + l + r);
  const w = (n: number) => (n / total) * 100;
  return (
    <div data-testid="overlap-bar">
      <p className="readout text-[11px] text-mute">{s} shared · {l} only left · {r} only right · Jaccard {percent(metrics.jaccard)}</p>
      <svg viewBox="0 0 100 6" preserveAspectRatio="none" className="mt-1 h-2 w-full" role="img" aria-label={`${s} shared, ${l} only left, ${r} only right`}>
        <rect x="0" y="0" width={w(l)} height="6" fill="#4e8f63" />
        <rect x={w(l)} y="0" width={w(s)} height="6" fill="#9ef0b4" />
        <rect x={w(l) + w(s)} y="0" width={w(r)} height="6" fill="#4e8f63" opacity="0.6" />
      </svg>
      <p className="readout mt-1 text-[11px] text-dim">
        {metrics.shared.slice(0, 12).join(" · ")}
        {metrics.shared.length > 12 ? " · …" : ""}
      </p>
    </div>
  );
}

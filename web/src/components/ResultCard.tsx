/** The readable result: what was compared, what it says, and only then the
 *  JSON. Numbers are token counts and a Jaccard ratio — never a finding, never
 *  a fitted model. No percent is shown unless both parents have a body. */
import { type BenchResult } from "../lib/bench";
import { percent } from "../lib/metrics";

export function ResultCard({ result }: { result: BenchResult }) {
  const head = result.ok ? `${result.action} · kind ${result.child.kind} · ok` : `${result.action} · ${result.code}`;
  return (
    <div className="border hair bg-ink p-4" data-testid="result-card" data-ok={String(result.ok)}>
      <p className="readout text-xs" data-testid="result-status">
        <span className={result.ok ? "text-verdigris" : "text-ivory"}>{result.ok ? "ok" : "refused"}</span> · {head}
      </p>
      {!result.ok && <p className="mt-1 text-xs text-mute" data-testid="result-detail">{result.detail}</p>}

      {result.parents.length > 0 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2" data-testid="result-parents">
          {result.parents.map((p) => (
            <div key={p.id} className="border hair p-3" data-testid={`parent-${p.id}`}>
              <p className="text-sm text-ivory">{p.title}</p>
              <p className="readout mt-1 text-[11px] text-dim">{p.field} · {p.license}</p>
              {p.snippet ? <p className="mt-2 text-[12px] leading-snug text-mute">{p.snippet}</p> : <p className="readout mt-2 text-[11px] text-dim">no body — a citation only</p>}
            </div>
          ))}
        </div>
      )}

      {result.ok && result.metrics && <OverlapBar metrics={result.metrics} kind={result.child.kind} />}

      {result.ok && result.question && (
        <p className="mt-3 text-sm leading-relaxed text-ivory" data-testid="result-question">{result.question}</p>
      )}

      {result.ok && (
        <details className="mt-3 border hair" data-testid="result-json">
          <summary className="readout cursor-pointer px-3 py-1.5 text-[11px] uppercase tracking-wider text-dim">child pin (json)</summary>
          <pre className="readout overflow-auto px-3 pb-3 text-[11px] leading-snug text-mute" style={{ maxHeight: 320 }} data-testid="result-child">{JSON.stringify(result.child, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}

function OverlapBar({ metrics, kind }: { metrics: NonNullable<import("../lib/bench").BenchOk["metrics"]>; kind: string }) {
  const s = metrics.shared.length;
  const l = metrics.onlyLeft.length;
  const r = metrics.onlyRight.length;
  const total = Math.max(1, s + l + r);
  const w = (n: number) => (n / total) * 100;
  return (
    <div className="mt-3" data-testid="overlap-bar">
      <p className="readout text-xs text-ivory">
        <span data-testid="jaccard">{percent(metrics.jaccard)}</span> shared tokens (Jaccard) · {s} shared · {l} only left · {r} only right
      </p>
      <svg viewBox="0 0 100 6" preserveAspectRatio="none" className="mt-1 h-2 w-full" role="img" aria-label={`${s} shared, ${l} only left, ${r} only right`}>
        <rect x="0" y="0" width={w(l)} height="6" fill="#4e8f63" />
        <rect x={w(l)} y="0" width={w(s)} height="6" fill="#9ef0b4" />
        <rect x={w(l) + w(s)} y="0" width={w(r)} height="6" fill="#4e8f63" opacity="0.6" />
      </svg>
      <p className="readout mt-1 text-[11px] text-dim">
        {metrics.shared.slice(0, 12).join(" · ")}
        {metrics.shared.length > 12 ? " · …" : ""}
      </p>
      {kind === "couple" && <p className="mt-1 text-[11px] text-dim" data-testid="couple-caption">lexical overlap only — not a fitted model.</p>}
    </div>
  );
}

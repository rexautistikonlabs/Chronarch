/** The field–bridge mini-graph: nodes are the fields of the loaded
 *  catalogues, edges are declared LIVE bridges only. Selected works' fields
 *  are highlighted; a field pair the current selection needs but no bridge
 *  joins is drawn as a dashed gap and named in a caption. Static SVG — no
 *  physics, no R3F, no motion. Clicking a node filters the table. */
import type { Catalogue } from "../lib/programme";

export function FieldGraph({ cat, highlighted, missing, activeField, onPickField }: {
  cat: Catalogue;
  highlighted: ReadonlySet<string>;
  missing: [string, string] | null;
  activeField: string | null;
  onPickField: (field: string | null) => void;
}) {
  const fields = [...cat.fields.keys()].sort();
  const W = 720;
  const H = 240;
  const cx = W / 2;
  const cy = H / 2;
  const rx = W / 2 - 70;
  const ry = H / 2 - 30;
  const pos = new Map<string, [number, number]>();
  fields.forEach((f, i) => {
    const a = -Math.PI / 2 + (i / fields.length) * Math.PI * 2;
    pos.set(f, [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  });
  const live = [...cat.bridges.values()].filter((b) => b.status === "live");
  const p = (f: string) => pos.get(f) ?? [cx, cy];

  return (
    <figure className="border hair bg-ink p-3" data-testid="field-graph">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${fields.length} fields, ${live.length} live bridges`}>
        {live.map((b) => {
          const [x1, y1] = p(b.left);
          const [x2, y2] = p(b.right);
          const hot = highlighted.has(b.left) && highlighted.has(b.right);
          return <line key={b.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke={hot ? "#9ef0b4" : "#4e8f63"} strokeWidth={hot ? 2.2 : 1.2} opacity={hot ? 1 : 0.7} data-testid={`edge-${b.id}`} data-edge={`${b.left}—${b.right}`} />;
        })}
        {missing && (
          <line x1={p(missing[0])[0]} y1={p(missing[0])[1]} x2={p(missing[1])[0]} y2={p(missing[1])[1]} stroke="#8a949e" strokeWidth={1.4} strokeDasharray="4 4" data-testid="missing-edge" />
        )}
        {fields.map((f) => {
          const [x, y] = p(f);
          const hot = highlighted.has(f);
          const active = activeField === f;
          return (
            <g key={f} onClick={() => onPickField(active ? null : f)} style={{ cursor: "pointer" }} data-testid={`node-${f}`} role="button" aria-label={`filter by field ${f}`}>
              <circle cx={x} cy={y} r={hot ? 7 : 5} fill={hot ? "#9ef0b4" : "#0b0f14"} stroke={active ? "#e8e4da" : hot ? "#9ef0b4" : "#9aa3ad"} strokeWidth={active ? 2 : 1.2} />
              <text x={x} y={y + (y < cy ? -12 : 20)} textAnchor="middle" fontSize={10} fontFamily="IBM Plex Mono, monospace" fill={hot ? "#9ef0b4" : "#8a949e"}>{f}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="readout mt-1 flex flex-wrap gap-x-4 text-[11px] text-dim">
        <span>{fields.length} fields · {live.length} live bridges · edges are declared bridges only</span>
        {missing && <span className="text-ivory" data-testid="missing-caption">missing: {missing[0]} — {missing[1]}</span>}
        {activeField && <span>table filtered to {activeField} · click the node again to clear</span>}
      </figcaption>
    </figure>
  );
}

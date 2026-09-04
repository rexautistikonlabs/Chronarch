/** Deterministic token metrics for a pair of bodies. Lowercase [a-z0-9]+
 *  tokens, set semantics, Jaccard. Same inputs → same outputs; nothing here is
 *  a model, a weighting, or a finding — it counts words two texts share. */

export function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

export interface PairMetrics {
  leftCount: number;
  rightCount: number;
  shared: string[];
  onlyLeft: string[];
  onlyRight: string[];
  jaccard: number; // |A ∩ B| / |A ∪ B|, 0 when both are empty
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function comparePair(left: string, right: string): PairMetrics {
  const a = tokenize(left);
  const b = tokenize(right);
  const shared = [...a].filter((t) => b.has(t)).sort();
  const onlyLeft = [...a].filter((t) => !b.has(t)).sort();
  const onlyRight = [...b].filter((t) => !a.has(t)).sort();
  return { leftCount: a.size, rightCount: b.size, shared, onlyLeft, onlyRight, jaccard: jaccard(a, b) };
}

/** A whole percent, for display only; the number of record is `jaccard`. */
export function percent(j: number): string {
  return `${Math.round(j * 100)}%`;
}

export function snippet(text: string, n = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, n).trimEnd()}…`;
}

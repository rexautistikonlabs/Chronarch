export function fmtInt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US");
}

/** Chronons as a plain integer string with thin-space grouping; never a
 *  currency, never a price. */
export function fmtChronons(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

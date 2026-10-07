/** Export a note as Markdown: the eight sections, attributions, source
 *  URLs, the Jaccard line and the is_not list. Pure text; no network. */
import { RECORD_CAPTION, type AnalysisNote } from "./analysisNote";
import type { BenchOk } from "./bench";
import { percent } from "./metrics";

export function noteToMarkdown(result: BenchOk, note: AnalysisNote): string {
  const L: string[] = [];
  L.push(`# Chronarch note — ${note.job} · ${note.kind} · ${note.ok ? "ok" : "refused"}`);
  L.push("");
  L.push(`Child pin: \`${note.appendix.child_id}\``);
  L.push("");
  L.push("## 1. Question");
  L.push(note.question);
  L.push("");
  L.push("## 2. Objects");
  for (const p of result.parents) {
    L.push(`- **${p.title}** — field \`${p.field}\`, licence \`${p.license}\`, role ${note.objects.find((o) => o.work_id === p.id)?.role ?? "—"}`);
    if (p.attribution) L.push(`  - attribution: ${p.attribution}`);
    if (p.source_url) L.push(`  - source: ${p.source_url}`);
    L.push(`  - ${p.snippet ? `excerpt: “${p.snippet}”` : "no body — a citation only"}`);
  }
  L.push("");
  L.push("## 3. What was compared");
  L.push(`- path: ${note.compared.path.length ? note.compared.path.join(" → ") : "none — parents share one field"}`);
  L.push(`- grants: ${note.compared.grants.length ? note.compared.grants.join(", ") : "none needed"}`);
  const t = note.compared.tokens;
  L.push(`- Jaccard: ${t ? `${percent(t.jaccard)} (${t.shared.length} shared · ${t.onlyLeft.length} only left · ${t.onlyRight.length} only right)` : "none — a body is missing, so no token comparison was made"}`);
  if (note.intermediary_status ?? null) {
    const id = note.identifiability;
    L.push(`- reading record (${RECORD_CAPTION}): mode ${note.mode ?? "—"} · intermediary_status ${note.intermediary_status}`);
    L.push(`  - identifiability: ${id === "not_identified" ? "not_identified" : id ? `contrast “${id.contrast}”; nominal input held fixed: ${id.nominal_input_held_fixed}; covariates held fixed: ${id.covariates_held_fixed.join(", ") || "none"}` : "—"}`);
    const c = note.comparison;
    L.push(`  - comparison: ${c ? `published covariate set ${c.published_covariate_set.join(", ")}; added parameter ${c.added_parameter}; locked metric ${c.locked_metric}; threshold ${String(c.threshold)}; threshold fixed before run: ${String(c.threshold_fixed_before_run)}` : "none"}`);
  } else if (note.kind !== "question") {
    L.push("- reading record: none on this note");
  }
  L.push("");
  L.push("## 4. Findings");
  if (note.findings.length === 0) L.push("No findings: a stub is among the parents, so no body supports one. The question above is the whole result.");
  for (const f of note.findings) L.push(`- ${f.text} [${f.cites.join(", ")}]`);
  L.push("");
  L.push("## 5. Assumptions used");
  if (note.assumptions_used.length === 0) L.push("none declared on these pins");
  for (const a of note.assumptions_used) L.push(`- ${a.id}${a.rating ? ` · ${a.rating}` : ""} — ${a.text}`);
  L.push("");
  L.push("## 6. What would falsify this reading");
  L.push(note.would_falsify);
  L.push("");
  L.push("## 7. What this is not");
  for (const s of note.is_not) L.push(`- ${s}`);
  L.push("");
  L.push("## 8. Appendix");
  if (t) L.push(`- shared tokens: ${t.shared.join(", ") || "—"}`);
  for (const s of note.appendix.snippets) L.push(`- ${s.id}: “${s.text}”`);
  L.push("");
  L.push("_Built in code by Chronarch, a RexMetrix product, from the works, the token metrics and the accepted child pin. No model wrote this._");
  return L.join("\n");
}

export function markdownFilename(note: AnalysisNote): string {
  return `chronarch-${note.job}-${note.appendix.child_id}.md`;
}

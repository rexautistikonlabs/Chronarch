import { Link } from "react-router-dom";

import { NotList, PageHeader, Section } from "../components/Page";

/** About RexMetrix — what it is, what Programme Zero is, what will not ship.
 *  Visitor-facing: the same bans that govern the floor govern this page. */
export function About() {
  return (
    <div>
      <PageHeader eyebrow="about" title="RexMetrix" lede="Institutional research software for hypothesis-led groups and institutions. A group maintains an array of fields — the literatures it works in — declares bridges between chosen fields, and runs programmes that are subgraphs of that catalogue. Synthesis jobs write child pins with explicit parents and a declared path of bridges." />

      <Section title="what a tenant gets">
        <ul className="space-y-1">
          <li><span className="text-ivory">Fields</span> — each with units, a sector and an anti-overreach pack: claims its data may never be made to carry, enforced as refusals.</li>
          <li><span className="text-ivory">Bridges</span> — first-class edges between exactly two fields that share no units: a bridge statement, a rated assumption ledger, a falsification register with costs and no rescue.</li>
          <li><span className="text-ivory">Programmes</span> — a chosen subgraph with a locked array, a ledger, a register, and a stop rule with a clock. Changes are amendments; the old claim stays beside the new.</li>
          <li><span className="text-ivory">Synthesis</span> — overlap, match, couple, question: a child pin with named parents and a declared path or clique of live bridges. A missing edge is refused.</li>
          <li><span className="text-ivory">Quota, not coin</span> — what a tenant may hold is a plan's quota of programmes, jobs and pins. There is no currency here.</li>
        </ul>
      </Section>

      <Section title="programme zero — the example programme">
        <p>The first filled template is Rex Autistikon / Kim 2026, <em>Tissue Mechanics…</em>: a two-field programme with its method and control documents. It is the <span className="text-ivory">example programme and first corpus</span>, not the product and not the only science. What travels from it is the method — bridge statement, locked array, rated ledger, falsification register, stop clock, deviations and amendments, the scale rule, anti-overreach as errors. Its content does not: no other field inherits its measured array or its vocabulary.</p>
        <p className="mt-2">The volume's prose is the author's copyright. This site carries the structure of its control documents in its own words and short cited phrases only. Its corpus field is at arm's length: a written grant must exist before its pins parent a RexMetrix child.</p>
      </Section>

      <Section title="what rexmetrix will not ship">
        <NotList items={[
          "a clinical, diagnostic or therapeutic claim, or a tool for one",
          "an individual-level score on the Programme Zero construct — demo code refuses (INDIVIDUAL_SCORE_FORBIDDEN)",
          "a derived index, scoring algorithm or assessment instrument",
          "an endorsement by any Foundation, stated or implied",
          "a description of Programme Zero as a fascia framework, or of listening material as an intervention",
          "a public chain, a coin, an account that holds anything, or on-chain anything — the internal substrate is not the product",
        ]} />
        <p className="mt-3 text-xs text-dim">The written rules: <code className="readout">specs/PRODUCT.md</code>, <code className="readout">specs/LEGAL.md</code>, <code className="readout">specs/SYNTHESIS.md</code>. The substrate's own readouts are in the <Link to="/tech" className="text-mute underline underline-offset-2 hover:text-ivory">technician room</Link>.</p>
      </Section>
    </div>
  );
}

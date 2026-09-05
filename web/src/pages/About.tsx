import { Link } from "react-router-dom";

import { NotList, PageHeader, Section } from "../components/Page";

/** About Chronarch — the tool first, then the starter corpora, then the example corpus, then what will not ship.
 *  Chronarch is one product of RexMetrix, the product house; this page is
 *  about the product. Visitor-facing: the floor's bans govern it. */
export function About() {
  return (
    <div>
      <PageHeader eyebrow="about · a RexMetrix product" title="Chronarch" lede="A local workbench for a group: declare the fields you work in, declare the bridges between them, pin the sources you have rights to, and write a synthesis whose child names its parents and the bridges it crossed. Refusals are law: a missing bridge, a missing licence or a person-level score is refused, not warned about." />

      <Section title="what you get">
        <ul className="space-y-1">
          <li><span className="text-ivory">Fields</span> — each with units, a sector and an anti-overreach pack: claims its data may never be made to carry, enforced as refusals.</li>
          <li><span className="text-ivory">Bridges</span> — first-class edges between exactly two fields that share no units: a bridge statement, a rated assumption ledger, a falsification register with costs and no rescue. A session may declare its own, marked as an operator's amendment.</li>
          <li><span className="text-ivory">Pinned sources</span> — works enter only with a licence; full text only under a licence that allows it and a rights declaration; a URL is a citation, never fetched. Bodies are excerpts, capped.</li>
          <li><span className="text-ivory">Named-parent synthesis</span> — overlap, match, couple, question: a child pin with named parents and a declared path or clique of live bridges, written as an eight-section note you can export. A missing edge is refused.</li>
          <li><span className="text-ivory">One project, in your browser</span> — works used, bridges, notes, one Markdown pack; saved in this browser only and portable as a file. No accounts, no server.</li>
        </ul>
      </Section>

      <Section title="starter corpora">
        <p>A cold workbench opens on <span className="text-ivory">Classics</span>: six fields and three bridges over public-domain and US-government excerpts — Darwin, Newton, Faraday, Maxwell, Mendel, a NIST technical note — each row with its licence, its source URL and its attribution. A <span className="text-ivory">Toy programme</span> of invented fields shows the mechanics with nothing real. Every starter row is public-domain, Creative Commons or US-government; nothing is scraped and no publisher PDF is stored.</p>
      </Section>

      <Section title="example corpus — programme zero">
        <p>Programme Zero (Rex Autistikon / Kim 2026, <em>Tissue Mechanics…</em>) is an <span className="text-ivory">example template, an example programme and first corpus</span>: two fields, one bridge, and the structure of its control documents in this site's own words. It is a chip labelled "example corpus — not the product"; it is never the default. The volume's prose is the author's copyright; its corpus field is at arm's length, so a written grant must exist before its pins parent a Chronarch child.</p>
      </Section>

      <Section title="what chronarch will not ship">
        <NotList items={[
          "a clinical, diagnostic or therapeutic claim, or a tool for one",
          "an individual-level score on the Programme Zero construct — demo code refuses (INDIVIDUAL_SCORE_FORBIDDEN)",
          "a derived index, scoring algorithm or assessment instrument",
          "an endorsement by any Foundation, stated or implied",
          "a description of Programme Zero as a fascia framework, or of listening material as an intervention",
          "a public chain, a coin, an account that holds anything, or on-chain anything — the internal substrate is not the product",
        ]} />
        <p className="mt-3 text-xs text-dim">The written rules: <code className="readout">specs/PRODUCT.md</code>, <code className="readout">specs/LEGAL.md</code>, <code className="readout">specs/SYNTHESIS.md</code>. The substrate's own readouts are in the <Link to="/chronarch/tech" className="text-mute underline underline-offset-2 hover:text-ivory">technician room</Link>. The company and its other products: <Link to="/" className="text-mute underline underline-offset-2 hover:text-ivory">RexMetrix</Link>.</p>
      </Section>
    </div>
  );
}

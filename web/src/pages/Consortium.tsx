import { Link } from "react-router-dom";

import { NotList, PageHeader, Section } from "../components/Page";

/** Technician-room copy of the product and legal line, for operators. The
 *  visitor version is /about. */
export function Consortium() {
  return (
    <div>
      <PageHeader eyebrow="for research groups" title="RexMetrix, for institutions" lede="RexMetrix is studied and used, not sold as an asset. A group joins by running the lab, reading the written rules, and maintaining its own fields, bridges and programmes. Programme Zero (Rex Autistikon / Kim 2026) is the example programme and first corpus; its prose is the author's copyright, and its corpus field is at arm's length." />
      <Section title="the written rules">
        <ul className="space-y-1">
          <li><code className="readout text-ivory">specs/PRODUCT.md</code> — the product: fields, bridges, programmes, synthesis; quota not coin; the substrate is internal code.</li>
          <li><code className="readout text-ivory">specs/FIELDS.md</code>, <code className="readout text-ivory">specs/BRIDGES.md</code>, <code className="readout text-ivory">specs/PROGRAMMES.md</code>, <code className="readout text-ivory">specs/SYNTHESIS.md</code> — the objects and the refusals.</li>
          <li><code className="readout text-ivory">specs/LEGAL.md</code> — what the volume allows, and what RexMetrix will not ship.</li>
        </ul>
      </Section>
      <Section title="the substrate (operators)">
        <p>Under the product sits a research substrate with an append-only history, forbidden-key screening and a fail-closed replay. Its readouts — heights, hashes, the operator path — are here in the technician room for whoever runs a lab session. They are not the product and they are not offered to visitors as anything to hold.</p>
      </Section>
      <Section title="what joining is not">
        <NotList items={["buying an asset — there is no sale, no allocation, no price", "an endorsement by any Foundation", "a clinical or diagnostic tool", "running a public node — the substrate is in-process or loopback only"]} />
        <p className="mt-3 text-xs text-dim">The visitor's version of this page: <Link to="/about" className="text-mute underline underline-offset-2 hover:text-ivory">About RexMetrix</Link>.</p>
      </Section>
    </div>
  );
}

import { NotList, PageHeader, Section } from "../components/Page";

export function Consortium() {
  return (
    <div>
      <PageHeader eyebrow="for research groups" title="Consortium" lede="Chronarch is studied, not sold. A research group joins by running the lab, reading the law, and — if it has a change — writing a Proposal and standing a Ballot. This page says how, and what a lab tag is." />
      <Section title="what a lab session is">
        <ol className="list-decimal space-y-2 pl-5">
          <li><code className="readout text-ivory">pip install -e ".[dev]"</code> in a clean venv brings up all eleven workspace packages and the <code className="readout text-ivory">chronarch</code> command; <code className="readout text-ivory">pytest</code> must be green.</li>
          <li><code className="readout text-ivory">chronarch pulse --home DIR</code> farms, pin-checks, attests a DummyMind job and credits Chronos on a home; <code className="readout text-ivory">chronarch memory --home DIR</code> reads back what the home remembers.</li>
          <li>The operator path (two homes, one voted peer change) is a numbered sequence in <code className="readout text-ivory">specs/OPERATOR.md</code> and runs as a test. Its captured output is this site's <code className="readout text-ivory">session-opa.json</code> fixture.</li>
          <li>A lab tag (<code className="readout text-ivory">lab-v0</code>) is a git tag on a green, hash-pinned state — a research freeze, not a release.</li>
        </ol>
      </Section>
      <Section title="how a change happens">
        <p>The frozen surface — genesis hashes, kernel, admission, challenge, the lottery, the .cseal layout, the Hearth clamp, G14, the reward split, attest_compute, council tally and lien — changes only by a Proposal ring plus a slashing-backed Ballot (G14). There is no admin key to ask for. A group that wants a change drafts the proposal, gets it ballotted by the seats, and lets the tally decide; an illegal ratification slashes and scars.</p>
      </Section>
      <Section title="reading order">
        <ul className="space-y-1">
          <li><code className="readout text-ivory">specs/STATUS.md</code> — what is frozen and what is live; what lab-v0 is not.</li>
          <li><code className="readout text-ivory">docs/LAB.md</code> — the lab session: pulse, memory, the operator path.</li>
          <li><code className="readout text-ivory">specs/GENESIS.md</code> — the law (G1–G18) and the covenant.</li>
          <li><code className="readout text-ivory">specs/ARCHITECTURE.md</code>, <code className="readout text-ivory">specs/THREATS.md</code> — the design and what it is built to refuse.</li>
        </ul>
      </Section>
      <Section title="what joining is not">
        <NotList items={["buying in — there is no token sale, no allocation, no price", "connecting a wallet — there is nothing to connect to", "running a public node — lab-v0 is in-process or loopback only", "partnering with a foundation — there is a research organism and its law, and a Council"]} />
      </Section>
    </div>
  );
}

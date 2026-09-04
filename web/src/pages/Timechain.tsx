import { NotList, PageHeader, Section } from "../components/Page";
import { StatBar } from "../components/StatBar";
import { shortHash } from "../lib/session";
import { useSession } from "../state/SessionContext";

export function Timechain() {
  const { session } = useSession();
  const s = session.state;
  return (
    <div>
      <PageHeader eyebrow="G1 · G5" title="Timechain" lede="Append-only, hash-linked rings. Correction is a new ring or a scar; there is no mutation API, and a mutated stored ring fails verification. A scar is a sealed lesion on a rim: it can be retired by a later ring after a Council review (M7), never deleted." />
      <div className="mt-4"><StatBar state={s} /></div>
      <Section title="reading the stack">
        <p>{s.ring_count} ring{s.ring_count === 1 ? "" : "s"} including Ring 0 at height {s.height}; head {shortHash(s.head_hash, 16)}. {s.scar_count === 0 ? "No scar on this chain — no rim is amber." : `${s.scar_count} scar${s.scar_count === 1 ? "" : "s"}: each is an amber lesion on the rim of the ring that sealed it.`} The stack's lean and each ring's seam are seeded from the head hash, so two chains never rest the same way.</p>
      </Section>
      <Section title="what the stack is not">
        <NotList items={["a gallery of collectibles — rings are consensus objects with a closed schema, not items", "a clock — height is a count of sealed rings, not wall time", "editable — memory is read-only; the lab exposes no verb that rewrites a ring"]} />
      </Section>
    </div>
  );
}

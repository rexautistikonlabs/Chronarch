import { NotList, PageHeader, Section } from "../components/Page";
import { Readout } from "../components/Readout";
import { fmtChronons } from "../lib/format";
import { Viewport } from "../scene/Scene";
import { useSession } from "../state/SessionContext";

export function Hearth() {
  const { session } = useSession();
  const s = session.state;
  const c = s.credits_by_reason;
  return (
    <div>
      <PageHeader eyebrow="G2 · Hearth clamp" title="Hearth" lede="Chronos is blood, not conscience. The Hearth is where an operator locks their own bond; a bonded (prestressed) identity may win its own slots. Drawn as a tensegrity: two compression legs held apart by tension cables meeting at the lock. Prestress keeps the legs apart — the clamp is the geometry, not a dial." />
      <Viewport state={s} focus="hearth" className="h-[420px] w-full" />
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Readout label="prestressed" value={String((s.won_slots ?? 0) > 0 || Object.keys(c).length > 0)} testId="prestressed" />
        <Readout label="space credits" value={fmtChronons(c.space)} hint="chronons credited for won slots (SPACE share)" />
        <Readout label="pin credits" value={fmtChronons(c.pin)} />
        <Readout label="compute credits" value={fmtChronons(c.compute)} hint="paid only for an attested receipt" />
        <Readout label="treasury" value={fmtChronons(c.treasury)} />
      </div>
      <Section title="reading the credits">
        <p>Credits come from <code className="readout">home/rewards.jsonl</code>, a node-local ledger separate from the Timechain: they grant no salience, no vote weight, and no lottery weight, and they are never replayed through the rings. The split per won slot is fixed by the frozen reward router; these are counts of chronons, not a balance in anything.</p>
      </Section>
      <Section title="what the hearth is not">
        <NotList items={["an asset, a market, or anything with a price — there is no quote to show", "a staking product — the bond is the operator's own lien, and slashing is a Council outcome", "a dial — the clamp is a structural constraint, and this page shows no lever to turn it"]} />
      </Section>
    </div>
  );
}

import { NotList, PageHeader, Section } from "../components/Page";
import { Readout } from "../components/Readout";
import { useSession } from "../state/SessionContext";

export function Council() {
  const { session } = useSession();
  const s = session.state;
  const p = s.proposal;
  return (
    <div>
      <PageHeader eyebrow="G14 · G15 · G16" title="Council" lede="A major change is a Proposal ring plus a Ballot with a lien; the AI cannot self-enact (G15); an illegal ratification slashes its yes-voters and seals a scar at I8 (G16). The proposal prism docks at the centre only when a ballot is approved and ratified onto every home. Otherwise it is parked — still." />
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        <Readout label="seats" value={s.seats.length} testId="seat-count" />
        <Readout label="proposal" value={p ? p.proposal_id : "none"} testId="proposal-id" />
        <Readout label="major_class" value={p?.major_class ?? "—"} />
        <Readout label="outcome" value={p?.outcome ?? "—"} testId="proposal-outcome" tone={p?.outcome === "approved" ? "verdigris" : "ivory"} />
        <Readout label="ratified" value={p ? String(p.ratified) : "—"} testId="proposal-ratified" tone={p?.ratified ? "verdigris" : "ivory"} />
        <Readout label="slashes" value={p?.slashes ?? 0} tone={(p?.slashes ?? 0) > 0 ? "amber" : "mute"} />
      </div>
      <Section title="seats">
        <ul className="readout grid gap-1 text-xs sm:grid-cols-3">{s.seats.map((seat) => <li key={seat}>{seat}</li>)}</ul>
      </Section>
      <Section title="what the council is not">
        <NotList items={["an admin panel — there is no key, no override, no self-enact path (K18 screens the identifiers themselves)", "a token vote — weight is the Hearth bond snapshot at eligibility, and a lien is at stake", "advisory — an approved M6 peer change is the ONLY path that changes a net's fleet after genesis"]} />
      </Section>
    </div>
  );
}

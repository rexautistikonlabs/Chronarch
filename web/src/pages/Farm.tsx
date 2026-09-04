import { NotList, PageHeader, Section } from "../components/Page";
import { Readout } from "../components/Readout";
import { useSession } from "../state/SessionContext";

export function Farm() {
  const { session } = useSession();
  const s = session.state;
  const fault = s.i3 !== null || !s.pins_ok;
  return (
    <div>
      <PageHeader eyebrow="space · pins · I3" title="Farm" lede="Space is proved from a .cseal SpaceSeal (a hash stand-in verifier by default; chiapos is an optional, off-by-default extra). A SpaceSeal commits to a pin set; the pin lane honours it. A withheld or tampered pin is I3 — a nervous restriction, reported and never fatal, and never a change to who wins a slot." />
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Readout label="pins_ok" value={String(s.pins_ok)} tone={s.pins_ok ? "ivory" : "amber"} />
        <Readout label="i3" value={fault ? "RESTRICTION" : "none"} tone={fault ? "amber" : "mute"} />
        <Readout label="won_slots" value={s.won_slots ?? "—"} />
        <Readout label="peers_ok" value={s.peers_ok === null ? "—" : String(s.peers_ok)} />
      </div>
      <Section title="reading the well">
        <p>{fault ? "One rod is raised and amber: the pin lane does not match the committed cas_root. That is the only amber on the instrument, and it is here because the session carried a real I3." : "Every rod is seated: the pin lane matches the SpaceSeal's committed cas_root (PINS_OK). Nothing on the instrument is amber."} The rod count itself is seeded — the pinset size is not part of the readout; pins_ok and I3 are.</p>
      </Section>
      <Section title="what the farm is not">
        <NotList items={["Chia farming, or a claim about Chia plots", "a dashboard of hashrate or throughput — there is no rate here to show", "a place to buy space — units are integers recorded in the home"]} />
      </Section>
    </div>
  );
}

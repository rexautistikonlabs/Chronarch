import { NotList, PageHeader, Section } from "../components/Page";
import { Readout } from "../components/Readout";
import { fmtChronons } from "../lib/format";
import { Viewport } from "../scene/Scene";
import { useSession } from "../state/SessionContext";

export function Gym() {
  const { session } = useSession();
  const s = session.state;
  return (
    <div>
      <PageHeader eyebrow="Immune Gym · attested compute" title="Gym" lede="The Immune Gym is a catalogue of self-challenges the organism must keep passing (prestress has a cadence). Compute is paid only for a DummyMind job or a gym oracle whose replay verifies: an unattested receipt is refused, never paid. The sealed box opens and closes once when a session carries an attested receipt, then seals again." />
      <Viewport state={s} focus="mind" className="h-[420px] w-full" />
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Readout label="attested" value={String(s.attested)} testId="attested" tone={s.attested ? "verdigris" : "mute"} />
        <Readout label="compute credits" value={fmtChronons(s.credits_by_reason.compute)} />
        <Readout label="faculty" value="injection_screen_sense" hint="the live seed faculty the pulse replays (G3)" />
      </div>
      <Section title="what attests">
        <p>A ComputeReceipt is a closed schema: worker, job kind, job id, input and output hashes, slot. The node rebuilds the job honestly — replaying the faculty on its CAS input, or judging the gym oracle — and pays the COMPUTE share only if the replay matches. There is no backdoor and no CLI flag that marks a job attested.</p>
      </Section>
      <Section title="what the gym is not">
        <NotList items={["a benchmark of an LLM — DummyMind is the default mind; an LLM backend is a library-injection path that reads and proposes", "training — nothing here updates weights", "a claim about intelligence, consciousness, or AGI"]} />
      </Section>
    </div>
  );
}

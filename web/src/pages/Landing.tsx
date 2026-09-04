import { Link } from "react-router-dom";

import { Legend } from "../components/Legend";
import { MotionBadge } from "../components/MotionBadge";
import { NotList, Section } from "../components/Page";
import { SessionMeta } from "../components/SessionMeta";
import { StatBar } from "../components/StatBar";
import { Viewport } from "../scene/Scene";
import { useSession } from "../state/SessionContext";

export function Landing() {
  const { session } = useSession();
  return (
    <div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <p className="readout text-[11px] uppercase tracking-wider text-dim">lab-v0 · research organism</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight">A working model of a protocol's mechanics, on your machine.</h1>
          <p className="mt-4 text-sm leading-relaxed text-mute">
            Chronarch is a decentralized autonomous cognitive organism studied in a lab: a kernel with no admin key, an append-only Timechain whose scars cannot vanish, a space lottery, a Council whose only upgrade path is a Proposal plus a slashing-backed Ballot, a Hearth bond, and a DummyMind whose compute is paid only when its replay attests.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-mute">
            This viewport is an instrument, not a billboard. It draws the state of one lab session — the checked-in fixture, or JSON you paste in the <Link to="/lab" className="text-ivory underline decoration-dim underline-offset-2">Lab console</Link> — and then holds still. The rest pose is seeded by the session's head hash; a different head is a visibly different pose. Events play once.
          </p>
          <p className="mt-4 border-l-2 border-dim pl-3 text-sm text-ivory" data-testid="honesty">
            It is <strong className="font-semibold">not a public blockchain</strong>. lab-v0 runs in-process or on loopback TCP: one process, or two on 127.0.0.1, a few home directories, no peer discovery, no external listener, no chiapos plots by default. Nothing here is a production or interoperability claim.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link to="/lab" className="border hair bg-panel px-3 py-1.5 text-ivory hover:bg-line">Open the Lab console</Link>
            <Link to="/operator" className="border hair px-3 py-1.5 text-mute hover:text-ivory">Read the operator path</Link>
            <Link to="/consortium" className="border hair px-3 py-1.5 text-mute hover:text-ivory">For research groups</Link>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Viewport state={session.state} focus="overview" className="aspect-[4/3] w-full lg:aspect-auto lg:h-[440px]" />
          <div className="flex items-center justify-between gap-4">
            <SessionMeta />
            <MotionBadge />
          </div>
        </div>
      </div>

      <div className="mt-8">
        <StatBar state={session.state} />
      </div>

      <Section title="what you are looking at">
        <Legend />
      </Section>

      <Section title="what this is not">
        <NotList items={["a public blockchain, a public network, or a network with peer discovery", "Chia, or a claim about Chia's plot format", "a wallet, an asset, a market, or anything with a price", "AGI, or a claim about consciousness", "a node — this page spawns nothing and reads no filesystem"]} />
      </Section>
    </div>
  );
}

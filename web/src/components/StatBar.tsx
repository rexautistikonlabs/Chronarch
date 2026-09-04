import { fmtInt } from "../lib/format";
import { shortHash, type SceneState } from "../lib/session";
import { Readout } from "./Readout";

/** The instrument's readouts. These six numbers plus the head hash are what
 *  seed the scene's rest pose. Amber appears only on a scar or a real I3. */
export function StatBar({ state }: { state: SceneState }) {
  const i3 = state.i3 !== null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8" data-testid="statbar">
      <Readout label="identity" value={state.identity} testId="identity" />
      <Readout label="height" value={fmtInt(state.height)} testId="height" />
      <Readout label="ring_count" value={fmtInt(state.ring_count)} testId="ring-count" hint="rings in the Timechain, Ring 0 included" />
      <Readout label="scar_count" value={fmtInt(state.scar_count)} testId="scar-count" tone={state.scar_count > 0 ? "amber" : "ivory"} />
      <Readout label="head_hash" value={shortHash(state.head_hash, 10)} testId="head-hash" hint={state.head_hash} />
      <Readout label="pins_ok" value={String(state.pins_ok)} testId="pins-ok" tone={state.pins_ok ? "ivory" : "amber"} />
      <Readout label="i3" value={i3 ? "RESTRICTION" : "none"} testId="i3" tone={i3 ? "amber" : "mute"} hint="I3: a withheld or tampered pin restricts the pin lane; never a lottery change" />
      <Readout label="peer_count" value={fmtInt(state.peer_count)} testId="peer-count" />
    </div>
  );
}

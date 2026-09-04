/** What the shapes mean. No shape moves on its own. */
export function Legend() {
  const rows = [
    ["stacked rings", "the Timechain; the thick base ring is Ring 0 (genesis)"],
    ["amber lesion on a rim", "a scar — sealed, never pruned (G5); amber appears only here and on a real I3"],
    ["rods in a well", "the pin lane; one raised amber rod = an I3 restriction"],
    ["two legs + cables + lock", "the Hearth as a tensegrity; the lock is the self-bond, prestress keeps the legs apart"],
    ["seats + hex prism", "the Council; the proposal docks at the centre only when approved and ratified"],
    ["sealed box", "DummyMind; the lid opens and closes once when a compute receipt attested"],
  ] as const;
  return (
    <dl className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <dt className="readout shrink-0 text-dim">{k}</dt>
          <dd className="text-mute">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

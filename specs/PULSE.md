# PULSE.md — The Organism Loop in One Command

A **pulse** is one turn of the whole organism on a durable home: farm a slot,
check the pins, attest a compute job, and credit Chronos — then report. It is
the smallest thing that exercises every lane at once, and it is deterministic:
no wall clock, no randomness beyond the existing space lottery.

```python
from chronarch_node import pulse
pulse("/tmp/chronarch-home")           # abstract TEST units
pulse("home/", space_path="f.cseal")   # farm from a .cseal
pulse("home/", slots=5)                # run more slots
```

```
chronarch pulse --home DIR [--space path.cseal] [--slots N]
```

> The pulse is blood, not command. It runs the organism; it never rules it.

---

## 1. What one pulse does

1. **Open or init the home.** An existing home is resumed (identity, space, and
   ledger recovered from it — [HOME.md](HOME.md)); a fresh home with no
   `--space` farms abstract **TEST** units (1 unit). A `--space` file's
   `farmer_id` names a fresh organism.
2. **Self-bond.** The node locks its own Hearth bond so it is prestressed and
   can win its own slots. This is the operator locking their own position — it
   is **never** an admin key, founder key, or helm override.
3. **Refresh prestress.** A self-challenge (replay-judged, no Chronos) keeps the
   mandatory gym cadence current so a long-lived home keeps meeting prestress.
4. **verify_space** (file-backed only). A `.cseal` that went invalid means skip
   leadership this slot rather than crash or forge a proof.
5. **Attest a DummyMind compute job.** `make_compute_receipt` replays a live
   seed faculty (`injection_screen_sense`) on a CAS input;
   `submit_compute_receipt` attests it ([COMPUTE.md](COMPUTE.md)) and buffers it
   for the slot's win — so the win pays the COMPUTE share to the worker.
6. **Farm slots.** The single-node lottery elects this identity every eligible
   slot; each win seals an economic ring and credits space/pin/compute/treasury
   via `reward_slot` ([REWARDS.md](REWARDS.md)).
7. **verify_pins.** A withheld/tampered pin is an **I3** nervous event — it is
   reported but **never aborts the pulse and never stops space farming**.

## 2. The report

```json
{
  "identity": "chronarch-pulse",
  "height": 3,
  "won_slots": 3,
  "credits_by_reason": {"space": …, "pin": …, "compute": …, "treasury": …},
  "pins_ok": true,
  "i3": null,
  "head_hash": "…"
}
```

`i3` is the I3 `RestrictionState` when pins are unhealthy, else `null`. `pins_ok`
false with a paid `space` credit is the intended shape under a withheld pin: a
nervous event that never touches the space lottery.

## 3. Determinism

Same home + same inputs → same `head_hash` and same credits. The only entropy is
the space lottery, which is itself a deterministic function of the slot and the
space table. No time, no OS randomness, no network.

## 4. What a pulse is NOT

- **Not an admin path.** It self-bonds its own position and drives only the
  frozen machinery. There is no key, no override, no privileged verb.
- **Not self-enactment.** It never registers a live faculty and never submits a
  proposal — authored code stays inert; upgrades are Proposal + Ballot only
  (G4/G15).
- **Not credits on-chain.** Chronos credits go to the separate blood ledger
  (`home/rewards.jsonl`); the consensus Timechain carries only the economic slot
  rings `produce_slot` already seals. A credit is never sealed into a ring.
- **Not a public network.** One node, one home. Not Council activation, not
  chiapos / CHIP-48, not an AMM, and it does not change the emission.

## 5. CLI error codes

`BAD_HOME` (unopenable home), `SPACE_UNITS_MISMATCH` (a `--space` file
disagreeing with what the home recorded — the home is authoritative),
`BAD_SPACE` (a missing/invalid `.cseal`), and `COMPUTE_UNATTESTED` (a compute
job that would not attest — the pulse's own job always attests). All JSON.

---

See [HOME.md](HOME.md) for the durable layout the pulse opens,
[REWARDS.md](REWARDS.md) for the credits it writes, and
[COMPUTE.md](COMPUTE.md) for the attestation its DummyMind job goes through.

# Chronarch

Chronarch is a **decentralized autonomous cognitive organism (DACO)**: an
append-only Timechain of rings for memory, a challenge-attested cognition
layer, a biotensegrity-inspired nervous system that measures its own health,
a Chia-family Proof-of-Space-and-Time body (research fork path), and a
stewarding Council of bonded stakers. It is **not** a claim of consciousness
or qualia; PoQ does not prove subjective experience.

> Chronarch proposes. The Timechain remembers. The tensegrity feels.
> The Council stewards. Chronos is blood, not conscience.

**The invariant:** *Major change is a proposal ring plus a slashing-backed
vote, not an AI rewrite and not an admin key.*

**Security slogan:** *Tampering is detectable, expensive, incomplete, and
metabolized into a scar.*

## Layout

```
specs/            GENESIS, BOOTSTRAP, NERVOUS, COUNCIL, TOKEN, HEARTH,
                  GYM, THREATS, ARCHITECTURE, ATTRIBUTION
packages/
  chronarch-spec      constants, codec, covenant, schemas, kernel (source of truth)
  chronarch-core      Timechain, CAS, admission, challenge, registry, DummyMind,
                      reward router, bootstrap S0..S8
  chronarch-nervous   interfaces I1..I10, prestress, transmission, HealthVector
  chronarch-hearth    one lock / two legs, unbond delay, slashing, salience clamp
  chronarch-council   proposal state machine — the ONLY upgrade path
  chronarch-gym       Immune Gym (Chronarch targets only)
  chronarch-sim       (Phase 2 skeleton)
  chronarch-node      (Phase 3 skeleton)
  chronarch-agent     (Phase 5 skeleton)
  chronarch-cli       (Phase 3 skeleton)
tests/            kernel/Ring 0 hash tests, upgrade-path tests, testing bar
BUILD_LOG.md      decisions and REJECTED ideas
```

## Quick start

No install step, mirroring genesis law G11 (a node self-configures from the
kernel blob with no privileged setup):

```
pytest            # conftest.py wires packages/*/src onto sys.path
```

What the suite proves today (the Phase-0/Phase-1 testing bar):

- kernel + disk + compute → `boot-ok` with **zero extra keys**; the golden
  kernel/Ring 0 hashes are pinned in `tests/fixtures/genesis_hashes.json`
- **no admin key in the kernel** — no forbidden field survives schema
  validation, no bootstrap path reads key material, and an AST scan proves
  no source identifier implements an override
- **the upgrade path is Proposal + Ballot only** — Chronarch cannot
  self-enact M3; forged grants fail; an illegal proposal is invalid even if
  unanimous, slashing its yes-voters and sealing a Scar at I8
- past-ring mutation fails verify; scars cannot vanish; 10k rings verify
  with O(1) resume from the head commitment
- Chronos cannot flip a Challenge (the judgment signature has no payment
  parameter); gym cases against external targets are rejected at the schema
  layer; prestress below floor demotes eligibility

## Reading order

Start with [specs/GENESIS.md](specs/GENESIS.md) (law G1–G18 + covenant),
then [specs/COUNCIL.md](specs/COUNCIL.md) (the only upgrade path),
[specs/BOOTSTRAP.md](specs/BOOTSTRAP.md) (Block 0 kernel + S0–S8),
[specs/NERVOUS.md](specs/NERVOUS.md), [specs/TOKEN.md](specs/TOKEN.md),
[specs/HEARTH.md](specs/HEARTH.md), [specs/GYM.md](specs/GYM.md),
[specs/THREATS.md](specs/THREATS.md), and
[specs/ARCHITECTURE.md](specs/ARCHITECTURE.md).

Lineage and homage: [specs/ATTRIBUTION.md](specs/ATTRIBUTION.md) —
Cyberphysics / Cypher Tempre cognition primitives, the Rex Autistikon
method + biotensegrity principles (analogical instrumentation, not
clinical), and Chia-family Proof of Space and Time physics.

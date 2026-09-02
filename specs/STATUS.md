# STATUS.md — Chronarch lab-v0 (Freeze)

Chronarch **lab-v0** is a research organism that runs on an **in-process or
loopback net**. It is a working model of the protocol's mechanics — the kernel,
the append-only Timechain, the space lottery, the Council, the Hearth, the
nervous system, the agent runtime, and a Chronos reward economy.

> **What lab-v0 is not.** It is **not a public blockchain**, not Chia mainnet,
> not CHIP-48, and not AGI. It is a lab: one process, or two on loopback TCP —
> a few home directories, no public network, no peer discovery, no chiapos
> plots. Nothing here is a production or interoperability claim.

This document freezes the state of the research organism at `lab-v0`.

---

## What is frozen, and what is live

| Component | Status |
|---|---|
| Kernel / G14 / no admin key | frozen, hashed |
| Council + Hearth + DummyMind + gym | live |
| Agent silos + hats + prevention-only black hat | live |
| .cseal + pins + I3 withhold + pin gossip | live |
| Home resume + Chronos rewards + attested compute | live |
| Pulse, two-home net, voted peers, council CLI | live |
| Operator path is a test | live |
| Loopback TCP | live |
| chiapos | optional extra; tests skip if missing |

**Frozen, hashed** means the golden kernel / Ring 0 hashes are pinned in
`tests/fixtures/genesis_hashes.json` and an AST scan proves no source identifier
implements an admin key, founder key, or helm override (K18, G11, G17). Changing
any of them is a MAJOR change through Proposal + Ballot (G14) — never an edit.

**Live** means it runs and is covered by the test suite.

## The boundaries, restated

- **Governance is a vote, never a key.** A peer-set change, a faculty
  activation, a genesis-parameter change — each is a Proposal ring plus a
  slashing-backed Council ballot (G14). Chronarch can *draft* (Cambium, inert)
  but can never self-enact (G15); the agent has no `execute_upgrade`,
  `activate_faculty`, or tally verb.
- **The pin/CAS lane is nervous, never consensus.** A withheld or corrupt pin is
  an **I3** event — it never changes who wins a slot and is never a lost
  consensus object. Pins gossip on the in-process bus; a `.cseal` never holds
  them.
- **Chronos is blood, not conscience (G2).** Rewards pay space, honored pins,
  and *attested* compute; nothing rewards a Challenge pass, a Ballot yes, an LLM
  draft, or a hat role, and no credit is ever sealed into the Timechain.
- **The net is local.** The in-process bus is the default; the loopback TCP path
  binds `127.0.0.1` only (a non-loopback bind is refused). There is no DHT and
  no external listener.

## chiapos — an optional extra

The default proof-of-space verifier is a deterministic **hash stand-in**
(`verify_pospace` / `verify_space_proof`, Phase 6). When — and only when —
`CHRONARCH_CHIAPOS=1` and the optional `chiapos` package imports, an optional
cross-check (`verify_pospace_extra`) may additionally reject a proof. This is an
**optional extra, not an interoperability claim**: the tests that touch it use
`pytest.importorskip("chiapos")`, so the default suite runs with zero extra
dependencies, and the lottery inputs are unchanged. Chronarch does not vendor
`chia-blockchain`.

## Reading order

- [../docs/LAB.md](../docs/LAB.md) — what a lab session is (`pulse`, `memory`,
  the operator path) and what it is not (a public chain).
- [OPERATOR.md](OPERATOR.md) — the operator path (pulse, net, vote a peer,
  status), which is itself a test.
- [ARCHITECTURE.md](ARCHITECTURE.md) — the design.
- [GENESIS.md](GENESIS.md) — the law (G1–G18) and the covenant.
- [PEERS.md](PEERS.md) / [NET.md](NET.md) / [PULSE.md](PULSE.md) — the fleet,
  the net (in-process + loopback TCP), and the single-home loop.

---

`lab-v0` is a research freeze of a working model. It is not a public blockchain
and makes no production claim.

# LAB.md — What a Chronarch lab session is

Chronarch `lab-v0` is a **research organism**, and a lab session is the way you
run one: install once, pulse a home, read its memory back, walk the operator
path. Everything happens on your machine — one process, or two on loopback TCP.
This page is the whole of it.

> A lab session is **not** a public chain. There is no public network, no peer
> discovery, no token listing, no external listener, and nothing here is a
> production claim. See [../specs/STATUS.md](../specs/STATUS.md).

---

## 1. Install (once, in a clean venv)

```
python -m venv .venv && . .venv/bin/activate
pip install -e ".[dev]"
```

One editable install brings up all eleven workspace packages (`spec core
hearth nervous gym sim farm council node agent cli`) and the `chronarch`
console script. There are zero third-party runtime dependencies; `pytest` is the
dev extra. `chronarch status` tells you what you have:

```
chronarch status
```

It prints the first paragraph of STATUS.md and the checkout's `git describe`
(when a checkout is available). It cannot say "mainnet" — the verb refuses a
status paragraph that does.

## 2. Pulse — the heartbeat

```
chronarch pulse --home /tmp/lab/solo --slots 3
```

One deterministic loop on one home: farm space (win slots), check the pin lane
(a withheld pin is I3, reported, never fatal), attest a DummyMind compute job,
and credit Chronos. A fresh `--home` is laid out on first pulse; a second pulse
resumes the *same organism* and continues its slot sequence. Details:
[../specs/PULSE.md](../specs/PULSE.md).

## 3. Memory — what the home remembers

```
chronarch memory --home /tmp/lab/solo
```

The Timechain, the home directory, and the pin lane **are** the organism's
persistent memory. `memory` reads them back — read-only — and prints exactly:

```
{identity, height, head_hash, ring_count, scar_count, pins_ok, i3, credits_by_reason}
```

It resumes the home through the frozen fail-closed replay (a corrupt or
truncated log, a kernel drift, or a `peers.json` that disagrees with the home is
an error, never a guess), re-walks every ring, and checks the pins. It rewrites
no ring and wipes no scar: scars cannot vanish (G5), so there is no "clean
memory" — a scar is metabolized by a *new* ring after review (M7, a Council
matter), never deleted. `ring_count` counts Ring 0; `credits_by_reason` comes
from `home/rewards.jsonl`, the blood ledger, not from the rings.

## 4. The operator path — two homes and a vote

The full loop — pulse a home, stand up a two-home net, propose a peer-set
change, ballot it from each steward, tally and ratify, read status — is a
numbered command sequence in [../specs/OPERATOR.md](../specs/OPERATOR.md), and
the same sequence runs as a test (`tests/test_operator_path.py`). A lab session
that follows it ends with two homes that agree on one head and a fleet that
changed only by a slashing-backed ballot (G14, M6).

## 5. What a lab session is not

- **Not a public chain.** In-process bus or loopback `127.0.0.1` only; no
  discovery, no bootstrap peers, no `0.0.0.0`.
- **Not an asset.** Chronos is a node-local credit ledger — blood, not
  conscience (G2). There is no listing, no market, no issuance schedule claim.
- **Not a memory you can clean.** Scars stay. `memory` reads; nothing in the
  lab surface rewrites a ring or deletes a scar.
- **Not written by an LLM.** The agent runtime is DummyMind by default; an
  optional LLM backend is a library-injection path that *reads* and *proposes*.
  Nothing an LLM emits is sealed into the Timechain without the same admission
  every other tx gets (K18 screen, Proposal + Ballot for a major change, G15).
- **Not Chia mainnet, not CHIP-48, not AGI.** The proof-of-space verifier is a
  hash stand-in; `chiapos` is an optional, off-by-default extra.

---

Cutting a lab tag: [RELEASE.md](RELEASE.md). The frozen surface and the
frozen/live table: [../specs/STATUS.md](../specs/STATUS.md). The home layout:
[../specs/HOME.md](../specs/HOME.md).

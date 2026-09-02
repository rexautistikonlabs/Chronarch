# NET.md — A Two-Home Local Net

A **net** puts two (or N) durable homes on the existing in-process bus and lets
them gossip slots until they hold one head. It is the smallest thing that shows
consensus across separate organisms — each with its own home, identity, and
space — converging on the same Timechain.

It is **still not a public network**: one process, N home directories, the
deterministic `InProcessBus`. No sockets, no discovery, no internet.

```python
from chronarch_node import net_run
net_run(["/tmp/home-a", "/tmp/home-b"], slots=6)
```

```
chronarch net --homes DIR1,DIR2 [--slots N]
```

> One process, N homes, one head. The net composes the pulse's home and the
> Cluster's gossip; it rewrites neither the lottery nor the ledger.

---

## 1. What one net_run does

1. **Plan the homes.** A fresh home is assigned a distinct identity
   (`net-node-i`) and distinct abstract space units (so the lottery weighs the
   nodes differently). An existing home recovers its identity and units — the
   home is authoritative ([HOME.md](HOME.md)).
2. **Wire the net.** All nodes share one `HearthState`, one `CouncilState`, and
   one `InProcessBus` (mirroring the Cluster). Each self-bonds its own position
   and refreshes its gym cadence with a self-challenge.
3. **Run `slots` rounds.** For each slot the frozen `slot_leader` elects one
   leader from the shared space table. The leader attests a DummyMind compute
   job (so its win pays itself the COMPUTE share), then `produce_slot` seals the
   economic ring + header + slot-header and **broadcasts** them. Followers
   re-seal identically and reject anything whose hash does not match — tampering
   is detectable, exactly as in the Cluster.
4. **Persist.** Every node writes its own ledger, block/slot headers, and reward
   credits to its own home, so a second `net_run` on the same dirs resumes.

## 2. The report

```json
{
  "homes": [
    {"identity": "net-node-0", "height": 6, "won_slots": 2,
     "credits_by_reason": {"space": …, …}, "head_hash": "…"},
    {"identity": "net-node-1", "height": 6, "won_slots": 4,
     "credits_by_reason": {"space": …, …}, "head_hash": "…"}
  ],
  "leaders": ["net-node-0", "net-node-0", "net-node-1", …],
  "converged": true
}
```

`converged` is true when **every** home holds the identical `head_hash` AND the
same `height`. `sum(won_slots) == len(leaders)` — every produced slot has one
leader. SPACE credits land only in the actual leader's home: a follower applies
a peer's ring but issues no credit for it (`produce_slot` credits; `on_gossip`
does not).

## 3. Resume

A second `net_run` on the same home dirs recovers each identity + units and
continues from the persisted height — the homes were converged at the same
height, so they extend the one chain. A drifted kernel is still fail-closed:
`HOME_KERNEL_MISMATCH`, no resume ([HOME.md](HOME.md) §3).

A net home cannot be validated in isolation from an arbitrary identity: replaying
a peer-led slot header needs that peer's space units, so a resuming node must be
given the net's space table (the validator set). This is normal — you need the
peer set to verify peer history.

## 4. Determinism

Same homes + same inputs → the same `leaders` sequence and the same converged
head. The only entropy is the space lottery, a deterministic function of the
slot and the space table. No wall clock, no OS randomness, no network I/O.

## 4a. Loopback TCP (Phase 23)

The in-process bus is the default; the same messages also travel over **real TCP
sockets** as line-delimited JSON (reusing the transport's `_send_line` /
`_recv_line` framing). Two homes run as two OS threads (or two `chronarch net
tcp` processes), each with a gossip listener and a send connection to its peer.
They gossip **slot headers, rings, and pin offers** and converge on the same
rule — same height AND head_hash. Over the same fleet, the TCP net reaches the
**identical head** as the in-process net (tested).

```
chronarch net tcp --home A --listen 127.0.0.1:8801 --peer 127.0.0.1:8802 --slots 6
chronarch net tcp --home B --listen 127.0.0.1:8802 --peer 127.0.0.1:8801 --slots 6
```

Establish the fleet once with the in-process `chronarch net --homes A,B` (which
writes `peers.json` to both); each `net tcp` node then reads its fleet from
`peers.json`. JSON out per node: `{identity, listen, peer, height, head_hash,
garbled, verify}`.

- **Loopback only.** The listener binds `127.0.0.1` — a non-loopback host
  (`0.0.0.0`, an external IP) is refused (`NOT_LOOPBACK`). There is no peer
  discovery, no DHT, no public network.
- **A garbled line is rejected, never fatal.** A reader that hits bad JSON, a
  non-object, or a forged/out-of-order message counts it (`garbled`) and keeps
  the stream and the ledger alive — the net still converges and every ledger
  still `verify_full`s (tested). Tampering is detectable, not fatal.
- `tcp_net_run(homes, slots)` runs both nodes on threads with ephemeral ports —
  what the tests use. The in-process `net_run` is unchanged.

## 5. What a net is NOT

- **Not a public network.** The default is the in-process bus; the loopback TCP
  path (§4a) binds `127.0.0.1` only — no discovery, no DHT, no external bind.
- **Not an admin path.** Nodes self-bond their own positions; there is no key,
  override, or privileged verb.
- **Not self-enactment.** No node registers a live faculty or submits a proposal
  — upgrades are Proposal + Ballot only (G4/G15).
- **Not credits on-chain.** Chronos credits go to each home's blood ledger
  (`home/rewards.jsonl`); the consensus Timechain carries only the economic slot
  rings. A credit is never sealed into a ring.
- **Not chiapos, not an AMM, not Council activation**, and it does not change
  the emission.

## 6. CLI error codes

`BAD_HOME`, `SPACE_UNITS_MISMATCH` (a home whose recorded space disagrees), and
`HOME_KERNEL_MISMATCH` (a drifted kernel) — all JSON. The command exits non-zero
if the net does not converge.

---

Each net_run writes the fleet to every home as `home/peers.json`, so a bare
`Node(home=DIR)` resumes the net without a conductor passing the space table —
see [PEERS.md](PEERS.md).

See [PULSE.md](PULSE.md) for the single-home loop the net scales up, and
[HOME.md](HOME.md) for the durable homes it gossips between.

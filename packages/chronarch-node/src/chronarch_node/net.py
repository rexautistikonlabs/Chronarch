"""Phase 17: a two-home (N-home) local net.

N durable homes gossip slots on the existing in-process bus and converge on one
head. Still **not a public network**: one process, N home directories, the
deterministic InProcessBus — no sockets, no discovery, no internet.

This composes what already exists: the frozen space lottery (`slot_leader`), the
Cluster gossip pattern (leader `produce_slot` -> broadcast -> followers
re-seal), the durable `Node(home=)` from Phase 13, and the attested DummyMind
receipts from Phase 15. It rewrites none of them. Each home persists its own
ledger + rewards, so a second `net_run` on the same dirs resumes both.

It is not an admin path (nodes self-bond their own Hearth positions, never a
key), it never self-enacts (no live faculty, no proposal), and it never seals a
Chronos credit into the Timechain (rewards stay in each home's blood ledger).
"""
from __future__ import annotations

from chronarch_core import make_compute_receipt
from chronarch_council import CouncilState
from chronarch_hearth import HearthState

from .cluster import STEWARD_LOCK_CHRONONS
from .home import NodeHome
from .leader import slot_leader
from .node import Node
from .pulse import PULSE_FACULTY
from .transport import InProcessBus

DEFAULT_NET_IDENTITY = "net-node"


def _plan_home(home: str, index: int) -> tuple[str, int]:
    """Resolve (identity, space_units) for a home: recovered from an existing
    home, or assigned distinct values for a fresh one."""
    node_home = NodeHome(home)
    if node_home.is_initialized():
        return node_home.read_identity(), node_home.read_space_units()
    # Fresh homes get distinct identities and distinct abstract space units, so
    # the lottery weighs them differently (and the net is a real contest).
    return f"{DEFAULT_NET_IDENTITY}-{index}", index + 1


def net_run(homes, slots: int = 6) -> dict:
    """Run `slots` gossip rounds across the given home dirs and return a
    JSON-able summary:

        {homes: [{identity, height, won_slots, credits_by_reason, head_hash}],
         leaders: [...], converged: bool}

    `converged` is True when every home holds the identical head_hash AND height.
    Deterministic: same homes + inputs -> same leaders and the same heads.
    """
    homes = list(homes)
    if len(homes) < 2:
        raise ValueError("a net needs at least two homes")
    if slots < 1:
        raise ValueError("net_run needs at least one slot")

    plans = [_plan_home(home, i) for i, home in enumerate(homes)]
    space_table = {identity: units for identity, units in plans}
    if len(space_table) != len(plans):
        raise ValueError("net homes must have distinct identities")

    # Shared Hearth/Council so each node's eligibility can see every peer's bond
    # (mirrors Cluster). Bonds are the operators locking their OWN positions.
    hearth = HearthState()
    council = CouncilState(hearth)
    bus = InProcessBus()
    for identity in space_table:
        hearth.lock(identity, STEWARD_LOCK_CHRONONS, slot=0)

    nodes: dict[str, Node] = {}
    for i, (home, (identity, units)) in enumerate(zip(homes, plans)):
        node = Node(identity, units, home=home, hearth=hearth, council=council,
                    space_table=dict(space_table))
        node.space_table = space_table  # one shared view for leader election
        node.seat = f"seat-{i}"
        council.register_seat(node.seat, identity,
                              pinset_size=len(node.cas.pins()),
                              last_challenge_pass_slot=0)
        # Refresh each node's gym cadence so a long-lived (resumed) net keeps
        # meeting prestress — a self-challenge, replay-judged, no Chronos.
        node.rpc("challenge", {"slot": node.ledger.height + 1})
        nodes[identity] = node
        bus.register(identity, node)

    # All homes converged at the same height last run (or all fresh at 0); drive
    # the shared slot counter from there.
    start = next(iter(nodes.values())).ledger.height + 1
    leaders: list[str] = []
    won = {identity: 0 for identity in nodes}
    any_node = next(iter(nodes.values()))
    for offset in range(slots):
        slot = start + offset
        leader = slot_leader(slot, space_table, any_node.eligible_leaders(slot))
        if leader is None:
            continue
        # The elected leader attests a DummyMind job so its win pays COMPUTE to
        # itself; followers issue no credits (SPACE goes to the actual leader).
        leader_node = nodes[leader]
        receipt = make_compute_receipt(
            leader, "dummymind", PULSE_FACULTY, node=leader_node,
            inputs={"tx": {"net_slot": slot}}, slot=slot)
        leader_node.submit_compute_receipt(receipt)
        messages = leader_node.produce_slot(slot)
        if not messages:
            continue
        for message in messages:
            bus.broadcast(leader, message)
        leaders.append(leader)
        won[leader] += 1

    heads = {node.ledger.head_hash for node in nodes.values()}
    heights = {node.ledger.height for node in nodes.values()}
    converged = len(heads) == 1 and len(heights) == 1

    return {
        "homes": [{
            "identity": node.identity,
            "height": node.ledger.height,
            "won_slots": won[identity],
            "credits_by_reason": node.reward_totals()["totals"],
            "head_hash": node.ledger.head_hash,
        } for identity, node in nodes.items()],
        "leaders": leaders,
        "converged": converged,
    }

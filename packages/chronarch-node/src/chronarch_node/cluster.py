"""Cluster: N real Nodes wired over a transport, running the slot loop.

This is the SimWorld-equivalent loop made concrete: instead of one shared
object, each node keeps its own chain and the nodes converge by GOSSIP — the
elected leader seals the slot ring and header and broadcasts them; followers
re-seal identically and reject anything whose hash does not match (tampering
is detectable). After each slot every honest node holds an identical head.
"""
from __future__ import annotations

from chronarch_council import CouncilState
from chronarch_hearth import HearthState
from chronarch_spec.constants import MIN_COUNCIL_BOND_CHRONONS

from .leader import slot_leader
from .node import Node
from .transport import InProcessBus

STEWARD_LOCK_CHRONONS = 2 * MIN_COUNCIL_BOND_CHRONONS


class Cluster:
    def __init__(self, n_nodes: int = 4, *, space_per_node: int = 100,
                 bond: bool = True) -> None:
        self.bus = InProcessBus()
        self.hearth = HearthState()
        self.council = CouncilState(self.hearth)
        self.space_table = {f"node-{i}": space_per_node * (i + 1)
                            for i in range(n_nodes)}
        self.nodes: dict[str, Node] = {}
        self.slot = 0

        for i in range(n_nodes):
            identity = f"node-{i}"
            if bond:
                self.hearth.lock(identity, STEWARD_LOCK_CHRONONS, slot=0)
            node = Node(identity, self.space_table[identity],
                        hearth=self.hearth, council=self.council,
                        space_table=self.space_table)
            if bond:
                node.seat = f"seat-{i}"
                self.council.register_seat(
                    node.seat, identity,
                    pinset_size=len(node.cas.pins()),
                    last_challenge_pass_slot=0)
            self.nodes[identity] = node
            self.bus.register(identity, node)

    def leader_for(self, slot: int) -> str | None:
        any_node = next(iter(self.nodes.values()))
        return slot_leader(slot, self.space_table, any_node.eligible_leaders(slot))

    def run_slot(self) -> dict:
        self.slot += 1
        leader = self.leader_for(self.slot)
        messages = self.nodes[leader].produce_slot(self.slot) if leader else []
        for msg in messages:
            self.bus.broadcast(leader, msg)
        return {"slot": self.slot, "leader": leader, "messages": len(messages)}

    def run_slots(self, n: int) -> list[dict]:
        return [self.run_slot() for _ in range(n)]

    # -- convergence checks -------------------------------------------------
    def converged(self) -> bool:
        heads = {node.ledger.head_hash for node in self.nodes.values()}
        header_heads = {node.last_header_hash for node in self.nodes.values()}
        return len(heads) == 1 and len(header_heads) == 1

    def all_verify(self) -> bool:
        return all(node.ledger.verify_full() for node in self.nodes.values())

    def head_height(self) -> int:
        return next(iter(self.nodes.values())).ledger.height

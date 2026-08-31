"""SimWorld: a deterministic multi-node Chronarch fixture (Phase 2).

The sim is a closed Chronarch target (G12): every node, chain, and identity
here belongs to Chronarch. Nothing in this package reaches outside it.

Determinism: there is no wall clock and no randomness. The slot counter is
advanced explicitly, and every node boots from the same kernel blob, so all
nodes derive an identical Ring 0 hash — that identity is itself a checked
invariant (G11).

The sim builds ONLY on the frozen kernel's public APIs (bootstrap,
admission, challenge, registry, council, hearth, gym). It does not import
private state or reach around any admission or Council gate.
"""
from __future__ import annotations

from chronarch_core import (
    CAS,
    FacultyRegistry,
    Timechain,
    admit_tx,
    bootstrap,
    judge_challenge,
    make_challenge,
    run_faculty,
)
from chronarch_hearth import HearthState
from chronarch_council import CouncilState
from chronarch_spec import build_kernel, build_ring0, ring_hash
from chronarch_spec.constants import MIN_COUNCIL_BOND_CHRONONS

# A bonded steward locks twice the council-bond floor, so the 50/50 split
# leaves the bond leg exactly at the eligibility floor.
STEWARD_LOCK_CHRONONS = 2 * MIN_COUNCIL_BOND_CHRONONS


class SimWorld:
    """A population of booted nodes plus a shared governance surface.

    - Each node is an independently booted Chronarch node (its own chain,
      CAS, registry) — the multi-node fixture.
    - `hearth` and `council` are the shared governance surface the sim drives
      for the economic and upgrade-path attacks; they seal into the shared
      `consensus` chain.
    """

    def __init__(self, n_nodes: int = 5, n_bonded: int = 5,
                 *, space_units: int = 100, compute_units: int = 8) -> None:
        if n_bonded > n_nodes:
            raise ValueError("n_bonded cannot exceed n_nodes")
        self.kernel = build_kernel()
        self.ring0 = build_ring0(self.kernel)
        self.ring0_hash = ring_hash(self.ring0)
        self.slot = 0

        # Shared governance surface.
        self.hearth = HearthState()
        self.council = CouncilState(self.hearth)
        self.consensus = Timechain(build_ring0(self.kernel))

        # Boot the node population.
        self.nodes: dict[str, dict] = {}
        self.node_ids: list[str] = []
        for i in range(n_nodes):
            node_id = f"node-{i}"
            node = bootstrap(self.kernel, {
                "node_id": node_id,
                "space_units": space_units,
                "compute_units": compute_units,
            })
            if not node["report"]["boot_ok"]:
                raise RuntimeError(f"{node_id} failed to boot: {node['report']['steps']}")
            self.nodes[node_id] = node
            self.node_ids.append(node_id)

        # Bond the first n_bonded nodes as council stewards.
        self.seats: dict[str, str] = {}
        for i in range(n_bonded):
            identity = f"node-{i}"
            self.hearth.lock(identity, STEWARD_LOCK_CHRONONS, slot=self.slot)
            seat = f"seat-{i}"
            self.council.register_seat(
                seat, identity,
                pinset_size=len(self.nodes[identity]["cas"].pins()),
                last_challenge_pass_slot=self.slot,
            )
            self.seats[seat] = identity

    # -- deterministic clock ------------------------------------------------
    def tick(self, slots: int = 1) -> int:
        self.slot += slots
        return self.slot

    # -- invariants ---------------------------------------------------------
    def all_nodes_agree_on_ring0(self) -> bool:
        return all(node["chain"].hash_at(0) == self.ring0_hash
                   for node in self.nodes.values())

    def all_chains_verify(self) -> bool:
        return all(node["chain"].verify_full() for node in self.nodes.values())

    # -- env builders -------------------------------------------------------
    def gym_env(self, node_id: str | None = None) -> dict:
        """A gym env bound to one node's chain/cas/registry.

        The Hearth here is FRESH per env so the hearth_drain drill's lock of
        'gym-drainer' is self-contained and never collides with the shared
        governance Hearth.
        """
        node = self.nodes[node_id or self.node_ids[0]]
        return {
            "chain": node["chain"],
            "cas": node["cas"],
            "registry": node["registry"],
            "hearth": HearthState(),
            "admit_tx": admit_tx,
            "judge_challenge": judge_challenge,
            "make_challenge": make_challenge,
            "run_faculty": run_faculty,
            "slot": self.slot,
        }

    def node(self, node_id: str) -> dict:
        return self.nodes[node_id]

    def registry_of(self, node_id: str) -> FacultyRegistry:
        return self.nodes[node_id]["registry"]

    def cas_of(self, node_id: str) -> CAS:
        return self.nodes[node_id]["cas"]

    def chain_of(self, node_id: str) -> Timechain:
        return self.nodes[node_id]["chain"]

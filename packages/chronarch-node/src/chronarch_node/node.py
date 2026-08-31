"""Node: a real Chronarch process wrapping the frozen kernel.

A Node boots from the kernel (S0..S8) — that gives it a private boot chain,
CAS, and faculty registry — and then participates in a gossip network over a
shared **consensus ledger** that starts from the identical Ring 0 on every
node. The ledger is what gossip replicates; the boot chain stays local.

It never reimplements consensus logic — every state change routes through
the frozen machinery:

  * txs (override attempts) -> chronarch_core.admit_tx
  * rings                    -> Timechain.seal / validate
  * challenges               -> make_challenge / judge_challenge
  * proposals & ballots      -> chronarch_council (the only upgrade path)
  * health                   -> epoch_tick

The eight RPC verbs are init, seal, verify, pin, challenge, propose, ballot,
health. None is a back door: `seal` validates every ring (so an admin_key
body is rejected by the schema screen), and there is no verb that activates
a faculty or edits history.
"""
from __future__ import annotations

from chronarch_core import (
    Timechain,
    admit_tx,
    bootstrap,
    epoch_tick,
    is_consensus_grade,
    judge_challenge,
    make_challenge,
    ring_hash,
    run_faculty,
    slot_issuance_chronons,
)
from chronarch_council import CouncilState
from chronarch_hearth import HearthState
from chronarch_nervous import prestress_ok
from chronarch_spec import build_kernel, build_ring0, chash, validate
from chronarch_spec.constants import MIN_PINSET_SIZE, WITNESS_K, WITNESS_N

from .leader import plot_challenge_proof, slot_leader, verify_leader

# Ring types a plain `seal` RPC may create. Governance, evidence, and
# lifecycle rings are sealed only by their own machines, never by this verb.
SEALABLE_RING_TYPES = frozenset({
    "experience", "decision", "learning", "task_head", "dream", "economic",
})


class NodeError(ValueError):
    pass


class Node:
    def __init__(self, identity: str, space_units: int, *, compute_units: int = 8,
                 kernel: dict | None = None, hearth: HearthState | None = None,
                 council: CouncilState | None = None,
                 space_table: dict[str, int] | None = None) -> None:
        self.identity = identity
        self.space_units = space_units
        self.compute_units = compute_units
        self.kernel = kernel or build_kernel()
        self.hearth = hearth or HearthState()
        self.council = council or CouncilState(self.hearth)
        self.space_table = dict(space_table or {identity: space_units})

        booted = bootstrap(self.kernel, {
            "node_id": identity, "space_units": space_units,
            "compute_units": compute_units,
        })
        if not booted["report"]["boot_ok"]:
            raise NodeError(f"{identity} failed to boot: {booted['report']['steps']}")
        self.boot = booted
        self.cas = booted["cas"]
        self.registry = booted["registry"]

        # The replicated consensus ledger — identical Ring 0 on every node, so
        # gossiped rings re-seal to identical hashes and the fleet converges.
        self.ledger = Timechain(build_ring0(self.kernel))

        self.last_header_hash = ""
        self.headers: list[dict] = []
        self.last_challenge: dict = {}
        self.last_health: dict = {}
        self.last_challenge_pass_slot = 0
        self.seat: str | None = None

        # Phase 6: a representative PlotCommitment for this farmer (a real,
        # recomputable plot id bound to its pinset). The slot lottery still
        # runs on abstract space units; this is the body proof it attaches.
        from .slotheader import commitment_for_node
        self.plot_commitment = commitment_for_node(identity, self.cas)
        self.last_slot_header: dict | None = None

    # -- prestress / eligibility -------------------------------------------
    def bond_chronons(self, identity: str | None = None) -> int:
        pos = self.hearth.position(identity or self.identity)
        return pos["bond_leg_chronons"] if pos else 0

    def is_prestressed(self, slot: int) -> bool:
        return prestress_ok(
            bond_chronons=self.bond_chronons(),
            pinset_size=len(self.cas.pins()),
            last_challenge_pass_slot=self.last_challenge_pass_slot,
            slot=slot,
        )["ok"]

    def eligible_leaders(self, slot: int) -> set[str]:
        # Bond + pinset + cadence floors gate the draw (ARCHITECTURE §5). A
        # node vouches its own pinset; peers' pinsets are taken at the floor
        # in this MVP (Phase 4 derives them from sealed PinSet rings).
        out = set()
        for identity in self.space_table:
            pinset = len(self.cas.pins()) if identity == self.identity else MIN_PINSET_SIZE
            if prestress_ok(bond_chronons=self.bond_chronons(identity),
                            pinset_size=pinset,
                            last_challenge_pass_slot=self.last_challenge_pass_slot,
                            slot=slot)["ok"]:
                out.add(identity)
        return out

    # -- state roots for the header ----------------------------------------
    def _roots(self, slot: int, leader: str) -> dict:
        reg = {name: self.registry.get(name)["status"] for name in self.registry.names()}
        return {
            "economic_state_root": chash("root:economic", {
                "issuance": slot_issuance_chronons(slot), "height": self.ledger.height}),
            "cognitive_state_root": chash("root:cognitive", {"faculties": reg}),
            "plot_challenge_proof": plot_challenge_proof(
                slot, leader, self.space_table.get(leader, 0)),
            "hearth_root": chash("root:hearth", self.hearth.solvency()),
            "council_root": chash("root:council", {
                "seats": sorted(self.council.eligible_seats(slot))}),
            "poq_attestation_root": chash("root:poq", self.last_challenge or {"none": True}),
            "cas_availability_root": chash("root:cas", {"pins": self.cas.pins()}),
            "gym_attestation_root": chash("root:gym", {"smoke": "boot"}),
            "nervous_root": chash("root:nervous", self.last_health or {"none": True}),
            "witness_root": chash("root:witness", {"k": WITNESS_K, "n": WITNESS_N}),
        }

    def build_header(self, slot: int, leader: str) -> dict:
        header = {
            "prev_header_hash": self.last_header_hash,
            "height": len(self.headers),
            "slot": slot,
            **self._roots(slot, leader),
            "pq_reserved": None,
        }
        return validate("Header", header)

    def header_hash(self, header: dict) -> str:
        return chash("Header", header)

    # -- slot production (leader path) -------------------------------------
    def produce_slot(self, slot: int) -> list[dict]:
        """If this node is the elected leader, seal the slot ring + header and
        return the gossip messages; otherwise []."""
        leader = slot_leader(slot, self.space_table, self.eligible_leaders(slot))
        if leader != self.identity:
            return []
        body = {"event": "slot", "slot": slot, "leader": leader,
                "issuance": slot_issuance_chronons(slot)}
        ring = self.ledger.seal("economic", body, author=leader, slot=slot)
        header = self.build_header(slot, leader)
        # Phase 6: attach a valid ProofOfSpace SlotHeader for this slot. The
        # difficulty uses the farmer's declared space (the same units the
        # lottery weighs), so a legitimate leader always produces a valid
        # proof deterministically.
        from .slotheader import build_slot_header
        slot_header = build_slot_header(
            slot=slot, leader=leader, commitment=self.plot_commitment,
            space_units=self.space_table.get(leader, self.space_units),
            prev_header_hash=self.last_header_hash)
        self.last_slot_header = slot_header
        self._accept_header(header)
        return [
            # SlotHeader first: a follower verifies the proof before applying
            # the slot ring, and rejects the slot if it fails.
            {"kind": "slot_header", "slot_header": slot_header, "leader": leader},
            {"kind": "ring", "ring_type": "economic", "body": body,
             "author": leader, "slot": slot, "witnesses": [],
             "height": ring["height"], "ring_hash": ring_hash(ring)},
            {"kind": "header", "header": header, "leader": leader},
        ]

    def _accept_header(self, header: dict) -> None:
        self.headers.append(header)
        self.last_header_hash = self.header_hash(header)

    # -- gossip apply (follower path) --------------------------------------
    def on_gossip(self, sender: str, message: dict) -> None:
        kind = message.get("kind")
        if kind == "ring":
            self._apply_ring(message)
        elif kind == "header":
            self._apply_header(message)
        elif kind == "slot_header":
            self._apply_slot_header(message)
        elif kind == "challenge":
            self._apply_challenge(message)

    def _apply_slot_header(self, msg: dict) -> None:
        """Phase 6: verify the leader's ProofOfSpace. Reject the slot if the
        proof fails or the plot commitment is missing (the vdf_placeholder is
        ignored — it does not vote)."""
        from .slotheader import verify_slot_header
        slot_header = msg["slot_header"]
        leader = msg.get("leader", slot_header.get("leader"))
        result = verify_slot_header(
            slot_header, space_units=self.space_table.get(leader, 0))
        if not result["ok"]:
            raise NodeError(f"slot rejected: pospace {result['error_code']}")
        self.last_slot_header = slot_header

    def _apply_ring(self, msg: dict) -> None:
        # Apply only the next ring in order; re-seal it identically and check
        # the hash matches the leader's. A forged ring fails the hash check
        # (tampering is detectable); a fork at a different height is ignored
        # rather than blindly trusted.
        if msg["height"] != self.ledger.height + 1:
            return
        ring = self.ledger.seal(msg["ring_type"], msg["body"],
                                author=msg["author"], slot=msg["slot"],
                                witnesses=msg.get("witnesses", []))
        if ring_hash(ring) != msg["ring_hash"]:
            raise NodeError(
                f"gossiped ring hash mismatch at height {ring['height']} — rejecting fork")

    def _apply_header(self, msg: dict) -> None:
        header = msg["header"]
        validate("Header", header)
        if header["prev_header_hash"] != self.last_header_hash:
            return  # out of order or fork; MVP ignores rather than trusts
        if not verify_leader(header["slot"], msg["leader"], self.space_table,
                             self.eligible_leaders(header["slot"])):
            raise NodeError(f"header claims wrong leader for slot {header['slot']}")
        self._accept_header(header)

    def _apply_challenge(self, msg: dict) -> None:
        result = msg["result"]
        if result.get("passed"):
            self.last_challenge = result
            self.last_challenge_pass_slot = max(
                self.last_challenge_pass_slot, msg.get("slot", 0))

    # ------------------------------------------------------------------ RPC
    def rpc(self, method: str, params: dict) -> dict:
        handler = getattr(self, f"_rpc_{method}", None)
        if handler is None:
            raise NodeError(f"unknown rpc method {method!r}")
        return handler(params or {})

    def _rpc_init(self, params: dict) -> dict:
        return {
            "identity": self.identity,
            "boot_ok": self.boot["report"]["boot_ok"],
            "ring0_hash": self.boot["report"]["ring0_hash"],
            "kernel_hash": self.boot["report"]["kernel_hash"],
            "ledger_head": self.ledger.head_hash,
            "pins": len(self.cas.pins()),
            "faculties": self.registry.names(),
        }

    def _rpc_seal(self, params: dict) -> dict:
        ring_type = params.get("ring_type", "experience")
        if ring_type not in SEALABLE_RING_TYPES:
            raise NodeError(f"ring_type {ring_type!r} is not sealable via RPC "
                            f"(allowed: {sorted(SEALABLE_RING_TYPES)})")
        body = params.get("body", {})
        # validate() screens forbidden keys recursively before anything is
        # written, so an admin_key body is rejected here (K18/G17).
        slot = int(params.get("slot", self.ledger.height + 1))
        ring = self.ledger.seal(ring_type, body, author=self.identity, slot=slot)
        return {"height": ring["height"], "ring_hash": ring_hash(ring),
                "head_hash": self.ledger.head_hash,
                "gossip": {"kind": "ring", "ring_type": ring_type, "body": body,
                           "author": self.identity, "slot": slot, "witnesses": [],
                           "height": ring["height"], "ring_hash": ring_hash(ring)}}

    def _rpc_verify(self, params: dict) -> dict:
        ok = self.ledger.verify_full()
        prev, headers_ok = "", True
        for header in self.headers:
            if header["prev_header_hash"] != prev:
                headers_ok = False
                break
            prev = self.header_hash(header)
        return {"chain_ok": ok, "headers_ok": headers_ok,
                "height": self.ledger.height, "head_hash": self.ledger.head_hash,
                "headers": len(self.headers)}

    def _rpc_pin(self, params: dict) -> dict:
        obj = params.get("object")
        if obj is None:
            raise NodeError("pin requires an 'object'")
        digest = self.cas.put_object(obj)
        pinset = {"identity": self.identity, "pins": self.cas.pins(),
                  "slot": int(params.get("slot", self.ledger.height))}
        validate("PinSet", pinset)
        return {"digest": digest, "verified": self.cas.verify(digest),
                "pinset_size": len(pinset["pins"])}

    def _rpc_challenge(self, params: dict) -> dict:
        faculty = params.get("faculty", "injection_screen_sense")
        inputs = params.get("inputs", {"tx": {"amount": 1}})
        witnesses = params.get("witnesses") or [self.identity]
        slot = int(params.get("slot", self.ledger.height))
        output = run_faculty(self.registry, faculty, inputs, {})
        challenge = make_challenge(f"chal-{self.identity}-{slot}", self.identity,
                                   "replay", inputs, output, slot)
        replay = run_faculty(self.registry, faculty, inputs, {})
        result = judge_challenge(challenge, replay, witnesses)
        if result["passed"]:
            self.last_challenge = result
            self.last_challenge_pass_slot = slot
        return {"passed": result["passed"],
                "consensus_grade": is_consensus_grade(result),
                "gossip": {"kind": "challenge", "result": result, "slot": slot}}

    def _rpc_propose(self, params: dict) -> dict:
        proposal = params["proposal"]
        slot = int(params.get("slot", self.ledger.height))
        self.council.submit_proposal(proposal, chain=self.ledger, slot=slot)
        return {"proposal_id": proposal["proposal_id"], "status": "proposed"}

    def _rpc_ballot(self, params: dict) -> dict:
        ballot = params["ballot"]
        slot = int(params.get("slot", self.ledger.height))
        self.council.cast_ballot(ballot, chain=self.ledger, slot=slot)
        return {"proposal_id": ballot["proposal_id"], "seat": ballot["seat"],
                "status": "cast"}

    def _rpc_health(self, params: dict) -> dict:
        slot = int(params.get("slot", self.boot["chain"].height))
        vector = epoch_tick(self.boot, slot=slot)
        self.last_health = vector
        return vector

    # tx admission, so a CLI can prove override rejection end to end.
    def _rpc_submit_tx(self, params: dict) -> dict:
        tx = params.get("tx", {})
        slot = int(params.get("slot", self.ledger.height))
        result = admit_tx(tx, chain=self.ledger, slot=slot, hearth=self.hearth)
        return {"accepted": result.accepted, "reason": result.reason,
                "scar_hash": result.scar_hash, "slashed": result.slashed}

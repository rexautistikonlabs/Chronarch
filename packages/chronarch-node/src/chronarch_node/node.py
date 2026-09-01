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


class HomeError(NodeError):
    """A durable-home problem (Phase 13): corrupt layout, truncated ledger, or
    a kernel / Ring 0 hash that drifts from the recorded genesis."""


class Node:
    def __init__(self, identity: str, space_units: int | None = None, *,
                 compute_units: int = 8, kernel: dict | None = None,
                 hearth: HearthState | None = None,
                 council: CouncilState | None = None,
                 space_table: dict[str, int] | None = None,
                 space_path: str | None = None,
                 space_seal: dict | None = None,
                 pin_dir: str | None = None,
                 home: str | None = None) -> None:
        # Phase 13: a durable home makes a stopped node come back as the same
        # organism. The home is authoritative for identity and (when present)
        # the space file; a resuming node replays home/ledger through the
        # frozen Timechain and reopens home/pins.
        self._home = None
        self._persist_enabled = False
        resuming = False
        if home is not None:
            from .home import NodeHome
            self._home = NodeHome(home)
            if self._home.is_initialized():
                resuming = True
                identity = self._home.read_identity()  # the home names the organism
                if space_path is None and space_seal is None and self._home.has_space_seal():
                    space_path = self._home.space_seal_path
                elif space_path is None and space_seal is None and space_units is None:
                    # An abstract (fileless) home resumes at its recorded weight.
                    space_units = self._home.read_space_units()
            if pin_dir is None:
                pin_dir = self._home.pins_dir  # the home's canonical CAS pin lane

        self.identity = identity
        # Phase 11: a farmer may boot from a .cseal SpaceSeal file. The file is
        # the source of truth for space_units; if abstract units are ALSO
        # passed they must match, else SPACE_UNITS_MISMATCH.
        self.space_path = space_path
        self._file_seal = self._resolve_file_seal(space_path, space_seal)
        if self._file_seal is not None:
            file_units = self._file_seal["space_units"]
            if space_units is not None and space_units != file_units:
                raise NodeError(
                    f"SPACE_UNITS_MISMATCH: abstract {space_units} != file {file_units}")
            space_units = file_units
        elif space_units is None:
            raise NodeError("space_units or a space file (.cseal) is required")

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

        # The farmer's PlotCommitment (SpaceSeal). File-backed nodes use the
        # SpaceSeal from their .cseal; abstract nodes derive one from their
        # pinset. Either way the slot lottery runs on integer space units.
        if self._file_seal is not None:
            self.plot_commitment = dict(self._file_seal)
        else:
            from .slotheader import commitment_for_node
            self.plot_commitment = commitment_for_node(identity, self.cas)
        self.last_slot_header: dict | None = None
        self.slot_headers: list[dict] = []  # the infusion chain, in order

        # Phase 14: a node-local Chronos credit ledger (blood, not consensus).
        # Every produced (won) slot credits space/pin/compute/treasury accounts;
        # credits grant no salience, no vote weight, no lottery weight. Home
        # nodes also persist to home/rewards.jsonl. `compute_receipts` buffers
        # attested compute receipts for the next produced slot.
        self.reward_credits: list[dict] = []
        self.compute_receipts: list = []

        # Phase 12: optional on-disk CAS pin lane bound to the SpaceSeal's
        # cas_root. A pin failure is an I3 nervous event, never a space defect.
        self.pin_dir = pin_dir
        if pin_dir is not None:
            from chronarch_core import PinStore
            self.pin_store = PinStore(pin_dir)
        else:
            self.pin_store = None

        # Phase 13: wire durable persistence last, once boot + ledger are ready.
        if self._home is not None:
            if resuming:
                self._resume_from_home()
                # Phase 14: reload the persisted Chronos credit ledger so the
                # resumed node reports the same totals (rewards are appended,
                # never replayed through the Timechain).
                self.reward_credits = self._home.read_rewards()
            else:
                # Fresh home: record identity + the boot-ok receipt, and copy
                # the farmed .cseal in so a resume can reopen it. The ledger is
                # JSONL node state — it is NEVER written into a .cseal.
                self._home.initialize(self.identity, self.boot["report"], self.space_units)
                if self.space_path is not None and self.space_path != self._home.space_seal_path:
                    self._home.copy_space_seal(self.space_path)
                # Abstract home node: persist its boot CAS onto the disk pin
                # lane so the organism honors its own cas_root across a restart
                # (a later withhold is then a real I3). A file-backed node's
                # cas_root is the .cseal's own commitment — its pin lane stays
                # operator-managed (Phase 12), so we never overwrite it here.
                if self._file_seal is None and self.pin_store is not None:
                    self._mirror_boot_cas()
            self._persist_enabled = True  # append-on-write starts now

    def verify_pins(self, *, slot: int = 0) -> dict:
        """Check the pin lane against the SpaceSeal's cas_root. Returns
        {ok, code, restriction}; an unconfigured node is trivially PINS_OK.
        A PIN_MISSING/PIN_MISMATCH is nervous (I3) — it never invalidates the
        space file and never changes lottery winners."""
        from chronarch_farm import PINS_OK, verify_pins as _verify_pins
        if self.pin_store is None:
            return {"ok": True, "code": PINS_OK, "restriction": None}
        return _verify_pins(self.plot_commitment, self.pin_store, slot=slot)

    # -- durable home: persist + resume (Phase 13) -------------------------
    def _home_append(self, entry: dict, *, head: bool = False) -> None:
        """Append one ledger object to home/ledger (no-op for an in-memory
        node, so tests stay fast). `head=True` also refreshes the O(1) resume
        commitment after the ledger advanced."""
        if self._home is None or not self._persist_enabled:
            return
        self._home.append(entry)
        if head:
            self._home.write_head(self.ledger.head_state())

    def _persist_ring(self, msg: dict) -> None:
        self._home_append({
            "t": "ring", "ring_type": msg["ring_type"], "body": msg["body"],
            "author": msg["author"], "slot": msg["slot"],
            "witnesses": msg.get("witnesses", []),
            "height": msg["height"], "ring_hash": msg["ring_hash"],
        }, head=True)

    def _mirror_boot_cas(self) -> None:
        """Copy every boot-CAS object onto the disk pin lane. CAS and PinStore
        hash identically (hash_bytes of canonical bytes), so the mirrored
        PinStore.cas_root() equals the node's committed cas_root."""
        from chronarch_core import PinError
        for digest in self.cas.pins():
            data = self.cas.get(digest)
            try:
                self.pin_store.put(data, kind="object")
            except PinError:
                self.pin_store.put(data, kind="opaque")

    def _resume_from_home(self) -> None:
        """Replay the durable home into this freshly-booted node. Fail closed:
        a kernel/Ring 0 drift, a truncated/hash-broken log, or a head
        commitment that disagrees with the replayed rings all raise."""
        home = self._home
        stored = home.read_boot()
        cur = self.boot["report"]
        if (stored.get("ring0_hash") != cur["ring0_hash"]
                or stored.get("kernel_hash") != cur["kernel_hash"]):
            raise HomeError(
                "HOME_KERNEL_MISMATCH: home genesis kernel/Ring 0 differs from "
                "this node's kernel — refusing to resume under a different kernel")
        for entry in home.read_log():  # read_log fails closed on a broken tail
            kind = entry.get("t")
            if kind == "ring":
                self._replay_ring(entry)
            elif kind == "header":
                self._replay_header(entry)
            elif kind == "slot_header":
                self._replay_slot_header(entry)
            elif kind == "challenge":
                self._apply_challenge(
                    {"result": entry["result"], "slot": entry.get("slot", 0)})
            else:
                raise HomeError(f"unknown ledger entry type {kind!r} on resume")
        # O(1) resume commitment (Timechain head_state). A committed head BEYOND
        # the replayed rings means the log lost its tail (truncation); a hash
        # that differs at the committed height means a fork. A head that merely
        # lagged (a crash between the ring append and the head refresh) is not
        # corruption — the extra rings were each hash-checked above.
        head = home.read_head()
        if head is not None:
            committed_height, committed_hash = head["height"], head["head_hash"]
            if committed_height > self.ledger.height:
                raise HomeError(
                    "ledger head commitment is beyond the replayed rings — "
                    "refusing to resume a truncated chain")
            if self.ledger.hash_at(committed_height) != committed_hash:
                raise HomeError(
                    "ledger head commitment does not match the replayed chain "
                    "— refusing to resume a forked chain")

    def _replay_ring(self, entry: dict) -> None:
        if entry.get("height") != self.ledger.height + 1:
            raise HomeError(f"ledger log out of order near height {entry.get('height')}")
        try:
            ring = self.ledger.seal(
                entry["ring_type"], entry["body"], author=entry["author"],
                slot=entry["slot"], witnesses=entry.get("witnesses", []))
        except (KeyError, ValueError) as exc:
            raise HomeError(f"corrupt ledger ring on resume: {exc}") from None
        if ring_hash(ring) != entry.get("ring_hash"):
            raise HomeError(
                f"ledger ring hash mismatch at height {ring['height']} — "
                "refusing to resume a corrupt chain")

    def _replay_header(self, entry: dict) -> None:
        header = entry["header"]
        validate("Header", header)
        if header["prev_header_hash"] != self.last_header_hash:
            raise HomeError("ledger header link broken on resume")
        self._accept_header(header)

    def _replay_slot_header(self, entry: dict) -> None:
        from .slotheader import verify_slot_header
        slot_header = entry["slot_header"]
        leader = slot_header.get("leader")
        result = verify_slot_header(
            slot_header, space_units=self.space_table.get(leader, 0),
            prev_slot_header=self.last_slot_header)
        if not result["ok"]:
            raise HomeError(f"stored slot header invalid on resume: {result['error_code']}")
        self.last_slot_header = slot_header
        self.slot_headers.append(slot_header)

    @staticmethod
    def _resolve_file_seal(space_path: str | None, space_seal: dict | None) -> dict | None:
        """Read/validate a SpaceSeal from a .cseal path or an in-memory seal.
        Any file problem surfaces as a NodeError so the process does not farm
        on a bad file."""
        if space_path is None and space_seal is None:
            return None
        from chronarch_farm import SpaceFileError, read_space_seal, verify_space_seal
        try:
            if space_path is not None:
                seal = read_space_seal(space_path)
                if space_seal is not None and verify_space_seal(dict(space_seal)) != seal:
                    raise NodeError("SPACE_UNITS_MISMATCH: space_seal disagrees with file")
                return seal
            return verify_space_seal(dict(space_seal))
        except NodeError:
            raise
        except (SpaceFileError, OSError, ValueError) as exc:
            raise NodeError(f"bad space file: {exc}") from None

    def verify_space(self) -> bool:
        """Re-read the .cseal (if file-backed) and confirm it still matches the
        booted SpaceSeal + units. Abstract nodes always return True. The slot
        loop MAY call this before produce_slot; a file that went invalid means
        skip leadership this slot — never crash the process."""
        if self.space_path is None:
            return True
        from chronarch_farm import SpaceFileError, read_space_seal
        try:
            seal = read_space_seal(self.space_path)
        except (SpaceFileError, OSError, ValueError):
            return False
        return (seal.get("space_units") == self.space_units
                and seal.get("plot_id") == self.plot_commitment.get("plot_id"))

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
        # Phase 11: a file-backed farmer whose .cseal went invalid mid-run
        # skips leadership this slot rather than crashing (or forging a proof).
        if self.space_path is not None and not self.verify_space():
            return []
        body = {"event": "slot", "slot": slot, "leader": leader,
                "issuance": slot_issuance_chronons(slot)}
        ring = self.ledger.seal("economic", body, author=leader, slot=slot)
        self._persist_ring({
            "ring_type": "economic", "body": body, "author": leader,
            "slot": slot, "witnesses": [], "height": ring["height"],
            "ring_hash": ring_hash(ring)})
        header = self.build_header(slot, leader)
        # Phase 6: attach a valid ProofOfSpace SlotHeader for this slot. The
        # difficulty uses the farmer's declared space (the same units the
        # lottery weighs), so a legitimate leader always produces a valid
        # proof deterministically.
        from .slotheader import build_slot_header
        slot_header = build_slot_header(
            slot=slot, leader=leader, commitment=self.plot_commitment,
            space_units=self.space_table.get(leader, self.space_units),
            prev_slot_header=self.last_slot_header)  # infusion chain
        self.last_slot_header = slot_header
        self.slot_headers.append(slot_header)
        self._home_append({"t": "slot_header", "slot_header": slot_header})
        self._accept_header(header)
        # Phase 14: credit this winning slot. Rewards are a separate ledger —
        # they do not enter the gossip messages, the consensus ring, or any
        # legality decision.
        self._issue_slot_reward(slot, leader)
        return [
            # SlotHeader first: a follower verifies the proof before applying
            # the slot ring, and rejects the slot if it fails.
            {"kind": "slot_header", "slot_header": slot_header, "leader": leader},
            {"kind": "ring", "ring_type": "economic", "body": body,
             "author": leader, "slot": slot, "witnesses": [],
             "height": ring["height"], "ring_hash": ring_hash(ring)},
            {"kind": "header", "header": header, "leader": leader},
        ]

    # -- Chronos issuance (Phase 14) ---------------------------------------
    def submit_compute_receipt(self, receipt) -> dict:
        """Attest a compute receipt and, only if it verifies, buffer it for the
        next won slot (Phase 15). Attestation replays a DummyMind faculty or
        runs a gym oracle — an unattested receipt is REJECTED and never
        buffered, so COMPUTE is paid only for work that actually happened. A
        receipt is inert data: it never enters a Challenge or Ballot.

        Returns the attestation result {ok, code, detail}; raises NodeError on
        an unattested receipt (do not buffer)."""
        from chronarch_core import attest_compute
        result = attest_compute(receipt, self)
        if not result["ok"]:
            raise NodeError(f"compute receipt rejected: {result['code']}: {result['detail']}")
        self.compute_receipts.append(receipt)
        return result

    def _issue_slot_reward(self, slot: int, leader: str) -> list[dict]:
        """Credit space/pin/compute/treasury for a slot this node won. Records
        the credits in the node ledger (and home/rewards.jsonl when home is
        set). Never touches Hearth, salience, vote weight, or the lottery."""
        from chronarch_core import reward_slot
        # A pin-ok farmer earns the pin share; a pin-failing (or unconfigured
        # but committed) node is NOT paid the pin share (pin-fail-still-paid is
        # a rejected idea). This node can only vouch its own pin health.
        pin_ok_ids = [leader] if self.verify_pins(slot=slot)["ok"] else []
        receipts = self.compute_receipts
        self.compute_receipts = []  # consumed this slot
        credits = reward_slot(slot, leader, pin_ok_ids=pin_ok_ids,
                              compute_receipts=receipts)
        recorded = []
        for credit in credits:
            entry = credit.as_dict()
            self.reward_credits.append(entry)
            if self._home is not None:
                self._home.append_reward(entry)
            recorded.append(entry)
        return recorded

    def reward_totals(self) -> dict:
        """Totals by reason (space|pin|compute|treasury) over this node's
        credit ledger, plus the last slot credited."""
        from chronarch_core import totals_by_reason
        last_slot = max((c["slot"] for c in self.reward_credits), default=None)
        return {"totals": totals_by_reason(self.reward_credits),
                "last_slot": last_slot, "credits": len(self.reward_credits)}

    def _accept_header(self, header: dict) -> None:
        self.headers.append(header)
        self.last_header_hash = self.header_hash(header)
        self._home_append({"t": "header", "header": header})

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
        # Verify against THIS follower's prev slot header — the infusion chain
        # is recomputed, so a forged infused_challenge is rejected.
        result = verify_slot_header(
            slot_header, space_units=self.space_table.get(leader, 0),
            prev_slot_header=self.last_slot_header)
        if not result["ok"]:
            raise NodeError(f"slot rejected: {result['error_code']}")
        self.last_slot_header = slot_header
        self.slot_headers.append(slot_header)
        self._home_append({"t": "slot_header", "slot_header": slot_header})

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
        self._persist_ring(msg)

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
            self._home_append({"t": "challenge", "result": result,
                               "slot": msg.get("slot", 0)})

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
        self._persist_ring({
            "ring_type": ring_type, "body": body, "author": self.identity,
            "slot": slot, "witnesses": [], "height": ring["height"],
            "ring_hash": ring_hash(ring)})
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
            self._home_append({"t": "challenge", "result": result, "slot": slot})
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
        if self.pin_store is None:
            return vector
        # Additive pin health (does not alter the sealed HealthVector object).
        pins = self.verify_pins(slot=slot)
        return {**vector, "pins": {"ok": pins["ok"], "code": pins["code"],
                                   "i3": pins["restriction"]}}

    # tx admission, so a CLI can prove override rejection end to end.
    def _rpc_submit_tx(self, params: dict) -> dict:
        tx = params.get("tx", {})
        slot = int(params.get("slot", self.ledger.height))
        result = admit_tx(tx, chain=self.ledger, slot=slot, hearth=self.hearth)
        return {"accepted": result.accepted, "reason": result.reason,
                "scar_hash": result.scar_hash, "slashed": result.slashed}

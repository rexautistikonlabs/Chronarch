"""Council proposal state machine (K14).

Invariant: Major change is a proposal ring plus a slashing-backed vote,
not an AI rewrite and not an admin key.

The only legal path to enact a MAJOR change:

  draft -> Proposal ring (inert spec hash) -> mandatory gym + health report
        -> voting window -> Ballot rings -> tally -> result ring
        -> if approved AND genesis-legal: activation grant at height H

* Approval needs BOTH: yes bond weight >= 2/3 of ELIGIBLE bond weight AND
  yes seats > 1/2 of eligible seats. Eligible totals are the denominator —
  abstention counts against a proposal (the turnout floor).
* An approved-but-illegal proposal (G16) is INVALID: yes voters are slashed
  and a Scar is sealed at I8. There is no override for this, including by
  unanimous vote.
* Chronarch may draft and submit; it cannot vote, cannot tally its own
  legality, and holds no key this module reads (G15/G17).
"""
from __future__ import annotations

import copy

from chronarch_spec import chash, validate
from chronarch_spec.constants import (
    ACTIVATION_DELAY_SLOTS,
    COMMUNITY_PROPOSAL_DEPOSIT_CHRONONS,
    COUNCIL_APPROVE_WEIGHT_DEN,
    COUNCIL_APPROVE_WEIGHT_NUM,
    GYM_TARGET_CLASSES,
    VOTING_WINDOW_SLOTS,
)


class CouncilError(ValueError):
    pass


class IllegalProposalError(CouncilError):
    """The proposal violates G1..G13 — ratifying it is invalid + slashable."""


# Change-key patterns that no vote can legalize (G16). Matching is on the
# lowered param path AND on string values.
_ILLEGAL_PATTERNS = (
    ("genesis_law.g1", "repeal or weaken G1 (append-only history)"),
    ("genesis_law.g2", "repeal or weaken G2 (judgment not for sale)"),
    ("genesis_law.g3", "repeal or weaken G3 (live-registry only)"),
    ("genesis_law.g4", "repeal or weaken G4 (authored code inert)"),
    ("genesis_law.g5", "repeal or weaken G5 (scars cannot be pruned)"),
    ("genesis_law.g6", "repeal or weaken G6 (claims false until challenge)"),
    ("genesis_law.g7", "repeal or weaken G7 (covenant is constitution)"),
    ("genesis_law.g8", "repeal or weaken G8 (identity/continuum split)"),
    ("genesis_law.g9", "repeal or weaken G9 (commitments not embeddings)"),
    ("genesis_law.g10", "repeal or weaken G10 (advisory PoQ)"),
    ("genesis_law.g11", "repeal or weaken G11 (deterministic bootstrap)"),
    ("genesis_law.g12", "repeal or weaken G12 (gym scope)"),
    ("genesis_law.g13", "repeal or weaken G13 (hearth cannot override law)"),
    ("edit_ring", "mutate past rings (G1)"),
    ("delete_ring", "delete past rings (G1)"),
    ("prune_scar", "prune scars (G5)"),
    ("delete_scar", "delete scars (G5)"),
    ("unpin_evidence", "un-pin evidence (G5)"),
    ("challenge.flip", "flip challenge results (G2)"),
    ("challenge_result", "flip challenge results (G2)"),
    ("disable_immune", "disable the immune system"),
    ("immune.enabled", "disable the immune system"),
    ("mint_", "mint Chronos outside issuance"),
)


def check_legality(proposal: dict) -> None:
    """Raise IllegalProposalError if the proposal violates G1..G13.

    Schema validation has already screened forbidden key tokens (admin_key,
    helm_override, ...) recursively — a proposal carrying one never gets
    this far. This check covers semantic violations.
    """
    for path, value in proposal["changes"].items():
        lowered = str(path).lower()
        for pattern, why in _ILLEGAL_PATTERNS:
            if pattern in lowered:
                raise IllegalProposalError(f"{path!r}: {why}")
        if isinstance(value, str):
            lowered_value = value.lower()
            for pattern, why in _ILLEGAL_PATTERNS:
                if pattern in lowered_value:
                    raise IllegalProposalError(f"{path!r} value: {why}")

    if proposal["major_class"] == "M5":
        # Widening the gym is votable ONLY within Chronarch classes (G12).
        for path, value in proposal["changes"].items():
            if "target_class" in str(path).lower():
                if not (isinstance(value, str) and value in GYM_TARGET_CLASSES
                        or isinstance(value, str) and value.startswith("chronarch_")):
                    raise IllegalProposalError(
                        f"M5 cannot widen the gym beyond Chronarch targets (G12): {value!r}"
                    )


class CouncilState:
    def __init__(self, hearth) -> None:
        self._hearth = hearth
        self._seats: dict[str, dict] = {}  # seat -> {identity, pinset_size, last_challenge_pass_slot}
        self._proposals: dict[str, dict] = {}
        self._results: dict[str, dict] = {}
        self.slash_log: list[dict] = []

    # -- seats ----------------------------------------------------------------
    def register_seat(self, seat: str, identity: str, *, pinset_size: int,
                      last_challenge_pass_slot: int) -> None:
        self._seats[seat] = {
            "identity": identity,
            "pinset_size": pinset_size,
            "last_challenge_pass_slot": last_challenge_pass_slot,
        }

    def eligible_seats(self, slot: int) -> dict[str, int]:
        """seat -> bond weight (chronons), for seats meeting every floor."""
        out = {}
        for seat, info in self._seats.items():
            if self._hearth.council_eligible(
                info["identity"], slot=slot,
                pinset_size=info["pinset_size"],
                last_challenge_pass_slot=info["last_challenge_pass_slot"],
            ):
                out[seat] = self._hearth.position(info["identity"])["bond_leg_chronons"]
        return out

    # -- proposal lifecycle ----------------------------------------------------
    def submit_proposal(self, proposal: dict, *, chain, slot: int) -> dict:
        validate("Proposal", proposal)  # screens forbidden keys recursively
        if proposal["proposal_id"] in self._proposals:
            raise CouncilError("duplicate proposal_id")
        if proposal["proposer"].startswith("community") and \
                proposal["deposit_chronons"] < COMMUNITY_PROPOSAL_DEPOSIT_CHRONONS:
            raise CouncilError("community proposal underfunded (deposit floor)")
        entry = {
            "proposal": copy.deepcopy(proposal),
            "status": "proposed",
            "voting_opens_slot": None,
            "voting_deadline_slot": None,
            "eligible_snapshot": None,
            "ballots": {},
        }
        self._proposals[proposal["proposal_id"]] = entry
        chain.seal("proposal", {"proposal": copy.deepcopy(proposal)},
                   author=proposal["proposer"], slot=slot)
        return copy.deepcopy(proposal)

    def attach_reports(self, proposal_id: str, *, transmission_report_hash: str,
                       gym_report_hash: str, chain, slot: int) -> None:
        """Mandatory gym + health-impact report; only then does voting open."""
        entry = self._require(proposal_id)
        if entry["status"] != "proposed":
            raise CouncilError(f"cannot attach reports in status {entry['status']}")
        if not transmission_report_hash or not gym_report_hash:
            raise CouncilError("gym + transmission reports are mandatory before voting")
        entry["proposal"]["transmission_report_hash"] = transmission_report_hash
        entry["proposal"]["gym_report_hash"] = gym_report_hash
        entry["status"] = "voting"
        entry["voting_opens_slot"] = slot
        entry["voting_deadline_slot"] = slot + VOTING_WINDOW_SLOTS
        entry["eligible_snapshot"] = self.eligible_seats(slot)
        if not entry["eligible_snapshot"]:
            raise CouncilError("no eligible council seats — cannot open voting")
        chain.seal("council", {
            "event": "voting_open",
            "proposal_id": proposal_id,
            "eligible_seats": sorted(entry["eligible_snapshot"]),
            "deadline_slot": entry["voting_deadline_slot"],
        }, author="council", slot=slot)

    def cast_ballot(self, ballot: dict, *, chain, slot: int) -> None:
        validate("Ballot", ballot)
        entry = self._require(ballot["proposal_id"])
        if entry["status"] != "voting":
            raise CouncilError(f"voting is not open (status {entry['status']})")
        if slot > entry["voting_deadline_slot"]:
            raise CouncilError("voting window closed")
        seat = ballot["seat"]
        snapshot = entry["eligible_snapshot"]
        if seat not in snapshot:
            raise CouncilError(f"seat {seat!r} not eligible for this vote")
        if seat in entry["ballots"]:
            # Double vote: slash and refuse (slash backing, COUNCIL.md).
            identity = self._seats[seat]["identity"]
            seized = self._hearth.slash(identity, reason="double ballot", slot=slot)
            self.slash_log.append({"identity": identity, "reason": "double_ballot",
                                   "seized": seized, "slot": slot})
            chain.seal_scar("I10", f"double ballot from seat {seat}", [],
                            author="council", slot=slot)
            raise CouncilError(f"double ballot from {seat!r} — slashed")
        if ballot["bond_weight_chronons"] != snapshot[seat]:
            raise CouncilError("ballot weight does not match eligibility snapshot")
        entry["ballots"][seat] = copy.deepcopy(ballot)
        chain.seal("ballot", {"ballot": copy.deepcopy(ballot)},
                   author=self._seats[seat]["identity"], slot=slot)

    def tally(self, proposal_id: str, *, chain, slot: int) -> dict:
        entry = self._require(proposal_id)
        if entry["status"] != "voting":
            raise CouncilError(f"nothing to tally (status {entry['status']})")
        snapshot = entry["eligible_snapshot"]
        all_voted = set(entry["ballots"]) == set(snapshot)
        if slot <= entry["voting_deadline_slot"] and not all_voted:
            raise CouncilError("voting window still open")

        eligible_weight = sum(snapshot.values())
        eligible_seat_count = len(snapshot)
        yes = [b for b in entry["ballots"].values() if b["vote"] == "yes"]
        yes_weight = sum(b["bond_weight_chronons"] for b in yes)
        yes_seat_count = len(yes)

        weight_ok = yes_weight * COUNCIL_APPROVE_WEIGHT_DEN >= \
            eligible_weight * COUNCIL_APPROVE_WEIGHT_NUM
        seats_ok = yes_seat_count * 2 > eligible_seat_count
        approved = weight_ok and seats_ok

        outcome: str
        activation_slot = None
        if not approved:
            outcome = "expired" if slot > entry["voting_deadline_slot"] and not entry["ballots"] else "rejected"
        else:
            try:
                check_legality(entry["proposal"])
            except IllegalProposalError as exc:
                # G16: invalid + slash every yes voter + Scar at I8.
                outcome = "invalid"
                for ballot in yes:
                    identity = self._seats[ballot["seat"]]["identity"]
                    seized = self._hearth.slash(
                        identity, reason=f"yes on illegal proposal: {exc}", slot=slot)
                    self.slash_log.append({
                        "identity": identity, "reason": "illegal_ratification",
                        "seized": seized, "slot": slot,
                    })
                chain.seal_scar(
                    "I8",
                    f"illegal ratification attempt on {proposal_id}: {exc}",
                    [chash("Proposal", entry["proposal"])],
                    author="council", slot=slot,
                )
                result = self._seal_result(entry, proposal_id, outcome, chain, slot,
                                           yes_weight, eligible_weight,
                                           yes_seat_count, eligible_seat_count,
                                           activation_slot)
                return result
            outcome = "approved"
            activation_slot = slot + ACTIVATION_DELAY_SLOTS

        return self._seal_result(entry, proposal_id, outcome, chain, slot,
                                 yes_weight, eligible_weight,
                                 yes_seat_count, eligible_seat_count,
                                 activation_slot)

    def _seal_result(self, entry, proposal_id, outcome, chain, slot,
                     yes_weight, eligible_weight, yes_seats, eligible_seats,
                     activation_slot):
        entry["status"] = outcome
        result = {
            "proposal_id": proposal_id,
            "outcome": outcome,
            "yes_weight": yes_weight,
            "eligible_weight": eligible_weight,
            "yes_seats": yes_seats,
            "eligible_seats": eligible_seats,
            "activation_slot": activation_slot,
            "proposal_hash": chash("Proposal", entry["proposal"]),
        }
        ring = chain.seal("council", {"event": "result", **result},
                          author="council", slot=slot)
        from chronarch_core.chain import ring_hash
        result["result_ring_hash"] = ring_hash(ring)
        self._results[proposal_id] = copy.deepcopy(result)
        return copy.deepcopy(result)

    # -- activation grants (the ONLY bridge to the registry, M3) ----------------
    def make_activation_grant(self, proposal_id: str, *, at_slot: int) -> dict:
        result = self._results.get(proposal_id)
        if result is None:
            raise CouncilError("no tally result for this proposal")
        if result["outcome"] != "approved":
            raise CouncilError(f"proposal outcome is {result['outcome']!r}, not approved")
        if at_slot < result["activation_slot"]:
            raise CouncilError(
                f"activation height not reached ({at_slot} < {result['activation_slot']})"
            )
        entry = self._proposals[proposal_id]
        return {
            "proposal_id": proposal_id,
            "major_class": entry["proposal"]["major_class"],
            "code_hash": entry["proposal"]["changes"].get("faculty_code_hash", ""),
            "result_ring_hash": result["result_ring_hash"],
            "activation_slot": result["activation_slot"],
            "granted_at_slot": at_slot,
        }

    def verify_activation_grant(self, grant: dict, *, code_hash: str) -> None:
        """Called by the registry. Re-verifies against stored results —
        a forged grant dict fails here."""
        if not isinstance(grant, dict):
            raise CouncilError("grant must be an object")
        result = self._results.get(grant.get("proposal_id", ""))
        if result is None:
            raise CouncilError("grant references no tallied proposal")
        if result["outcome"] != "approved":
            raise CouncilError("grant references a non-approved proposal")
        if grant.get("result_ring_hash") != result["result_ring_hash"]:
            raise CouncilError("grant result ring does not match the tally")
        entry = self._proposals[grant["proposal_id"]]
        if entry["proposal"]["major_class"] != "M3":
            raise CouncilError("activation grants require an M3 proposal")
        if entry["proposal"]["changes"].get("faculty_code_hash") != code_hash:
            raise CouncilError("grant is not for this faculty's code hash")
        if grant.get("granted_at_slot", -1) < result["activation_slot"]:
            raise CouncilError("activation height not reached")

    # -- misc -------------------------------------------------------------------
    def _require(self, proposal_id: str) -> dict:
        if proposal_id not in self._proposals:
            raise CouncilError(f"unknown proposal {proposal_id!r}")
        return self._proposals[proposal_id]

    def result(self, proposal_id: str) -> dict | None:
        r = self._results.get(proposal_id)
        return copy.deepcopy(r) if r else None

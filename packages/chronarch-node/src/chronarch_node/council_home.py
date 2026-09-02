"""Council operator layer on a home (Phase 20).

The Council's dynamic voting state — proposals, ballots, results, and the slash
log — is persisted in `home/council.json` so an operator can propose, cast, and
tally across separate CLI invocations. G14 is untouched: this only CALLS the
frozen Council machine (submit_proposal / attach_reports / cast_ballot / tally /
make_peer_grant); it never rewrites the lien/slash/tally math, never adds an
admin key, and never lets an AI self-enact.

The **fleet** is the Council: each identity in `home/peers.json` is a bonded
steward with a seat. Bonds, durable slashes, and open ballot liens are
reconstructed each session from the fleet + the persisted slash log; only the
voting state itself is stored. Council is JSON node state — it is never put
inside a `.cseal`.
"""
from __future__ import annotations

from chronarch_council import CouncilError, CouncilState
from chronarch_core import Timechain
from chronarch_hearth import HearthError, HearthState
from chronarch_spec import build_kernel, build_ring0, canonical_bytes, chash, screen_keys
from chronarch_spec.constants import MIN_PINSET_SIZE, VOTING_WINDOW_SLOTS

from .cluster import STEWARD_LOCK_CHRONONS
from .home import NodeHome
from .node import NodeError
from .peers import PEER_CHANGE_MAJOR_CLASS, space_table_from_peers

# Deterministic lab slots for the CLI council chain (a throwaway Timechain; the
# durable state is council.json). Voting opens at slot 0; a tally past the
# window settles it.
PROPOSE_SLOT = 0
TALLY_SLOT = VOTING_WINDOW_SLOTS + 1
COUNCIL_STATE_VERSION = 1


class CouncilHomeError(NodeError):
    """A council-home problem: no fleet, or a corrupt council.json (fail closed)."""


def seat_name(identity: str) -> str:
    return f"seat:{identity}"


# -- closed schema for council.json ----------------------------------------
def verify_council_state(state) -> dict:
    """Validate the closed council-state schema. Fail closed (CouncilHomeError)
    on any structural hole; K18-screened; floats banned."""
    if not isinstance(state, dict):
        raise CouncilHomeError("council.json is not an object")
    screen_keys(state)  # K18 forbidden-key screen
    if set(state) != {"version", "proposals", "results", "slash_log"}:
        raise CouncilHomeError(
            "council.json keys must be exactly {version, proposals, results, slash_log}")
    if state["version"] != COUNCIL_STATE_VERSION:
        raise CouncilHomeError(f"unsupported council.json version {state['version']!r}")
    if not isinstance(state["proposals"], dict) or not isinstance(state["results"], dict):
        raise CouncilHomeError("council.json proposals/results must be objects")
    if not isinstance(state["slash_log"], list):
        raise CouncilHomeError("council.json slash_log must be a list")
    try:
        canonical_bytes(state)  # bans floats / exotic types
    except Exception as exc:  # noqa: BLE001 - surface as a fail-closed council error
        raise CouncilHomeError(f"council.json is not canonically encodable: {exc}") from None
    return state


# -- load / save ------------------------------------------------------------
def load_council(home: str):
    """Reconstruct (council, chain, hearth, fleet) for a home. The fleet is the
    steward set (peers.json); bonds, durable slashes, and open liens are
    rebuilt, then the persisted voting state is imported."""
    node_home = NodeHome(home)
    if not node_home.is_initialized():
        raise CouncilHomeError(f"BAD_HOME: no node home at {home}")
    if not node_home.has_peers():
        raise CouncilHomeError(
            "no council: this home has no peers.json fleet (governance is a net concept)")
    fleet = space_table_from_peers(node_home.read_peers())

    hearth = HearthState()
    council = CouncilState(hearth)
    chain = Timechain(build_ring0(build_kernel()))
    for identity in sorted(fleet):
        hearth.lock(identity, STEWARD_LOCK_CHRONONS, slot=PROPOSE_SLOT)
        council.register_seat(seat_name(identity), identity,
                              pinset_size=MIN_PINSET_SIZE,
                              last_challenge_pass_slot=PROPOSE_SLOT)

    raw = node_home.read_council()  # HomeError on a corrupt file
    if raw is not None:
        state = verify_council_state(raw)
        council.import_state(state)
        # Durable slashes: re-slash every slashed steward so an approved abuse
        # stays punished across restarts.
        for identity in sorted({e["identity"] for e in state["slash_log"]}):
            try:
                hearth.slash(identity, reason="restored_slash", slot=PROPOSE_SLOT)
            except HearthError:
                pass
        # Open ballot liens: a mid-voting proposal keeps its voters liened.
        for proposal_id, entry in state["proposals"].items():
            if entry.get("status") == "voting":
                for seat in entry.get("ballots", {}):
                    identity = _seat_identity(fleet, seat)
                    if identity is not None:
                        try:
                            hearth.add_lien(identity, f"ballot:{proposal_id}")
                        except HearthError:
                            pass
    return council, chain, hearth, fleet


def _seat_identity(fleet: dict, seat: str) -> str | None:
    prefix = "seat:"
    if seat.startswith(prefix) and seat[len(prefix):] in fleet:
        return seat[len(prefix):]
    return None


def save_council(home: str, council: CouncilState) -> None:
    state = {"version": COUNCIL_STATE_VERSION, **council.export_state()}
    verify_council_state(state)
    NodeHome(home).write_council(state)


# -- operations (each loads, calls the frozen machine, then persists) -------
def council_propose(home: str, proposal: dict, *, slot: int = PROPOSE_SLOT) -> dict:
    """Submit a proposal and open voting (attach the mandatory gym/transmission
    reports — lab placeholders here, real reports in production), then persist.
    Proposing enacts nothing."""
    council, chain, _hearth, _fleet = load_council(home)
    council.submit_proposal(proposal, chain=chain, slot=slot)
    council.attach_reports(
        proposal["proposal_id"],
        transmission_report_hash=chash("LabTransmissionReport", proposal),
        gym_report_hash=chash("LabGymReport", proposal),
        chain=chain, slot=slot)
    save_council(home, council)
    return {"proposal_id": proposal["proposal_id"], "status": "voting",
            "major_class": proposal["major_class"]}


def council_cast(home: str, proposal_id: str, identity: str, vote: str, *,
                 slot: int = PROPOSE_SLOT) -> dict:
    """Cast a ballot for `identity`'s seat through the REAL Ballot path (weight,
    eligibility, lien, double-vote slash), then persist."""
    council, chain, _hearth, fleet = load_council(home)
    if identity not in fleet:
        raise CouncilError(f"{identity!r} is not a steward in this fleet")
    seat = seat_name(identity)
    snapshot = (council.export_state()["proposals"].get(proposal_id, {})
                .get("eligible_snapshot") or {})
    if seat not in snapshot:
        raise CouncilError(f"seat {seat!r} is not eligible for {proposal_id!r}")
    ballot = {"proposal_id": proposal_id, "seat": seat, "vote": vote,
              "bond_weight_chronons": snapshot[seat], "cast_slot": slot}
    try:
        council.cast_ballot(ballot, chain=chain, slot=slot)
    except CouncilError:
        # A double ballot slashes the voter (COUNCIL.md) before raising —
        # persist so that slash is durable, then re-raise.
        save_council(home, council)
        raise
    save_council(home, council)
    return {"proposal_id": proposal_id, "seat": seat, "identity": identity,
            "vote": vote, "status": "cast"}


def council_tally(home: str, proposal_id: str, *, homes_to_ratify=None,
                  tally_slot: int = TALLY_SLOT, at_slot: int | None = None) -> dict:
    """Tally through the frozen tally() (illegal → slash + I8), persist, and —
    when approved AND it is a peer change AND `homes_to_ratify` is given — apply
    the change via ratify_peer_change. Otherwise an approved peer change reports
    needs_ratify."""
    from .net import ratify_peer_change

    council, chain, _hearth, _fleet = load_council(home)
    result = council.tally(proposal_id, chain=chain, slot=tally_slot)
    save_council(home, council)  # persists result + any slashes

    out = {"proposal_id": proposal_id, "outcome": result["outcome"],
           "yes_seats": result["yes_seats"], "eligible_seats": result["eligible_seats"],
           "activation_slot": result["activation_slot"],
           "slashes": len(council.slash_log)}
    proposal = council.export_state()["proposals"][proposal_id]["proposal"]
    is_peer_change = proposal.get("major_class") == PEER_CHANGE_MAJOR_CLASS
    if result["outcome"] == "approved" and is_peer_change:
        activation = at_slot if at_slot is not None else result["activation_slot"]
        if homes_to_ratify:
            ratify = ratify_peer_change(homes_to_ratify, council, proposal_id, at_slot=activation)
            out["ratified"] = True
            out["applied"] = ratify["applied"]
        else:
            out["needs_ratify"] = True
    return out


def council_status(home: str) -> dict:
    """Read-only snapshot of a home's Council (no file is written)."""
    node_home = NodeHome(home)
    council, _chain, _hearth, fleet = load_council(home)
    state = council.export_state()
    proposals = []
    for proposal_id, entry in state["proposals"].items():
        result = state["results"].get(proposal_id)
        outcome = result["outcome"] if result else None
        proposal = entry["proposal"]
        is_peer_change = proposal.get("major_class") == PEER_CHANGE_MAJOR_CLASS
        needs_ratify = bool(outcome == "approved" and is_peer_change
                            and _peer_change_pending(proposal, fleet))
        proposals.append({
            "proposal_id": proposal_id,
            "status": entry["status"],
            "outcome": outcome,
            "major_class": proposal.get("major_class"),
            "ballots": len(entry.get("ballots", {})),
            "eligible": len(entry.get("eligible_snapshot") or {}),
            "needs_ratify": needs_ratify,
        })
    return {
        "identity": node_home.read_identity(),
        "seats": [seat_name(i) for i in sorted(fleet)],
        "fleet": len(fleet),
        "proposals": sorted(proposals, key=lambda p: p["proposal_id"]),
        "slashes": len(state["slash_log"]),
    }


def _peer_change_pending(proposal: dict, fleet: dict) -> bool:
    """True when an approved peer change has NOT yet been applied to the fleet
    (so status can show needs_ratify only while it is actually pending)."""
    change = proposal.get("changes", {}).get("peer_change", {})
    identity, kind = change.get("identity"), change.get("kind")
    if kind == "peer_add":
        return identity not in fleet
    if kind == "peer_remove":
        return identity in fleet
    return False

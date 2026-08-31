"""Upgrade path is Proposal + Ballot ONLY (G14/G15/G16/G17).

Chronarch cannot self-enact; a forged grant fails; an illegal proposal is
invalid even when unanimously approved — yes voters are slashed and a Scar
is sealed at I8.
"""
import pytest

from chronarch_council import CouncilError, CouncilState, IllegalProposalError, check_legality
from chronarch_core import FacultyRegistry, InertFacultyError, Timechain, run_faculty
from chronarch_hearth import HearthState
from chronarch_spec import SchemaError, build_kernel, build_ring0, validate
from chronarch_spec.constants import (
    ACTIVATION_DELAY_SLOTS,
    CHRONONS_PER_CHRONOS,
    MIN_COUNCIL_BOND_CHRONONS,
)

LOCK = 2 * MIN_COUNCIL_BOND_CHRONONS  # 50/50 split -> bond leg == floor


@pytest.fixture()
def world():
    kernel = build_kernel()
    chain = Timechain(build_ring0(kernel))
    hearth = HearthState()
    council = CouncilState(hearth)
    for i in range(5):
        identity = f"steward-{i}"
        hearth.lock(identity, LOCK, slot=0)
        council.register_seat(f"seat-{i}", identity, pinset_size=4,
                              last_challenge_pass_slot=0)
    registry = FacultyRegistry()
    authored = registry.register_authored({
        "name": "authored_summarizer",
        "kind": "modality",
        "origin": "authored",
        "program": ["LOAD_INPUT", "EMIT"],
        "status": "live",  # claimed live — must be forced inert (G4)
    })
    return {"chain": chain, "hearth": hearth, "council": council,
            "registry": registry, "authored": authored}


def _proposal(world, changes=None, major_class="M3", proposer="chronarch"):
    return {
        "proposal_id": "prop-1",
        "proposer": proposer,
        "major_class": major_class,
        "spec_hash": "ab" * 32,
        "changes": changes if changes is not None else {
            "faculty_code_hash": world["authored"]["code_hash"],
        },
        "deposit_chronons": 0,
        "submitted_slot": 1,
    }


def _vote_all(world, proposal_id, vote="yes", slot=3):
    council = world["council"]
    snapshot = council.eligible_seats(slot)
    for seat, weight in snapshot.items():
        council.cast_ballot({
            "proposal_id": proposal_id,
            "seat": seat,
            "vote": vote,
            "bond_weight_chronons": weight,
            "cast_slot": slot,
        }, chain=world["chain"], slot=slot)


def test_authored_registration_is_forced_inert(world):
    assert world["authored"]["status"] == "inert"
    with pytest.raises(InertFacultyError):
        run_faculty(world["registry"], "authored_summarizer", {}, {})


def test_chronarch_cannot_self_enact_m3(world):
    """No grant, empty grant, forged grant — all fail. The faculty stays inert."""
    registry, council = world["registry"], world["council"]
    with pytest.raises(CouncilError):
        registry.activate_authored("authored_summarizer", {}, council)
    forged = {
        "proposal_id": "prop-1",
        "major_class": "M3",
        "code_hash": world["authored"]["code_hash"],
        "result_ring_hash": "cd" * 32,
        "activation_slot": 0,
        "granted_at_slot": 999,
    }
    with pytest.raises(CouncilError):
        registry.activate_authored("authored_summarizer", forged, council)
    with pytest.raises(InertFacultyError):
        run_faculty(registry, "authored_summarizer", {}, {})


def test_voting_requires_mandatory_gym_report(world):
    council = world["council"]
    council.submit_proposal(_proposal(world), chain=world["chain"], slot=1)
    with pytest.raises(CouncilError):
        council.attach_reports("prop-1", transmission_report_hash="",
                               gym_report_hash="", chain=world["chain"], slot=2)
    with pytest.raises(CouncilError):  # cannot vote before reports open the window
        _vote_all(world, "prop-1")


def test_full_legal_path_activates_at_height(world):
    council, registry = world["council"], world["registry"]
    council.submit_proposal(_proposal(world), chain=world["chain"], slot=1)
    council.attach_reports("prop-1", transmission_report_hash="11" * 32,
                           gym_report_hash="22" * 32, chain=world["chain"], slot=2)
    _vote_all(world, "prop-1", "yes", slot=3)
    result = council.tally("prop-1", chain=world["chain"], slot=3)
    assert result["outcome"] == "approved"
    assert result["activation_slot"] == 3 + ACTIVATION_DELAY_SLOTS

    # Height gate: before H the grant is refused.
    with pytest.raises(CouncilError):
        council.make_activation_grant("prop-1", at_slot=result["activation_slot"] - 1)

    grant = council.make_activation_grant("prop-1", at_slot=result["activation_slot"])
    record = registry.activate_authored("authored_summarizer", grant, council)
    assert record["status"] == "live"
    assert run_faculty(registry, "authored_summarizer", {"x": 1}, {}) == {"x": 1}


def test_insufficient_weight_rejects(world):
    council = world["council"]
    council.submit_proposal(_proposal(world), chain=world["chain"], slot=1)
    council.attach_reports("prop-1", transmission_report_hash="11" * 32,
                           gym_report_hash="22" * 32, chain=world["chain"], slot=2)
    snapshot = council.eligible_seats(3)
    seats = sorted(snapshot)
    for seat in seats[:3]:  # 3/5 by weight = 60% < 2/3
        council.cast_ballot({"proposal_id": "prop-1", "seat": seat, "vote": "yes",
                             "bond_weight_chronons": snapshot[seat], "cast_slot": 3},
                            chain=world["chain"], slot=3)
    for seat in seats[3:]:
        council.cast_ballot({"proposal_id": "prop-1", "seat": seat, "vote": "no",
                             "bond_weight_chronons": snapshot[seat], "cast_slot": 3},
                            chain=world["chain"], slot=3)
    result = council.tally("prop-1", chain=world["chain"], slot=3)
    assert result["outcome"] == "rejected"
    with pytest.raises(CouncilError):
        council.make_activation_grant("prop-1", at_slot=10**6)


def test_illegal_proposal_invalid_even_if_unanimous(world):
    """G16: council yes on a G1-violating proposal = invalid + slash + Scar I8."""
    council, hearth, chain = world["council"], world["hearth"], world["chain"]
    proposal = _proposal(world, changes={"genesis_law.G1": "history may be rewritten"},
                         major_class="M1")
    council.submit_proposal(proposal, chain=chain, slot=1)
    council.attach_reports("prop-1", transmission_report_hash="11" * 32,
                           gym_report_hash="22" * 32, chain=chain, slot=2)
    _vote_all(world, "prop-1", "yes", slot=3)
    result = council.tally("prop-1", chain=chain, slot=3)
    assert result["outcome"] == "invalid"
    # Every yes voter slashed.
    assert len(council.slash_log) == 5
    for i in range(5):
        assert not hearth.is_bonded(f"steward-{i}")
    # Scar sealed at I8, and it names the illegal ratification.
    scars = chain.scars()
    assert any(s["body"]["interface"] == "I8"
               and "illegal ratification" in s["body"]["cause"] for s in scars)
    with pytest.raises(CouncilError):
        council.make_activation_grant("prop-1", at_slot=10**6)


def test_double_ballot_slashes(world):
    council, hearth = world["council"], world["hearth"]
    council.submit_proposal(_proposal(world), chain=world["chain"], slot=1)
    council.attach_reports("prop-1", transmission_report_hash="11" * 32,
                           gym_report_hash="22" * 32, chain=world["chain"], slot=2)
    snapshot = council.eligible_seats(3)
    seat = sorted(snapshot)[0]
    ballot = {"proposal_id": "prop-1", "seat": seat, "vote": "yes",
              "bond_weight_chronons": snapshot[seat], "cast_slot": 3}
    council.cast_ballot(ballot, chain=world["chain"], slot=3)
    with pytest.raises(CouncilError, match="slashed"):
        council.cast_ballot(dict(ballot, vote="no"), chain=world["chain"], slot=3)
    assert not hearth.is_bonded("steward-0")


def test_proposal_with_forbidden_key_never_reaches_voting(world):
    proposal = _proposal(world, changes={"admin_key": "install one"})
    with pytest.raises(SchemaError):
        world["council"].submit_proposal(proposal, chain=world["chain"], slot=1)


def test_m5_cannot_widen_gym_beyond_chronarch(world):
    proposal = _proposal(world, major_class="M5",
                         changes={"gym.target_class.new": "external_mainnet"})
    with pytest.raises(IllegalProposalError):
        check_legality(proposal)
    # But a new Chronarch-scoped class is legal to VOTE on.
    check_legality(_proposal(world, major_class="M5",
                             changes={"gym.target_class.new": "chronarch_devnet"}))


def test_validate_rejects_unknown_major_class(world):
    with pytest.raises(SchemaError):
        validate("Proposal", _proposal(world, major_class="M99"))


def test_primitive_faculties_are_not_m3_grantable(world):
    """Kernel primitives are kernel content (M2) — the M3 door doesn't fit them."""
    registry = FacultyRegistry()
    kernel = build_kernel()
    for record in kernel["faculty_registry"].values():
        registry.load_kernel_faculty(record)
    with pytest.raises(Exception):
        registry.activate_authored("hash_walk_sense", {}, world["council"])


def test_community_proposal_needs_deposit(world):
    proposal = _proposal(world, proposer="community:alice")
    proposal["deposit_chronons"] = 1 * CHRONONS_PER_CHRONOS  # below floor
    with pytest.raises(CouncilError, match="deposit"):
        world["council"].submit_proposal(proposal, chain=world["chain"], slot=1)

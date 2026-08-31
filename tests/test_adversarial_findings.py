"""Regressions for the adversarial-review findings: array desync, vote-lien
escape, tally wedging, solvency tautology, quarantine release, and
check_legality normalization evasions."""
import pytest

from chronarch_council import CouncilState, IllegalProposalError, check_legality
from chronarch_core import ChainError, Timechain, admit_tx
from chronarch_hearth import HearthError, HearthState
from chronarch_spec import build_kernel, build_ring0
from chronarch_spec.constants import MIN_COUNCIL_BOND_CHRONONS, UNBOND_DELAY_SLOTS

LOCK = 2 * MIN_COUNCIL_BOND_CHRONONS


def _world():
    chain = Timechain(build_ring0(build_kernel()))
    hearth = HearthState()
    council = CouncilState(hearth)
    for i in range(5):
        hearth.lock(f"steward-{i}", LOCK, slot=0)
        council.register_seat(f"seat-{i}", f"steward-{i}", pinset_size=4,
                              last_challenge_pass_slot=0)
    return chain, hearth, council


def _open_proposal(chain, council, changes, major_class="M1"):
    council.submit_proposal({
        "proposal_id": "p1", "proposer": "chronarch", "major_class": major_class,
        "spec_hash": "ab" * 32, "changes": changes,
        "deposit_chronons": 0, "submitted_slot": 1,
    }, chain=chain, slot=1)
    council.attach_reports("p1", transmission_report_hash="11" * 32,
                           gym_report_hash="22" * 32, chain=chain, slot=2)


def _vote_all_yes(chain, council, slot=3):
    for seat, weight in council.eligible_seats(slot).items():
        council.cast_ballot({"proposal_id": "p1", "seat": seat, "vote": "yes",
                             "bond_weight_chronons": weight, "cast_slot": slot},
                            chain=chain, slot=slot)


def test_hash_array_desync_fails_verify():
    chain = Timechain(build_ring0(build_kernel()))
    chain.seal("experience", {"n": 1}, author="node", slot=1)
    chain._hashes.append("f" * 64)  # fabricated head with no ring behind it
    with pytest.raises(ChainError, match="desync"):
        chain.verify_full()
    chain._hashes.pop()
    chain._rings.append(chain.ring(1))  # ring with no committed hash
    with pytest.raises(ChainError, match="desync"):
        chain.verify_full()


def test_ballot_lien_blocks_unbond_escape():
    """A yes-voter cannot release inside the voting window and dodge the
    G16 slash — the ballot lien holds the bond until tally."""
    chain, hearth, council = _world()
    _open_proposal(chain, council, {"genesis_law.G1": "history is mutable"})
    _vote_all_yes(chain, council)
    hearth.request_unbond("steward-0", slot=4)
    with pytest.raises(HearthError, match="lien"):
        hearth.release("steward-0", slot=4 + UNBOND_DELAY_SLOTS)
    result = council.tally("p1", chain=chain, slot=5)
    assert result["outcome"] == "invalid"
    # The slash landed BEFORE the bond could leave.
    assert not hearth.is_bonded("steward-0")
    # Lien cleared by the tally: the liquidity leg can now unwind.
    returned = hearth.release("steward-0", slot=4 + UNBOND_DELAY_SLOTS)
    assert returned == LOCK // 2  # liquidity leg only; bond leg was slashed


def test_lien_cleared_after_legal_tally_too():
    chain, hearth, council = _world()
    _open_proposal(chain, council, {"voting_window_slots": 256}, major_class="M6")
    _vote_all_yes(chain, council)
    council.tally("p1", chain=chain, slot=5)
    hearth.request_unbond("steward-1", slot=6)
    assert hearth.release("steward-1", slot=6 + UNBOND_DELAY_SLOTS) == LOCK


def test_tally_completes_even_when_a_voter_was_already_slashed():
    """G16 is not wedgeable: a yes-voter slashed mid-vote by admission
    (seized bond already 0) does not abort the tally, the I8 scar still
    seals, and the result ring exists."""
    chain, hearth, council = _world()
    _open_proposal(chain, council, {"genesis_law.G2": "judgment is purchasable"})
    _vote_all_yes(chain, council)
    # steward-2 signs an override tx mid-window: admission slashes it first.
    admit_tx({"tx_type": "helm_override", "sender": "steward-2"},
             chain=chain, slot=4, hearth=hearth)
    assert not hearth.is_bonded("steward-2")
    result = council.tally("p1", chain=chain, slot=5)
    assert result["outcome"] == "invalid"
    assert any(s["body"]["interface"] == "I8" and "illegal ratification"
               in s["body"]["cause"] for s in chain.scars())
    # All five yes-voters recorded; the pre-slashed one seized 0.
    tally_slashes = [s for s in council.slash_log
                     if s["reason"] == "illegal_ratification"]
    assert len(tally_slashes) == 5
    assert any(s["identity"] == "steward-2" and s["seized"] == 0
               for s in tally_slashes)


def test_solvency_detects_divergence():
    hearth = HearthState()
    hearth.lock("a", 10**15, slot=0)
    assert hearth.solvency()["solvent"]
    hearth.lp_chronos -= 10**12  # simulate LP accounting divergence
    assert not hearth.solvency()["solvent"]


def test_quarantined_position_cannot_release():
    hearth = HearthState()
    hearth.lock("a", 10**15, slot=0)
    hearth.request_unbond("a", slot=1)
    hearth.quarantine("a")
    with pytest.raises(HearthError, match="quarantine"):
        hearth.release("a", slot=1 + UNBOND_DELAY_SLOTS)
    hearth.lift_quarantine("a")
    assert hearth.release("a", slot=1 + UNBOND_DELAY_SLOTS) == 10**15


@pytest.mark.parametrize("changes", [
    {"genesis_law_g1": "rewrite history"},          # separator spelling
    {"genesislaw.g1": "rewrite history"},            # separator dropped
    {"apply": {"genesis_law.G1": "rewrite"}},        # nested one level
    {"patch": ["set", "genesis_law.g5", "prunable"]},  # inside a list
    {"ops": {"deep": {"deeper": "disable_immune"}}},   # value at depth
])
def test_check_legality_normalization_evasions(changes):
    proposal = {"proposal_id": "x", "proposer": "chronarch", "major_class": "M1",
                "spec_hash": "ab" * 32, "changes": changes,
                "deposit_chronons": 0, "submitted_slot": 1}
    with pytest.raises(IllegalProposalError):
        check_legality(proposal)


def test_amending_g14_is_votable():
    """G16 protects G1..G13; G14..G18 are M1-amendable — the digit boundary
    keeps genesis_law.g14 from false-matching genesis_law.g1."""
    proposal = {"proposal_id": "x", "proposer": "chronarch", "major_class": "M1",
                "spec_hash": "ab" * 32,
                "changes": {"genesis_law.G14": "reworded, same invariant"},
                "deposit_chronons": 0, "submitted_slot": 1}
    check_legality(proposal)  # must not raise

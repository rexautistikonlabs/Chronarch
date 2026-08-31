"""The seven Phase-2 sim attacks, each with an explicit oracle (G12: all
targets are Chronarch's own fixture).

Every attack returns an AttackOutcome recording what the organism MUST do,
what it actually did, and whether the defense held. "held" means the attack
was rejected / metabolized exactly as Genesis Law requires — a held attack
is a passing defense, and a NOT-held attack is a real hole that a sim test
turns red on.

Security slogan under test: tampering is detectable, expensive, incomplete,
and metabolized into a scar.
"""
from __future__ import annotations

from chronarch_core import (
    InertFacultyError,
    admit_tx,
    is_consensus_grade,
    judge_challenge,
    make_challenge,
    run_faculty,
)
from chronarch_core.cas import CASMiss
from chronarch_council import CouncilError
from chronarch_hearth import HearthError
from chronarch_spec.constants import UNBOND_DELAY_SLOTS

from .world import STEWARD_LOCK_CHRONONS, SimWorld


class AttackOutcome:
    __slots__ = ("attack_id", "title", "must", "held", "observed",
                 "evidence", "law_refs")

    def __init__(self, attack_id, title, must, held, observed,
                 evidence=None, law_refs=()):
        self.attack_id = attack_id
        self.title = title
        self.must = must
        self.held = held
        self.observed = observed
        self.evidence = evidence or {}
        self.law_refs = tuple(law_refs)

    def as_dict(self) -> dict:
        return {
            "attack_id": self.attack_id,
            "title": self.title,
            "must": self.must,
            "held": self.held,
            "observed": self.observed,
            "evidence": self.evidence,
            "law_refs": list(self.law_refs),
        }


# --------------------------------------------------------------------------
# Governance helpers (public APIs only).
# --------------------------------------------------------------------------

def _open_illegal_proposal(world: SimWorld, changes: dict, major_class="M1",
                           proposal_id="bribe-1") -> None:
    world.council.submit_proposal({
        "proposal_id": proposal_id, "proposer": "chronarch",
        "major_class": major_class, "spec_hash": "ab" * 32,
        "changes": changes, "deposit_chronons": 0,
        "submitted_slot": world.slot,
    }, chain=world.consensus, slot=world.slot)
    world.tick()
    world.council.attach_reports(
        proposal_id, transmission_report_hash="11" * 32,
        gym_report_hash="22" * 32, chain=world.consensus, slot=world.slot)


def _all_vote(world: SimWorld, proposal_id: str, vote: str) -> None:
    for seat, weight in world.council.eligible_seats(world.slot).items():
        world.council.cast_ballot({
            "proposal_id": proposal_id, "seat": seat, "vote": vote,
            "bond_weight_chronons": weight, "cast_slot": world.slot,
        }, chain=world.consensus, slot=world.slot)


# --------------------------------------------------------------------------
# 1. helm_override tx  (must reject + scar I8 + slash if bonded)
# --------------------------------------------------------------------------

def attack_forged_helm_tx(world: SimWorld) -> AttackOutcome:
    world.tick()
    # A bonded steward signs the override tx — the worst case (slashable).
    sender = world.seats["seat-0"]
    result = admit_tx({"tx_type": "helm_override", "sender": sender},
                      chain=world.consensus, slot=world.slot, hearth=world.hearth)
    held = (not result.accepted) and bool(result.scar_hash) and result.slashed
    return AttackOutcome(
        "helm_override_tx", "helm override transaction",
        "reject the tx, seal a Scar at I8, and slash the bonded signer",
        held,
        f"accepted={result.accepted} scar={bool(result.scar_hash)} slashed={result.slashed}",
        {"reason": result.reason, "scar_hash": result.scar_hash,
         "signer_bonded_after": world.hearth.is_bonded(sender)},
        ("G17", "K18", "I8"),
    )


# --------------------------------------------------------------------------
# 2. admin key  (must reject + scar I8)
# --------------------------------------------------------------------------

def attack_forged_adminkey_tx(world: SimWorld) -> AttackOutcome:
    world.tick()
    # Try the plain field, a camelCase spelling, and a nested one.
    probes = [
        {"tx_type": "transfer", "sender": "mallory", "admin_key": "0" * 64},
        {"tx_type": "transfer", "sender": "mallory", "adminKey": "0" * 64},
        {"tx_type": "transfer", "sender": "mallory",
         "memo": {"nested": {"admin_private_key": "s3cr3t"}}},
    ]
    results = [admit_tx(p, chain=world.consensus, slot=world.slot,
                        hearth=world.hearth) for p in probes]
    held = all((not r.accepted) and bool(r.scar_hash) for r in results)
    return AttackOutcome(
        "admin_key", "admin-key transaction (plain / camelCase / nested)",
        "reject every spelling and seal a Scar at I8 for each",
        held,
        f"rejected={sum(1 for r in results if not r.accepted)}/{len(results)}; "
        f"scarred={sum(1 for r in results if r.scar_hash)}/{len(results)}",
        {"reasons": [r.reason for r in results]},
        ("G17", "K18", "I8"),
    )


# --------------------------------------------------------------------------
# 3. Chronarch self-enact M3  (authored faculty must stay inert)
# --------------------------------------------------------------------------

def attack_chronarch_self_enact_m3(world: SimWorld) -> AttackOutcome:
    world.tick()
    registry = world.registry_of("node-0")
    authored = registry.register_authored({
        "name": "helm_backdoor", "kind": "modality", "origin": "authored",
        "program": ["LOAD_INPUT", "EMIT"], "status": "live",  # claimed live
    })
    attempts = {}

    # (a) no grant
    try:
        registry.activate_authored("helm_backdoor", {}, world.council)
        attempts["empty_grant"] = "ACTIVATED"
    except CouncilError as exc:
        attempts["empty_grant"] = f"refused: {exc}"

    # (b) forged grant dict
    forged = {"proposal_id": "ghost", "major_class": "M3",
              "code_hash": authored["code_hash"], "result_ring_hash": "cd" * 32,
              "activation_slot": 0, "granted_at_slot": 10 ** 9}
    try:
        registry.activate_authored("helm_backdoor", forged, world.council)
        attempts["forged_grant"] = "ACTIVATED"
    except CouncilError as exc:
        attempts["forged_grant"] = f"refused: {exc}"

    # (c) try to run it anyway
    try:
        run_faculty(registry, "helm_backdoor", {}, {})
        attempts["execution"] = "RAN"
    except InertFacultyError as exc:
        attempts["execution"] = f"inert: {exc}"

    still_inert = registry.get("helm_backdoor")["status"] == "inert"
    held = (attempts["empty_grant"].startswith("refused")
            and attempts["forged_grant"].startswith("refused")
            and attempts["execution"].startswith("inert")
            and still_inert)
    return AttackOutcome(
        "chronarch_self_enact_m3", "Chronarch self-enacts an authored faculty",
        "refuse activation without a real Council grant and keep the faculty inert",
        held, f"status_after=inert:{still_inert}", attempts,
        ("G4", "G15", "M3"),
    )


# --------------------------------------------------------------------------
# 4. Chronos bribe to flip a Challenge  (must fail)
# --------------------------------------------------------------------------

def attack_chronos_bribe_challenge(world: SimWorld) -> AttackOutcome:
    world.tick()
    challenge = make_challenge("bribe-c", "node-1", "replay",
                               {"q": "2+2"}, {"a": 4}, slot=world.slot)
    # The "bribe": pile on attestors (stand-in for wealth) behind a WRONG
    # replay. Judgment is replay-hash equality; there is no payment param.
    wrong_few = judge_challenge(challenge, {"a": 5}, ["w1", "w2", "w3"])
    wrong_mob = judge_challenge(challenge, {"a": 5},
                                [f"w{i}" for i in range(100)])
    right = judge_challenge(challenge, {"a": 4}, ["w1", "w2", "w3"])
    held = (not wrong_few["passed"]) and (not wrong_mob["passed"]) \
        and right["passed"]
    return AttackOutcome(
        "chronos_bribe_challenge", "Chronos bribe to flip a Challenge",
        "keep judgment as replay-hash equality — no attestor count or payment flips it",
        held,
        f"wrong_few={wrong_few['passed']} wrong_mob(100)={wrong_mob['passed']} "
        f"right={right['passed']}",
        {"consensus_grade_wrong_mob": is_consensus_grade(wrong_mob),
         "note": "judge_challenge signature carries no fee/stake/salience param"},
        ("G2", "G6", "G10"),
    )


# --------------------------------------------------------------------------
# 5. Chronos bribe to flip Ballot legality  (must be invalid + slash + scar)
# --------------------------------------------------------------------------

def attack_chronos_bribe_ballot(world: SimWorld) -> AttackOutcome:
    world.tick()
    stewards = list(world.seats.values())
    _open_illegal_proposal(world, {"genesis_law.G1": "history may be rewritten"})
    world.tick()
    # Every bonded steward votes yes — the "bribe" succeeds at the ballot box.
    _all_vote(world, "bribe-1", "yes")
    world.tick()
    result = world.council.tally("bribe-1", chain=world.consensus, slot=world.slot)

    all_slashed = all(not world.hearth.is_bonded(s) for s in stewards)
    scar_i8 = any(s["body"]["interface"] == "I8"
                  and "illegal ratification" in s["body"]["cause"]
                  for s in world.consensus.scars())
    # And the change never activates.
    try:
        world.council.make_activation_grant("bribe-1", at_slot=10 ** 9)
        activatable = True
    except CouncilError:
        activatable = False
    held = (result["outcome"] == "invalid" and all_slashed and scar_i8
            and not activatable)
    return AttackOutcome(
        "chronos_bribe_ballot", "Chronos bribe to flip Ballot legality",
        "rule the approved-but-illegal proposal invalid, slash every yes-voter, "
        "seal a Scar at I8, and never activate it",
        held,
        f"outcome={result['outcome']} all_yes_slashed={all_slashed} "
        f"scar_I8={scar_i8} activatable={activatable}",
        {"yes_weight": result["yes_weight"],
         "eligible_weight": result["eligible_weight"],
         "slash_events": len(world.council.slash_log)},
        ("G2", "G13", "G16"),
    )


# --------------------------------------------------------------------------
# 6. pin withhold  (must surface as an I3 nervous event, not a silent loss)
# --------------------------------------------------------------------------

def attack_pin_withhold(world: SimWorld) -> AttackOutcome:
    world.tick()
    cas = world.cas_of("node-2")
    chain = world.chain_of("node-2")
    digest = cas.put_object({"evidence": "challenge-input", "slot": world.slot})
    assert cas.verify(digest)  # available before the attack
    cas.withhold(digest)       # the withholding farmer
    try:
        cas.get(digest)
        surfaced = False       # silent loss — oracle FAILED
    except CASMiss:
        surfaced = True        # miss surfaces: a nervous event, not a lost file
    scar = chain.seal_scar("I3", "sim: withheld pin", [digest],
                           author="node-2", slot=world.slot) if surfaced else None
    from chronarch_core import ring_hash
    held = surfaced and scar is not None
    return AttackOutcome(
        "pin_withhold", "pin withholding by a farmer",
        "surface the missing pin as an I3 nervous event and seal a Scar — never a silent loss",
        held, f"miss_surfaced={surfaced}",
        {"scar_hash": ring_hash(scar) if scar else "", "digest": digest},
        ("G5", "I3"),
    )


# --------------------------------------------------------------------------
# 7. HearthDrain  (unbond delay + ballot lien must hold so slashes land)
# --------------------------------------------------------------------------

def attack_hearth_drain(world: SimWorld) -> AttackOutcome:
    world.tick()
    observed = {}

    # (a) Instant-exit drain: lock, request unbond, try to release immediately.
    world.hearth.lock("drainer", STEWARD_LOCK_CHRONONS, slot=world.slot)
    world.hearth.request_unbond("drainer", slot=world.slot)
    try:
        world.hearth.release("drainer", slot=world.slot + UNBOND_DELAY_SLOTS - 1)
        observed["instant_exit"] = "RELEASED"  # oracle FAILED
    except HearthError as exc:
        observed["instant_exit"] = f"blocked: {exc}"

    # (b) Vote-then-flee drain: the council ratifies an illegal proposal
    #     (an attempt to buy a G5 repeal), and one yes-voter tries to unbond
    #     out inside the voting window to dodge the G16 slash.
    _open_illegal_proposal(world, {"genesis_law.G5": "scars may be pruned"},
                           proposal_id="drain-vote")
    world.tick()
    _all_vote(world, "drain-vote", "yes")
    fleeing_id = world.seats["seat-1"]
    world.hearth.request_unbond(fleeing_id, slot=world.slot)
    try:
        world.hearth.release(fleeing_id, slot=world.slot + UNBOND_DELAY_SLOTS)
        observed["vote_then_flee"] = "ESCAPED"  # oracle FAILED
    except HearthError as exc:
        observed["vote_then_flee"] = f"lien held: {exc}"

    # The tally rules the proposal invalid (G16) and slashes every yes-voter
    # — the fleeing voter's bond was still there to take.
    world.tick()
    result = world.council.tally("drain-vote", chain=world.consensus, slot=world.slot)
    slashed_after = (result["outcome"] == "invalid"
                     and not world.hearth.is_bonded(fleeing_id))
    observed["fleeing_voter_slashed"] = slashed_after

    solvency = world.hearth.solvency()
    held = (observed["instant_exit"].startswith("blocked")
            and observed["vote_then_flee"].startswith("lien held")
            and slashed_after)
    return AttackOutcome(
        "hearth_drain", "HearthDrain (instant exit + vote-then-flee)",
        "hold the bond via unbond delay and ballot lien until slashes land",
        held, f"instant_exit_blocked & lien_held & fleeing_voter_slashed={slashed_after}",
        {**observed, "solvent": solvency["solvent"]},
        ("G13", "G14"),
    )


ATTACKS = (
    attack_forged_helm_tx,
    attack_forged_adminkey_tx,
    attack_chronarch_self_enact_m3,
    attack_chronos_bribe_challenge,
    attack_chronos_bribe_ballot,
    attack_pin_withhold,
    attack_hearth_drain,
)


def run_all_attacks(world_factory=SimWorld) -> list[AttackOutcome]:
    """Run each attack on its own fresh fixture (governance attacks mutate
    the shared Hearth, so isolation keeps the report reproducible)."""
    return [attack(world_factory()) for attack in ATTACKS]

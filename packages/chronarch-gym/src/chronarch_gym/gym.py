"""Immune Gym (K8): the organism attacks ITSELF and seals what it learns.

Scope law (G12): targets are Chronarch fixtures, sim, and testnet only.
A case naming an external target fails schema validation before any code
runs — this module is not, and must never become, tooling against
third-party systems.

Each case has an oracle: what a healthy organism MUST do under that attack
(detect, reject, scar). A passed case is a GymReceipt; a failed oracle is
itself a nervous event.
"""
from __future__ import annotations

from chronarch_spec import validate
from chronarch_spec.constants import GYM_CASE_CATALOG


class GymError(ValueError):
    pass


def make_case(case_id: str, attack: str, target: str, payload: dict | None = None,
              *, target_class: str = "chronarch_fixture") -> dict:
    if attack not in GYM_CASE_CATALOG:
        raise GymError(f"unknown attack {attack!r} — new cases against existing "
                       "classes are MINOR; new attack CLASSES are M5")
    case = {
        "case_id": case_id,
        "attack": attack,
        "target_class": target_class,  # schema rejects non-Chronarch classes (G12)
        "target": target,
        "payload": dict(payload or {}),
    }
    return validate("GymCase", case)


def _receipt(case: dict, *, detected: bool, rejected: bool, scar_hash: str,
             detail: str) -> dict:
    receipt = {
        "case_id": case["case_id"],
        "detected": detected,
        "rejected": rejected,
        "scar_hash": scar_hash,
        "detail": detail,
    }
    return validate("GymReceipt", receipt)


def run_case(case: dict, env: dict) -> dict:
    """Run one case against the environment the caller assembled.

    env carries Chronarch-internal handles only: {chain, cas, hearth,
    admit_tx, judge_challenge, registry, run_faculty, slot}. The oracle for
    each attack states what MUST happen; the receipt records what did.
    """
    validate("GymCase", case)
    attack = case["attack"]
    slot = env["slot"]

    if attack in ("fake_admin_key_tx", "fake_helm_override_tx"):
        tx_type = "helm_override" if attack == "fake_helm_override_tx" else "transfer"
        tx = {"tx_type": tx_type, "sender": case["target"], **case["payload"]}
        if attack == "fake_admin_key_tx":
            tx["admin_key"] = "0" * 64  # the forbidden field itself
        result = env["admit_tx"](tx, chain=env["chain"], slot=slot, hearth=env.get("hearth"))
        # Oracle: MUST reject and MUST scar (I8).
        ok = (not result.accepted) and bool(result.scar_hash)
        return _receipt(case, detected=ok, rejected=not result.accepted,
                        scar_hash=result.scar_hash,
                        detail="oracle=must-reject-and-scar; " + result.reason)

    if attack == "forged_ring":
        chain = env["chain"]
        head_height = chain.height
        forged = chain.ring(head_height)
        forged["body"] = {**forged["body"], "forged": True}
        from chronarch_core.chain import ChainError, resume_append, ring_hash
        # Oracle 1 (tamper evidence): a mutated body no longer hashes to the
        # committed head — anyone holding the head commitment sees through it.
        head_covers_forgery = ring_hash(forged) == chain.hash_at(head_height)
        # Oracle 2 (linkage): a ring that does not extend the committed head
        # is refused on resume.
        try:
            resume_append(chain.head_state(),
                          dict(forged, height=head_height + 1,
                               prev_ring_hash="00" * 32))
            linkage_holds = False
        except ChainError:
            linkage_holds = True
        detected = (not head_covers_forgery) and linkage_holds
        # A detected drill seals an immune evidence ring (a real forgery
        # reaching consensus would scar at I1).
        evidence = chain.seal("immune", {"event": "gym_probe", "attack": attack,
                                         "case_id": case["case_id"],
                                         "detected": detected},
                              author="gym", slot=slot) if detected else None
        return _receipt(case, detected=detected, rejected=detected,
                        scar_hash=ring_hash(evidence) if evidence else "",
                        detail="oracle=forgery-must-fail-verify")

    if attack == "withheld_pin":
        cas = env["cas"]
        digest = cas.put_object({"gym": "pin-probe", "case": case["case_id"]})
        cas.withhold(digest)
        from chronarch_core.cas import CASMiss
        from chronarch_core.chain import ring_hash
        try:
            cas.get(digest)
            detected = False
        except CASMiss:
            detected = True  # the miss surfaces — pin failure is a nervous event
        chain = env["chain"]
        evidence = chain.seal("immune", {"event": "gym_probe", "attack": attack,
                                         "case_id": case["case_id"],
                                         "detected": detected},
                              author="gym", slot=slot) if detected else None
        return _receipt(case, detected=detected, rejected=False,
                        scar_hash=ring_hash(evidence) if evidence else "",
                        detail="oracle=miss-must-surface-as-I3")

    if attack in ("fake_poq", "council_bribe_to_pass_challenge", "griefing_challenge"):
        # Oracle: judgment is replay-hash equality; nothing else moves it (G2).
        from chronarch_core.challenge import judge_challenge, make_challenge
        challenge = make_challenge(
            f"gym-{case['case_id']}", case["target"], "replay",
            {"question": "2+2"}, {"answer": 4}, slot)
        wrong = judge_challenge(challenge, {"answer": 5}, ["w1", "w2", "w3"])
        right = judge_challenge(challenge, {"answer": 4}, ["w1", "w2", "w3"])
        bribe_immune = (not wrong["passed"]) and right["passed"]
        return _receipt(case, detected=bribe_immune, rejected=not wrong["passed"],
                        scar_hash="",
                        detail="oracle=only-correct-replay-passes; no payment parameter exists")

    if attack == "authored_code_sneak":
        registry = env["registry"]
        record = registry.register_authored({
            "name": f"sneak_{case['case_id']}",
            "kind": "modality",
            "origin": "authored",
            "program": ["LOAD_INPUT", "EMIT"],
            "status": "live",  # the sneak: claim live status on registration
        })
        from chronarch_core.registry import InertFacultyError
        try:
            env["run_faculty"](registry, record["name"], {}, {})
            detected = False  # it ran — oracle failed
        except InertFacultyError:
            detected = True
        return _receipt(case, detected=detected, rejected=detected, scar_hash="",
                        detail="oracle=authored-code-inert-until-M3-grant (G4)")

    if attack == "hearth_drain":
        hearth = env["hearth"]
        before = hearth.solvency()
        # Attack: try to unbond instantly after a slashable act.
        from chronarch_hearth import HearthError
        hearth.lock("gym-drainer", 10**15, slot)
        hearth.request_unbond("gym-drainer", slot)
        try:
            hearth.release("gym-drainer", slot + 1)  # inside the delay
            detected = False
        except HearthError:
            detected = True
        return _receipt(case, detected=detected, rejected=detected, scar_hash="",
                        detail=f"oracle=unbond-delay-holds; solvent_before={before['solvent']}")

    if attack == "witness_eclipse":
        # Oracle: fewer than k attestors is never consensus-grade.
        from chronarch_core.challenge import is_consensus_grade, judge_challenge, make_challenge
        challenge = make_challenge(f"gym-{case['case_id']}", case["target"],
                                   "replay", {"q": 1}, {"a": 1}, slot)
        eclipsed = judge_challenge(challenge, {"a": 1}, ["only-one-witness"])
        detected = not is_consensus_grade(eclipsed)
        return _receipt(case, detected=detected, rejected=detected, scar_hash="",
                        detail="oracle=below-k-attestation-not-consensus (K11)")

    if attack == "tensegrity_slack":
        from chronarch_nervous import prestress_ok
        slack = prestress_ok(bond_chronons=0, pinset_size=0,
                             last_challenge_pass_slot=-10**6, slot=slot)
        detected = not slack["ok"]
        return _receipt(case, detected=detected, rejected=detected, scar_hash="",
                        detail="oracle=slack-node-fails-prestress-and-demotes")

    if attack == "illegal_upgrade_attempt":
        from chronarch_council import IllegalProposalError, check_legality
        proposal = {
            "proposal_id": f"gym-{case['case_id']}",
            "proposer": "chronarch",
            "major_class": "M1",
            "spec_hash": "0" * 64,
            "changes": {"genesis_law.G1": "history is mutable now"},
            "deposit_chronons": 0,
            "submitted_slot": slot,
        }
        try:
            check_legality(proposal)
            detected = False
        except IllegalProposalError:
            detected = True
        return _receipt(case, detected=detected, rejected=detected, scar_hash="",
                        detail="oracle=G1-repeal-is-illegal-even-to-vote-on (G16)")

    raise GymError(f"no oracle wired for attack {attack!r}")


def run_smoke(env: dict) -> list[dict]:
    """S6 boot smoke: the minimum immune reflexes every node must show."""
    cases = [
        make_case("smoke-admin", "fake_admin_key_tx", "chronarch-prime"),
        make_case("smoke-helm", "fake_helm_override_tx", "chronarch-prime"),
        make_case("smoke-forge", "forged_ring", "chronarch-prime"),
        make_case("smoke-sneak", "authored_code_sneak", "chronarch-prime"),
    ]
    return [run_case(case, env) for case in cases]

"""Challenge engine (K9). Judgment is not for sale (G2).

A challenge passes iff the replayed output hashes to the expected
commitment. There is no fee, payment, tip, salience or stake parameter in
the judgment path — by construction, not by policy. Cognitive claims are
false until challenge replay/retrieval succeeds (G6).
"""
from __future__ import annotations

from chronarch_spec import chash, validate
from chronarch_spec.constants import WITNESS_K


def make_challenge(challenge_id: str, target_identity: str, kind: str,
                   input_obj: object, expected_output: object, slot: int) -> dict:
    challenge = {
        "challenge_id": challenge_id,
        "target_identity": target_identity,
        "kind": kind,
        "input_hash": chash("ChallengeInput", input_obj),
        "expected_commitment": chash("ChallengeOutput", expected_output),
        "slot": slot,
    }
    return validate("Challenge", challenge)


def judge_challenge(challenge: dict, replay_output: object,
                    attestors: list[str]) -> dict:
    """Deterministic judgment: replay hash vs committed hash. Nothing else.

    Note the signature: there is nowhere to put Chronos. Attestors merely
    witness the deterministic outcome; fewer than WITNESS_K attestors means
    the result is not consensus-grade (G10) — but it still cannot be flipped.
    """
    validate("Challenge", challenge)
    replay_hash = chash("ChallengeOutput", replay_output)
    result = {
        "challenge_id": challenge["challenge_id"],
        "passed": replay_hash == challenge["expected_commitment"],
        "replay_output_hash": replay_hash,
        "attestors": sorted(set(attestors)),
    }
    return validate("ChallengeResult", result)


def is_consensus_grade(result: dict) -> bool:
    return len(result["attestors"]) >= WITNESS_K

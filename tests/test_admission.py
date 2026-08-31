"""Admission chokepoint (K18/G17/G2): override claims are rejected, scarred
at I8, and slashed when the sender is bonded. Chronos cannot flip a
Challenge — there is nowhere to put it."""
import inspect

import pytest

from chronarch_core import Timechain, admit_tx, judge_challenge, make_challenge
from chronarch_core.admission import ALLOWED_TX_TYPES
from chronarch_hearth import HearthState
from chronarch_spec import build_kernel, build_ring0


@pytest.fixture()
def chain():
    return Timechain(build_ring0(build_kernel()))


def test_helm_override_tx_rejected_and_scarred(chain):
    result = admit_tx({"tx_type": "helm_override", "sender": "mallory"},
                      chain=chain, slot=1)
    assert not result.accepted
    assert result.scar_hash
    scars = chain.scars()
    assert scars and scars[-1]["body"]["interface"] == "I8"


def test_admin_key_field_rejected_and_scarred(chain):
    result = admit_tx({"tx_type": "transfer", "sender": "mallory",
                       "admin_key": "0" * 64}, chain=chain, slot=1)
    assert not result.accepted and result.scar_hash


def test_nested_founder_override_rejected(chain):
    result = admit_tx({"tx_type": "transfer", "sender": "mallory",
                       "memo": {"inner": {"founder_override": True}}},
                      chain=chain, slot=1)
    assert not result.accepted and result.scar_hash


def test_execute_upgrade_tx_rejected(chain):
    result = admit_tx({"tx_type": "execute_upgrade", "sender": "chronarch"},
                      chain=chain, slot=1)
    assert not result.accepted and result.scar_hash


def test_bonded_sender_is_slashed(chain):
    hearth = HearthState()
    hearth.lock("mallory", 10**15, slot=0)
    assert hearth.is_bonded("mallory")
    result = admit_tx({"tx_type": "helm_override", "sender": "mallory"},
                      chain=chain, slot=1, hearth=hearth)
    assert result.slashed
    assert not hearth.is_bonded("mallory")
    assert hearth.treasury_chronons > 0


def test_unknown_tx_type_rejected_closed_world(chain):
    result = admit_tx({"tx_type": "set_params", "sender": "x"}, chain=chain, slot=1)
    assert not result.accepted


def test_benign_txs_accepted(chain):
    for tx_type in sorted(ALLOWED_TX_TYPES):
        result = admit_tx({"tx_type": tx_type, "sender": "honest"}, chain=chain, slot=1)
        assert result.accepted, tx_type


def test_no_override_tx_type_exists():
    for banned in ("admin_key", "founder_key", "helm_override", "ai_self_enact",
                   "execute_upgrade"):
        assert banned not in ALLOWED_TX_TYPES


def test_chronos_cannot_flip_challenge():
    """G2 by construction: the judgment signature has no payment parameter,
    and only the replay hash decides."""
    signature = inspect.signature(judge_challenge)
    for hostile in ("fee", "payment", "tip", "chronos", "stake", "salience", "bribe"):
        assert hostile not in signature.parameters
    challenge = make_challenge("c1", "target", "replay", {"q": "2+2"}, {"a": 4}, slot=1)
    assert judge_challenge(challenge, {"a": 4}, ["w1", "w2", "w3"])["passed"]
    assert not judge_challenge(challenge, {"a": 5}, ["w1", "w2", "w3"])["passed"]
    # Same wrong replay, arbitrarily many attestors: still fails.
    assert not judge_challenge(challenge, {"a": 5},
                               [f"w{i}" for i in range(100)])["passed"]

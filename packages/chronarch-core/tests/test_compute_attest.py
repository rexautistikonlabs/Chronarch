"""Phase 15 tests: attested compute receipts.

COMPUTE_SHARE is paid only for a DummyMind or Immune Gym job that verifies.
A DummyMind job replays a live-registry faculty (output_hash must match); a gym
job runs a named case on a Chronarch fixture (its oracle must pass). An LLM
draft, a silo artifact, or a hat/prevention run is never a payable job, and no
Chronos, vote, or faculty-activation field can appear on a receipt.
"""
import pytest

from chronarch_core import (
    COMPUTE_OK,
    COMPUTE_UNATTESTED,
    ComputeError,
    ForeignGymTargetError,
    attest_compute,
    make_compute_receipt,
    verify_compute_receipt,
)
from chronarch_node import Node


def _node():
    return Node("A", 1, space_table={"A": 1})


# -- closed schema ----------------------------------------------------------
def test_receipt_schema_is_closed():
    node = _node()
    r = make_compute_receipt("w", "dummymind", "injection_screen_sense",
                             node=node, inputs={"tx": {"x": 1}})
    assert set(r) == {"worker", "job_kind", "job_id", "input_hash",
                      "output_hash", "evidence_refs", "slot"}


def test_receipt_rejects_chronos_vote_and_activation_fields():
    base = {"worker": "w", "job_kind": "dummymind", "job_id": "f",
            "input_hash": "a", "output_hash": "b", "evidence_refs": []}
    for extra in ("chronos", "amount", "vote", "ballot", "activate_faculty", "seat"):
        bad = {**base, extra: 1}
        with pytest.raises(ComputeError):
            verify_compute_receipt(bad)


def test_receipt_rejects_k18_forbidden_key():
    bad = {"worker": "w", "job_kind": "dummymind", "job_id": "f",
           "input_hash": "a", "output_hash": "b", "evidence_refs": [],
           "admin_key": "0" * 64}
    with pytest.raises(Exception):  # SchemaError from screen_keys or ComputeError
        verify_compute_receipt(bad)


def test_receipt_rejects_non_payable_job_kinds():
    for kind in ("llm", "silo", "hat_run", "prevention", "draft"):
        bad = {"worker": "w", "job_kind": kind, "job_id": "x",
               "input_hash": "a", "output_hash": "b", "evidence_refs": []}
        with pytest.raises(ComputeError):
            verify_compute_receipt(bad)


# -- DummyMind attestation --------------------------------------------------
def test_dummymind_matching_output_attests():
    node = _node()
    r = make_compute_receipt("gpu-1", "dummymind", "injection_screen_sense",
                             node=node, inputs={"tx": {"amount": 1}})
    result = attest_compute(r, node)
    assert result["ok"] and result["code"] == COMPUTE_OK


def test_dummymind_wrong_output_hash_is_unattested():
    node = _node()
    r = make_compute_receipt("gpu-1", "dummymind", "injection_screen_sense",
                             node=node, inputs={"tx": {"amount": 1}})
    tampered = {**r, "output_hash": "0" * 64}
    result = attest_compute(tampered, node)
    assert not result["ok"] and result["code"] == COMPUTE_UNATTESTED


def test_dummymind_unknown_faculty_is_unattested():
    node = _node()
    r = make_compute_receipt("gpu-1", "dummymind", "injection_screen_sense",
                             node=node, inputs={"tx": {"amount": 1}})
    result = attest_compute({**r, "job_id": "not_a_faculty"}, node)
    assert not result["ok"] and result["code"] == COMPUTE_UNATTESTED


def test_dummymind_missing_input_is_unattested():
    node = _node()
    r = make_compute_receipt("gpu-1", "dummymind", "injection_screen_sense",
                             node=node, inputs={"tx": {"amount": 1}})
    # A different node's CAS does not hold this input → not replayable.
    other = Node("B", 1, space_table={"B": 1})
    result = attest_compute(r, other)
    assert not result["ok"] and result["code"] == COMPUTE_UNATTESTED


def test_make_dummymind_receipt_needs_node_and_inputs():
    with pytest.raises(ComputeError):
        make_compute_receipt("w", "dummymind", "injection_screen_sense")


def test_make_dummymind_rejects_inert_or_unknown_faculty():
    node = _node()
    with pytest.raises(ComputeError):
        make_compute_receipt("w", "dummymind", "not_a_faculty",
                             node=node, inputs={"tx": {"x": 1}})


# -- Gym attestation --------------------------------------------------------
@pytest.mark.parametrize("attack", ["fake_admin_key_tx", "forged_ring",
                                    "authored_code_sneak", "illegal_upgrade_attempt"])
def test_gym_case_on_chronarch_fixture_attests(attack):
    node = _node()
    r = make_compute_receipt("gpu-2", "gym", attack)
    result = attest_compute(r, node)
    assert result["ok"] and result["code"] == COMPUTE_OK


def test_gym_foreign_target_yields_no_receipt():
    with pytest.raises(ForeignGymTargetError):
        make_compute_receipt("gpu-3", "gym", "fake_admin_key_tx",
                             target_class="external_bank")


def test_gym_unknown_attack_is_unattested():
    node = _node()
    r = make_compute_receipt("gpu-2", "gym", "forged_ring")
    result = attest_compute({**r, "job_id": "not_a_real_attack"}, node)
    assert not result["ok"] and result["code"] == COMPUTE_UNATTESTED


def test_gym_tampered_verdict_is_unattested():
    node = _node()
    r = make_compute_receipt("gpu-2", "gym", "forged_ring")
    result = attest_compute({**r, "output_hash": "0" * 64}, node)
    assert not result["ok"] and result["code"] == COMPUTE_UNATTESTED


# -- LLM draft / silo / hat cannot be smuggled through ----------------------
def test_llm_draft_cannot_attest_as_dummymind():
    # An LLM draft is a STRING, not a live-registry faculty output. Even if a
    # forger labels it job_kind=dummymind with a real faculty name, the
    # committed output_hash of the draft never matches the faculty replay.
    node = _node()
    from chronarch_spec import chash
    draft = "dummymind-echo:deadbeefdeadbeef"
    forged = {"worker": "cheater", "job_kind": "dummymind",
              "job_id": "injection_screen_sense",
              "input_hash": node.cas.put_object({"tx": {"x": 1}}),
              "output_hash": chash("ComputeOutput", draft),  # the LLM draft, not the faculty output
              "evidence_refs": []}
    result = attest_compute(forged, node)
    assert not result["ok"] and result["code"] == COMPUTE_UNATTESTED


def test_gym_attestation_does_not_mutate_the_attesting_node():
    # Gym attestation runs in an isolated fixture, never the attesting node.
    node = _node()
    height_before = node.ledger.height
    pins_before = list(node.cas.pins())
    facts_before = list(node.registry.names())
    make_compute_receipt("gpu-2", "gym", "authored_code_sneak")  # registers a faculty in the FIXTURE
    attest_compute(make_compute_receipt("gpu-2", "gym", "forged_ring"), node)
    assert node.ledger.height == height_before
    assert list(node.cas.pins()) == pins_before
    assert list(node.registry.names()) == facts_before

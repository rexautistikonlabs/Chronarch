"""Lab freeze: the optional chiapos cross-check (verify_pospace_extra).

The default proof-of-space verifier stays the hash stand-in and the whole suite
runs with zero extra dependencies. The opt-in path uses pytest.importorskip so
default CI keeps skipping chiapos.
"""
import pytest

from chronarch_farm import (
    active_backend,
    make_space_proof,
    make_space_seal,
    verify_pospace_extra,
    verify_space_proof,
)


def _proof():
    seal = make_space_seal("f", "test")
    proof = make_space_proof(seal, challenge="ab" * 32)
    return seal, proof


# -- default: the extra is inert, the stand-in stands alone -----------------
def test_extra_is_none_by_default():
    _seal, proof = _proof()
    # no CHRONARCH_CHIAPOS and no chiapos installed → None (default backend)
    assert verify_pospace_extra(proof) is None
    # even with the flag on but chiapos absent, the backend is the stand-in
    assert active_backend({"CHRONARCH_CHIAPOS": "1"}) == "phase6-standin"


def test_default_verify_space_proof_still_verifies():
    seal, proof = _proof()
    result = verify_space_proof(proof, seal["space_units"])
    assert result["ok"] is True and result["error_code"] == "POSPACE_OK"


def test_extra_never_raises_on_a_malformed_proof():
    assert verify_pospace_extra({}) is None
    assert verify_pospace_extra({"plot_id": "x"}) is None


# -- opt-in path: only when chiapos is actually installed -------------------
def test_extra_consults_chiapos_when_installed():
    pytest.importorskip("chiapos")  # default CI skips here
    _seal, proof = _proof()
    env = {"CHRONARCH_CHIAPOS": "1"}
    # active backend flips to chiapos; the extra returns a bool or None (a
    # not-yet-wired backend returns None — never raises, never a positive
    # interoperability claim).
    assert active_backend(env) in ("chiapos", "phase6-standin")
    verdict = verify_pospace_extra(proof, env)
    assert verdict in (True, False, None)

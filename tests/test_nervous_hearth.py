"""Nervous system (K7) + Hearth (K13): prestress demotion, falsifiable
transmission model (G18), 50/50 split, unbond delay, salience clamp."""
import pytest

from chronarch_hearth import HearthError, HearthState, salience_multiplier_bps
from chronarch_nervous import (
    build_health_vector,
    measure_restriction,
    predict_transmission,
    prestress_ok,
    test_transmission as transmission_test,
)
from chronarch_spec.constants import (
    MAX_CHALLENGE_GAP_SLOTS,
    MIN_COUNCIL_BOND_CHRONONS,
    MIN_PINSET_SIZE,
    SALIENCE_CLAMP_MAX_BPS,
    SALIENCE_CLAMP_MIN_BPS,
    UNBOND_DELAY_SLOTS,
)

# ---------------------------------------------------------------- nervous --

def test_prestress_below_floor_demotes():
    slack = prestress_ok(bond_chronons=0, pinset_size=0,
                         last_challenge_pass_slot=0, slot=10**6)
    assert not slack["ok"]
    taut = prestress_ok(bond_chronons=MIN_COUNCIL_BOND_CHRONONS,
                        pinset_size=MIN_PINSET_SIZE,
                        last_challenge_pass_slot=100,
                        slot=100 + MAX_CHALLENGE_GAP_SLOTS)
    assert taut["ok"]
    # One slot past cadence: slack again (mandatory gym cadence).
    late = prestress_ok(bond_chronons=MIN_COUNCIL_BOND_CHRONONS,
                        pinset_size=MIN_PINSET_SIZE,
                        last_challenge_pass_slot=100,
                        slot=101 + MAX_CHALLENGE_GAP_SLOTS)
    assert not late["ok"] and not late["checks"]["cadence"]


def test_restriction_predicts_transmission():
    state = measure_restriction("I3", 4000, slot=7)
    assert state["restricted"]
    assert state["prediction"] == {"I4": 2000, "I5": 2000}
    assert predict_transmission("I8", 1000) == {"I10": 500, "I6": 500}


def test_failed_prediction_falsifies_the_model():
    state = measure_restriction("I3", 4000, slot=7)
    ok_report = transmission_test(state, {"I4": 2000, "I5": 1500})
    assert not ok_report["model_falsified"]
    # Strain lands where none was predicted: the MODEL is wrong (G18) —
    # callers must scar that too.
    bad_report = transmission_test(state, {"I9": 3000})
    assert bad_report["model_falsified"]
    wild_report = transmission_test(state, {"I4": 9000})
    assert wild_report["model_falsified"]


def test_health_vector_shape():
    vector = build_health_vector(3, {"hash_walk_integrity": 10000})
    assert vector["epoch"] == 3
    assert len(vector["components"]) == 9
    assert 0 <= vector["total_bps"] <= 10000

# ----------------------------------------------------------------- hearth --

def test_lock_splits_50_50_exactly():
    hearth = HearthState()
    position = hearth.lock("a", 10**12 + 1, slot=0)  # odd amount: no dust lost
    assert position["bond_leg_chronons"] + position["liquidity_leg_chronons"] \
        == position["locked_chronons"]
    assert abs(position["bond_leg_chronons"] - position["liquidity_leg_chronons"]) <= 1


def test_one_lock_per_identity():
    hearth = HearthState()
    hearth.lock("a", 10**12, slot=0)
    with pytest.raises(HearthError):
        hearth.lock("a", 10**12, slot=1)


def test_unbond_delay_holds_so_slashes_land():
    hearth = HearthState()
    hearth.lock("a", 10**15, slot=0)
    hearth.request_unbond("a", slot=10)
    with pytest.raises(HearthError):
        hearth.release("a", slot=10 + UNBOND_DELAY_SLOTS - 1)
    # Slash lands inside the window; only the liquidity leg survives.
    seized = hearth.slash("a", reason="illegal ratification", slot=11)
    assert seized == 10**15 // 2
    assert hearth.treasury_chronons == seized
    returned = hearth.release("a", slot=10 + UNBOND_DELAY_SLOTS)
    assert returned == 10**15 - seized


def test_council_eligibility_floors():
    hearth = HearthState()
    hearth.lock("a", 2 * MIN_COUNCIL_BOND_CHRONONS, slot=0)
    ok = dict(slot=50, pinset_size=MIN_PINSET_SIZE, last_challenge_pass_slot=40)
    assert hearth.council_eligible("a", **ok)
    assert not hearth.council_eligible("a", slot=50, pinset_size=0,
                                       last_challenge_pass_slot=40)
    hearth.request_unbond("a", slot=51)
    assert not hearth.council_eligible("a", **ok)  # unbonding = ineligible


def test_salience_clamp_and_its_limits():
    assert salience_multiplier_bps(0) == SALIENCE_CLAMP_MIN_BPS
    assert salience_multiplier_bps(10**9) == SALIENCE_CLAMP_MAX_BPS
    assert salience_multiplier_bps(10000) == 10000
    # G2 by construction: judgment takes no salience parameter (see
    # test_admission.test_chronos_cannot_flip_challenge).


def test_solvency_instrumentation():
    hearth = HearthState()
    hearth.lock("a", 10**15, slot=0)
    report = hearth.solvency()
    assert report["solvent"]
    assert report["liabilities_chronons"] == 10**15


def test_amm_quote_is_liquidity_math_only():
    hearth = HearthState()
    hearth.lock("a", 2 * 10**15, slot=0)
    quote_small = hearth.quote_axon_for_chronos(10**12)
    quote_big = hearth.quote_axon_for_chronos(10**14)
    assert 0 < quote_small < quote_big

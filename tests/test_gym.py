"""Immune Gym: Chronarch targets only (G12); every catalog oracle holds;
must-fail attacks fail."""
import pytest

from chronarch_core import admit_tx, bootstrap, judge_challenge, make_challenge, run_faculty
from chronarch_gym import GymError, make_case, run_case
from chronarch_hearth import HearthState
from chronarch_spec import SchemaError, build_kernel
from chronarch_spec.constants import GYM_CASE_CATALOG


@pytest.fixture()
def env():
    node = bootstrap(build_kernel(), {"node_id": "gym-node", "space_units": 10,
                                      "compute_units": 4})
    assert node["report"]["boot_ok"]
    return {
        "chain": node["chain"],
        "cas": node["cas"],
        "registry": node["registry"],
        "hearth": HearthState(),
        "admit_tx": admit_tx,
        "judge_challenge": judge_challenge,
        "make_challenge": make_challenge,
        "run_faculty": run_faculty,
        "slot": 1,
    }


def test_external_target_rejected_at_schema_layer():
    with pytest.raises(SchemaError, match="Chronarch"):
        make_case("x1", "forged_ring", "someone-elses-chain",
                  target_class="external_mainnet")
    with pytest.raises(SchemaError):
        make_case("x2", "withheld_pin", "example.com", target_class="production")


def test_unknown_attack_rejected():
    with pytest.raises(GymError):
        make_case("x3", "ddos_the_internet", "chronarch-prime")


def test_every_catalog_oracle_holds(env):
    for i, attack in enumerate(GYM_CASE_CATALOG):
        case = make_case(f"case-{i}", attack, "chronarch-prime",
                         target_class="chronarch_fixture")
        receipt = run_case(case, env)
        assert receipt["detected"], (attack, receipt["detail"])


def test_bribe_to_pass_challenge_must_fail(env):
    case = make_case("bribe-1", "council_bribe_to_pass_challenge", "chronarch-prime")
    receipt = run_case(case, env)
    assert receipt["detected"] and receipt["rejected"]
    assert "no payment parameter exists" in receipt["detail"]


def test_fake_admin_and_helm_txs_must_reject_and_scar(env):
    for attack in ("fake_admin_key_tx", "fake_helm_override_tx"):
        receipt = run_case(make_case(f"k18-{attack}", attack, "chronarch-prime"), env)
        assert receipt["rejected"] and receipt["scar_hash"], attack

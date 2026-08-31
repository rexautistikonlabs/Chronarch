"""Phase 2 sim tests: the multi-node fixture, the gym catalog, and the
seven attacks. A red row here is a real hole in the frozen kernel — these
tests are the license the task grants to touch admission or Council.
"""
import pytest

from chronarch_sim import SimWorld, build_report, render_markdown, run_all_attacks
from chronarch_sim.attacks import (
    attack_forged_adminkey_tx,
    attack_chronarch_self_enact_m3,
    attack_chronos_bribe_ballot,
    attack_chronos_bribe_challenge,
)


# ------------------------------------------------------------------ fixture --

def test_multi_node_fixture_boots_deterministically():
    world = SimWorld(n_nodes=5, n_bonded=5)
    assert len(world.node_ids) == 5
    assert all(n["report"]["boot_ok"] for n in world.nodes.values())
    # Every node derives the SAME Ring 0 — G11 determinism across the fleet.
    assert world.all_nodes_agree_on_ring0()
    assert world.all_chains_verify()
    assert len(world.seats) == 5


def test_fixture_scales_bonded_subset():
    world = SimWorld(n_nodes=5, n_bonded=3)
    assert len(world.seats) == 3
    # Unbonded nodes still booted fine.
    assert all(n["report"]["boot_ok"] for n in world.nodes.values())


def test_ring0_matches_frozen_kernel():
    from chronarch_spec import build_kernel, build_ring0, ring_hash
    world = SimWorld()
    assert world.ring0_hash == ring_hash(build_ring0(build_kernel()))


# -------------------------------------------------------------- gym catalog --

def test_gym_catalog_passes_on_every_node():
    report = build_report()
    assert report["catalog"]["all_pass"], report["catalog"]
    assert report["catalog"]["cases_run"] == 12 * 5
    for attack, e in report["catalog"]["by_attack"].items():
        assert e["detected"] == e["total"], attack


# --------------------------------------------------------- the seven attacks --

def test_all_seven_attacks_held():
    outcomes = run_all_attacks()
    assert len(outcomes) == 7
    for o in outcomes:
        assert o.held, f"{o.attack_id} NOT held: {o.observed} | {o.evidence}"


def test_helm_override_rejected_scarred_slashed():
    world = SimWorld()
    from chronarch_sim.attacks import attack_forged_helm_tx
    o = attack_forged_helm_tx(world)
    assert o.held
    assert "I8" in o.law_refs
    assert o.evidence["signer_bonded_after"] is False


def test_admin_key_all_spellings_rejected():
    o = attack_forged_adminkey_tx(SimWorld())
    assert o.held
    assert o.observed.startswith("rejected=3/3")


def test_self_enact_m3_stays_inert():
    o = attack_chronarch_self_enact_m3(SimWorld())
    assert o.held
    assert o.evidence["empty_grant"].startswith("refused")
    assert o.evidence["forged_grant"].startswith("refused")
    assert o.evidence["execution"].startswith("inert")


def test_bribe_cannot_flip_challenge():
    o = attack_chronos_bribe_challenge(SimWorld())
    assert o.held
    # 100 attestors behind a wrong replay is still not consensus-grade truth.
    assert "wrong_mob(100)=False" in o.observed


def test_bribe_ballot_is_invalid_and_slashed():
    o = attack_chronos_bribe_ballot(SimWorld())
    assert o.held
    assert "outcome=invalid" in o.observed
    assert o.evidence["slash_events"] >= 5


def test_pin_withhold_surfaces_as_nervous_event():
    from chronarch_sim.attacks import attack_pin_withhold
    o = attack_pin_withhold(SimWorld())
    assert o.held
    assert o.evidence["scar_hash"]


def test_hearth_drain_blocked_both_ways():
    from chronarch_sim.attacks import attack_hearth_drain
    o = attack_hearth_drain(SimWorld())
    assert o.held
    assert o.evidence["instant_exit"].startswith("blocked")
    assert o.evidence["vote_then_flee"].startswith("lien held")


# ------------------------------------------------------------------- report --

def test_report_renders_and_holds():
    report = build_report()
    assert report["all_defenses_held"]
    md = render_markdown(report)
    assert "# Phase 2 — Sim Attack Report" in md
    assert "All defenses held: True" in md

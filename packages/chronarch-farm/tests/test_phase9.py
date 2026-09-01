"""Phase 9 tests: the Chronarch-native PoST façade (post.py), the SlotHeader
rename to canonical names with kwarg aliases, lottery invariance across the
rename, and a guard that no spec claims CHIP-48 / Chia mainnet compatibility.
"""
import re
from pathlib import Path

import pytest

from chronarch_farm import (
    filter_ok,
    genesis_pulse,
    make_space_proof,
    make_space_seal,
    make_time_proof,
    make_time_seal,
    next_pulse,
    space_table_from_commitments,
    verify_pulse,
    verify_space_proof,
    verify_space_seal,
    verify_time_proof,
    verify_time_seal,
)
from chronarch_farm.adapter import commitments_from_abstract
from chronarch_node import build_slot_header, verify_slot_header
from chronarch_node.leader import slot_leader

REPO = Path(__file__).resolve().parents[3]


# ------------------------------------------------------------ post façade ----

def test_space_seal_and_proof_honest_and_garbage():
    seal = make_space_seal("farmer", "k32")
    verify_space_seal(seal)
    pulse = genesis_pulse()
    proof = make_space_proof(seal, pulse)
    assert verify_space_proof(proof, seal["space_units"])["ok"]
    assert filter_ok(proof["quality_string"])
    # Garbage proof fails.
    assert not verify_space_proof(dict(proof, proof_bytes="deadbeef"),
                                  seal["space_units"])["ok"]


def test_pulse_chain_and_verify():
    p0 = genesis_pulse()
    assert verify_pulse(p0, "", "", 0)
    # A next pulse recomputes; a wrong prev is rejected.
    seal = make_space_seal("f", "test")
    proof = make_space_proof(seal, p0)
    p1 = next_pulse(proof["quality_string"], p0, 1)
    assert verify_pulse(p1, proof["quality_string"], p0, 1)
    assert not verify_pulse(p1, "wrong", p0, 1)


def test_time_seal_honest_and_wrong_prev():
    pulse = genesis_pulse()
    ts = make_time_seal(pulse, "", iterations=16)
    assert verify_time_seal(ts, pulse, "")
    assert not verify_time_seal(ts, pulse, "f" * 64)  # wrong prev_vdf_output
    assert not verify_time_seal(dict(ts, output="0" * 64), pulse, "")  # tampered


def test_time_proof_optional_honest_and_tampered():
    pulse = genesis_pulse()
    tp = make_time_proof(pulse, 64)
    assert verify_time_proof(pulse, tp)
    assert not verify_time_proof(pulse, dict(tp, y=0))
    assert not verify_time_proof("other-pulse", tp)


def test_facade_adds_no_lottery_math():
    # The façade only composes internals; equal units still elect identically.
    fleet = {"a": 100, "b": 1014, "c": 7}
    commitments = []
    for f, u in fleet.items():
        commitments.extend(commitments_from_abstract(f, u))
    assert space_table_from_commitments(commitments) == fleet
    for slot in range(200):
        assert slot_leader(slot, fleet) == slot_leader(slot, space_table_from_commitments(commitments))


# ---------------------------------------------- canonical names + aliases ----

def test_slot_header_uses_canonical_names():
    seal = make_space_seal("n", "test")
    sh = build_slot_header(slot=1, leader="n", commitment=seal, space_units=100,
                           prev_slot_header=None)
    for canonical in ("filter_bits", "extra_weight", "time_proof"):
        assert canonical in sh
    # The deprecated field names are gone from the emitted header.
    for deprecated in ("plot_filter_bits", "extra_delta", "wesolowski_proof"):
        assert deprecated not in sh


def test_deprecated_kwargs_still_work():
    seal = make_space_seal("n", "test")
    # extra_delta= maps to extra_weight; with_wesolowski= maps to with_time_proof.
    a = build_slot_header(slot=1, leader="n", commitment=seal, space_units=100,
                          prev_slot_header=None, extra_delta=5, with_wesolowski=True)
    b = build_slot_header(slot=1, leader="n", commitment=seal, space_units=100,
                          prev_slot_header=None, extra_weight=5, with_time_proof=True)
    assert a["extra_weight"] == b["extra_weight"] == 5
    assert a["time_proof"] is not None and b["time_proof"] is not None
    assert verify_slot_header(a, space_units=100, prev_slot_header=None)["ok"]
    assert verify_slot_header(b, space_units=100, prev_slot_header=None)["ok"]


def test_lottery_winners_identical_before_and_after_rename():
    # The rename is cosmetic; the winner is the space-weighted draw, unchanged.
    fleet = {"x": 200, "y": 50}
    for slot in range(200):
        winner = slot_leader(slot, fleet)
        seal = make_space_seal(winner, "test")
        sh = build_slot_header(slot=slot, leader=winner, commitment=seal,
                               space_units=fleet[winner], prev_slot_header=None,
                               extra_weight=slot)  # arbitrary inert weight
        assert sh["leader"] == winner
        assert verify_slot_header(sh, space_units=fleet[winner], prev_slot_header=None)["ok"]


# ------------------------------------------- no CHIP-48 compatibility claim --

def test_no_spec_claims_chip48_or_mainnet_compatibility():
    """Every 'compatib...' line in specs/README must be a NEGATION, and no
    positive 'CHIP-48/PoST 2.0/mainnet compatible' claim may appear."""
    negations = ("not", "no ", "never", "non-goal", "without", "does not",
                 "n't", "no claim", "deferred", "out of scope")
    positive = re.compile(r"(chip-?48|post ?2\.0|mainnet)[- ]?compatible", re.I)
    chia_token = re.compile(r"chip-?48|post ?2\.0|mainnet|chia", re.I)
    targets = list((REPO / "specs").glob("*.md"))
    for extra in ("README.md", "AGENTS.md"):
        p = REPO / extra
        if p.exists():
            targets.append(p)
    offenders = []
    for path in targets:
        for i, line in enumerate(path.read_text().splitlines(), 1):
            low = line.lower()
            if positive.search(line):
                offenders.append(f"{path.name}:{i}: positive claim: {line.strip()}")
            # A compatibility mention adjacent to a Chia token must be negated
            # ("backward compatible" carries no Chia token and is fine).
            elif "compatib" in low and chia_token.search(line) \
                    and not any(n in low for n in negations):
                offenders.append(f"{path.name}:{i}: unqualified: {line.strip()}")
    assert not offenders, offenders


def test_chronarch_post_spec_exists():
    assert (REPO / "specs" / "CHRONARCH_POST.md").exists()

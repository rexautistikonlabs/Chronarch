"""Phase 17 tests: a two-home local net.

Two durable homes gossip slots on the in-process bus and converge on one head.
They diverge in identity, converge in head_hash; SPACE credits go to the actual
leaders; a second net_run resumes both homes; and the single-home pulse is
untouched. Still not a public network.
"""
import pytest

from chronarch_node import HomeError, Node, net_run, pulse
from chronarch_spec.constants import SPACE_SHARE_CHRONONS


def _homes(tmp_path, n=2):
    return [str(tmp_path / f"home-{i}") for i in range(n)]


def test_two_homes_diverge_in_identity_converge_in_head(tmp_path):
    result = net_run(_homes(tmp_path), slots=6)
    ids = {h["identity"] for h in result["homes"]}
    assert ids == {"net-node-0", "net-node-1"}  # distinct identities
    heads = {h["head_hash"] for h in result["homes"]}
    assert len(heads) == 1  # converged on one head
    assert result["converged"] is True
    heights = {h["height"] for h in result["homes"]}
    assert heights == {6}


def test_sum_of_won_slots_equals_produced_leader_slots(tmp_path):
    result = net_run(_homes(tmp_path), slots=8)
    assert sum(h["won_slots"] for h in result["homes"]) == len(result["leaders"])


def test_space_credits_go_to_the_actual_leaders(tmp_path):
    result = net_run(_homes(tmp_path), slots=8)
    won = {h["identity"]: h["won_slots"] for h in result["homes"]}
    for home in result["homes"]:
        # Each home's SPACE credit == (slots it led) * the space share. A
        # follower never credits itself for a slot it did not lead.
        expected = won[home["identity"]] * SPACE_SHARE_CHRONONS
        assert home["credits_by_reason"].get("space", 0) == expected
    # And the leaders list only names homes that exist in the net.
    assert set(result["leaders"]) <= set(won)


def test_second_net_run_resumes_both_homes(tmp_path):
    homes = _homes(tmp_path)
    first = net_run(homes, slots=4)
    assert all(h["height"] == 4 for h in first["homes"])

    second = net_run(homes, slots=4)
    assert all(h["height"] == 8 for h in second["homes"])
    assert second["converged"] is True
    # Identities persist across the restart (recovered from each home).
    assert {h["identity"] for h in second["homes"]} == {"net-node-0", "net-node-1"}
    # Credits accumulate across the two runs.
    first_space = {h["identity"]: h["credits_by_reason"].get("space", 0) for h in first["homes"]}
    second_space = {h["identity"]: h["credits_by_reason"].get("space", 0) for h in second["homes"]}
    assert all(second_space[i] >= first_space[i] for i in first_space)


def test_net_run_is_deterministic(tmp_path):
    a = net_run([str(tmp_path / "a0"), str(tmp_path / "a1")], slots=6)
    b = net_run([str(tmp_path / "b0"), str(tmp_path / "b1")], slots=6)
    assert a["leaders"] == b["leaders"]
    assert {h["head_hash"] for h in a["homes"]} == {h["head_hash"] for h in b["homes"]}


def test_net_all_homes_verify_full(tmp_path):
    homes = _homes(tmp_path)
    net_run(homes, slots=5)
    # Phase 18: a BARE Node(home=DIR) resumes and verifies a net ledger with
    # peer-led slots — the validator set comes from the persisted peers.json,
    # no conductor needed.
    for home in homes:
        node = Node("x", home=home)
        assert node.ledger.verify_full()


def test_net_kernel_mismatch_still_fails_closed(tmp_path):
    import json
    import os
    homes = _homes(tmp_path)
    net_run(homes, slots=2)
    boot = os.path.join(homes[0], "boot.json")
    report = json.load(open(boot))
    report["kernel_hash"] = "0" * 64
    with open(boot, "w") as f:
        f.write(json.dumps(report, sort_keys=True))
    with pytest.raises(HomeError) as exc:
        net_run(homes, slots=2)
    assert "HOME_KERNEL_MISMATCH" in str(exc.value)


def test_net_does_not_seal_credits_into_the_timechain(tmp_path):
    import json
    import os
    homes = _homes(tmp_path)
    net_run(homes, slots=4)
    for home in homes:
        assert os.path.isfile(os.path.join(home, "rewards.jsonl"))
        log = open(os.path.join(home, "ledger", "log.jsonl")).read()
        assert "chronos:treasury" not in log
        assert '"reason"' not in log
        # Only economic slot rings on the consensus chain — no proposal ring.
        for line in log.splitlines():
            obj = json.loads(line)
            if obj["t"] == "ring":
                assert obj["ring_type"] == "economic"


def test_net_requires_at_least_two_homes(tmp_path):
    with pytest.raises(ValueError):
        net_run([str(tmp_path / "only")], slots=2)


def test_single_home_pulse_still_works(tmp_path):
    result = pulse(str(tmp_path / "solo"))
    assert result["won_slots"] >= 1
    assert result["credits_by_reason"]["space"] > 0
    assert result["pins_ok"] is True

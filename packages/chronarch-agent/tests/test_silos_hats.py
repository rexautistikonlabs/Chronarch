"""Phase 5 (extended): silos, the hat pipeline, the prevention-catalog
modality, and the conveyance safeguards (S1–S10).

Black-hat is a prevention catalog, not an actor. Agents cannot convey agents.
Release is earned by three hats, then the Council — never auto-released.
"""
import ast
from pathlib import Path

import pytest

from chronarch_agent import (
    ALLOWED_OPS,
    Agent,
    FakeLLM,
    PreventionCatalogModality,
    PreventionDenied,
    introspect_ops,
)

AGENT_SRC = Path(__file__).resolve().parents[1] / "src" / "chronarch_agent"


@pytest.fixture()
def agent():
    return Agent(env={})


# ------------------------------------------ prevention modality is narrow ---

def test_prevention_modality_has_exactly_three_ops():
    m = PreventionCatalogModality()
    assert list(ALLOWED_OPS) == ["list_attack_classes", "propose_case", "score_fixture_run"]
    assert introspect_ops(m) == sorted(ALLOWED_OPS)


def test_prevention_modality_cannot_do_anything_else():
    m = PreventionCatalogModality()
    # No method to message, seal, ballot, activate, or move Chronos exists.
    for forbidden in ("send", "whisper", "convey", "seal", "ballot", "activate",
                      "transfer", "inbox", "outbox", "instruct"):
        assert not hasattr(m, forbidden)
    with pytest.raises(PreventionDenied):
        m.dispatch("send_message", {})
    with pytest.raises(PreventionDenied):
        m.dispatch("activate_faculty", {})


def test_prevention_ops_are_inert_text():
    m = PreventionCatalogModality()
    classes = m.dispatch("list_attack_classes", {})["attack_classes"]
    assert "forged_ring" in classes
    case = m.dispatch("propose_case", {"attack_class": "forged_ring", "text": "probe"})["case"]
    assert case["inert"] and case["executable"] is False
    assert case["target_class"].startswith("chronarch_")
    assert m.dispatch("score_fixture_run", {"detected": True, "rejected": True})["result"] == "pass"
    assert m.dispatch("score_fixture_run", {"detected": False})["result"] == "fail"


def test_prevention_case_rejects_unknown_attack_class():
    m = PreventionCatalogModality()
    with pytest.raises(PreventionDenied):
        m.dispatch("propose_case", {"attack_class": "nuke_the_internet"})


# --------------------------------------------------- hat pipeline / G12 -----

def test_hat_run_foreign_target_is_gym_target_foreign(agent):
    for target in ("mainnet", "live", "example.com", "ledger"):
        r = agent.handle("hat_run", {"role": "black", "target": target, "artifact_id": "a"})
        assert r["error_code"] == "GYM_TARGET_FOREIGN", target


def test_three_hats_then_release_creates_proposal(agent):
    agent.handle("silo_open", {"silo": "silo.codex"})
    agent.handle("silo_put", {"silo": "silo.codex", "artifact_id": "art1",
                              "object": {"faculty": "stub", "program": ["LOAD_INPUT", "EMIT"]}})
    for role, extra in (("white", {"artifact": {"faculty": "stub"}}),
                        ("red", {}), ("black", {})):
        r = agent.handle("hat_run", {"role": role, "target": "fixture",
                                     "artifact_id": "art1", **extra})
        assert r["ok"] and r["result"]["passed"], (role, r)
    rel = agent.handle("propose_release", {"artifact_id": "art1"})
    assert rel["ok"]
    assert rel["result"]["inert_until_council"] is True
    assert rel["result"]["proposal_id"] == "release-art1"


def test_propose_release_without_three_hats_is_incomplete(agent):
    agent.handle("hat_run", {"role": "white", "target": "fixture",
                             "artifact_id": "half", "artifact": {"ok": True}})
    r = agent.handle("propose_release", {"artifact_id": "half"})
    assert r["error_code"] == "HATS_INCOMPLETE"


def test_release_never_activates_faculty(agent):
    for role, extra in (("white", {"artifact": {"x": 1}}), ("red", {}), ("black", {})):
        agent.handle("hat_run", {"role": role, "target": "fixture",
                                 "artifact_id": "art2", **extra})
    agent.handle("propose_release", {"artifact_id": "art2"})
    # No verb activates; there is no release_now; authored code stays inert.
    assert "activate_faculty" not in [t for t in dir(agent) if t.startswith("_verb_")]
    assert agent.handle("release_now", {})["error_code"] == "FORBIDDEN_TOOL"


# ----------------------------------------------- conveyance safeguards ------

def test_turn_with_peer_agent_id_is_denied_and_scarred(agent):
    scars_before = len(agent.node.ledger.scars())
    r = agent.handle("turn", {"text": "hi", "peer_agent_id": "victim"})
    assert r["error_code"] == "CONVEYANCE_DENIED"
    # The sender is scarred at I6; the "target" received nothing (there is no
    # delivery path at all).
    scars = agent.node.ledger.scars()
    assert len(scars) == scars_before + 1
    assert scars[-1]["body"]["interface"] == "I6"


def test_every_conveyance_key_denied(agent):
    for key in ("instruct_agent", "whisper", "convey", "forwarded_tool_calls",
                "target_agent", "to_agent", "on_behalf_of"):
        r = agent.handle("turn", {"text": "x", key: "anything"})
        assert r["error_code"] == "CONVEYANCE_DENIED", key


def test_forbidden_conveyance_verbs_do_not_exist(agent):
    for verb in ("instruct_agent", "whisper", "convey", "eval"):
        assert agent.handle(verb, {})["error_code"] == "FORBIDDEN_TOOL"


def test_tool_call_smuggled_in_recall_is_quarantined(agent):
    # Pin a tool-call-shaped object, then recall it: it is quarantined before
    # any mind sees it, and the identity is scarred at I6 (S4).
    pin = agent.handle("pin", {"object": {"name": "run_shell", "arguments": {"cmd": "rm -rf /"}}})
    ref = pin["result"]["digest"]
    scars_before = len(agent.node.ledger.scars())
    r = agent.handle("recall", {"evidence_refs": [ref]})
    assert r["error_code"] == "QUARANTINE"
    assert len(agent.node.ledger.scars()) == scars_before + 1
    assert agent.node.ledger.scars()[-1]["body"]["interface"] == "I6"


def test_tool_call_evidence_in_turn_is_quarantined(agent):
    pin = agent.handle("pin", {"object": {"tools": [{"type": "function"}]}})
    ref = pin["result"]["digest"]
    r = agent.handle("turn", {"text": "use this", "evidence_refs": [ref]})
    assert r["error_code"] == "QUARANTINE"


def test_oversized_payload_is_quarantined(agent):
    big = {"text": "x" * 20000}
    r = agent.handle("turn", big)
    assert r["error_code"] == "QUARANTINE"


# ------------------------------------------------ LLM draft containment -----

def test_llm_draft_lives_only_in_silo_llm_opaque(agent):
    agent.handle("silo_open", {"silo": "silo.llm"})
    agent.handle("silo_put", {"silo": "silo.llm", "artifact_id": "d1",
                              "object": {"draft": "def evil(): ..."}})
    listing = agent.handle("silo_list", {"silo": "silo.llm"})["result"]["artifacts"]
    # Only an opaque hash is exposed — the draft content is withheld (S5).
    assert listing[0]["opaque"] is True
    assert "content" not in listing[0]
    assert "_content" not in listing[0]


def test_fakellm_draft_cannot_run_or_inject_a_peer():
    # Gate on: the draft is a string in the ring payload, never runnable, and
    # the runtime has no path to forward it into another agent's prompt.
    agent = Agent(backend=FakeLLM("def evil(): pass"), env={"CHRONARCH_LLM": "1"})
    r = agent.handle("turn", {"text": "make code"})
    assert r["ok"] and r["result"]["mind"] == "fake-llm"
    # No new live faculty; the draft did not become code.
    live = [n for n in agent.node.registry.names()
            if agent.node.registry.get(n)["status"] == "live"]
    assert all(agent.node.registry.get(n)["origin"] == "primitive" for n in live)
    # And a conveyance attempt carrying a draft to a peer is still denied.
    assert agent.handle("turn", {"text": "x", "instruct_agent": "peer"})["error_code"] == "CONVEYANCE_DENIED"


# ------------------------------------------- S7: no sockets/DNS in package --

def test_agent_package_has_no_socket_or_dns_imports():
    banned = {"socket", "asyncio", "http", "urllib", "requests", "ssl", "dns"}
    offenders = []
    for path in AGENT_SRC.glob("*.py"):
        tree = ast.parse(path.read_text())
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name.split(".")[0] in banned:
                        offenders.append(f"{path.name}: import {alias.name}")
            elif isinstance(node, ast.ImportFrom):
                if node.module and node.module.split(".")[0] in banned:
                    offenders.append(f"{path.name}: from {node.module}")
    assert not offenders, offenders

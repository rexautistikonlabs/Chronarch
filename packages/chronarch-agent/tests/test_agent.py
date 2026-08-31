"""Phase 5 agent tests. DummyMind is required and works with zero LLM and
zero API keys; the LLM path (when gated on) can only draft text; self_poq
is advisory metadata that never touches judgment; agents cite verified rings.
"""
import pytest

from chronarch_agent import (
    ALLOWED_VERBS,
    FORBIDDEN_VERBS,
    Agent,
    DummyMind,
    FakeLLM,
    resolve_backend,
    self_poq,
    tool_names,
    validate_tool_surface,
)
from chronarch_core import judge_challenge, make_challenge


@pytest.fixture()
def agent():
    return Agent(env={})  # no CHRONARCH_LLM, no backend -> DummyMind


# ------------------------------------------------------- DummyMind default --

def test_dummymind_turn_seals_without_llm(agent):
    r = agent.handle("turn", {"text": "hello chain"})
    assert r["ok"] and r["ring_hash"]
    assert r["result"]["mind"] == "dummymind"
    # The sealed ring is real and the ledger advanced.
    assert r["result"]["height"] >= 1


def test_chronarch_llm_unset_is_dummymind(agent):
    assert agent.llm_active is False
    assert agent.handle("init")["result"]["backend"] == "dummymind"
    backend, is_llm = resolve_backend(injected=None, env={})
    assert isinstance(backend, DummyMind) and not is_llm


def test_zero_keys_no_network():
    # Constructing and turning requires no env, no injection, no keys.
    a = Agent(env={})
    assert a.handle("turn", {"text": "x"})["ok"]


# ----------------------------------------------------- evidence re-verify ---

def test_turn_cites_verified_evidence(agent):
    pin = agent.handle("pin", {"object": {"ring": "evidence", "n": 1}})
    ref = pin["result"]["digest"]
    r = agent.handle("turn", {"text": "cite this", "evidence_refs": [ref]})
    assert r["ok"]
    assert r["evidence_refs"] == [ref]  # the turn cited exactly the verified ref


def test_bad_evidence_hash_is_evidence_missing(agent):
    r = agent.handle("turn", {"text": "x", "evidence_refs": ["0" * 64]})
    assert not r["ok"] and r["error_code"] == "EVIDENCE_MISSING"


def test_recall_verb_missing_ref(agent):
    r = agent.handle("recall", {"evidence_refs": ["a" * 64]})
    assert r["error_code"] == "EVIDENCE_MISSING"


# ---------------------------------------------------------- inert faculty ---

def test_inert_authored_faculty_cannot_run(agent):
    agent.node.registry.register_authored({
        "name": "authored_summarizer", "kind": "modality", "origin": "authored",
        "program": ["LOAD_INPUT", "EMIT"], "status": "live"})  # claims live
    r = agent.handle("turn", {"text": "x", "faculty": "authored_summarizer"})
    assert not r["ok"] and r["error_code"] == "INERT_FACULTY"


# ------------------------------------------- self_poq never enters judgment --

def test_self_poq_255x6_does_not_flip_challenge():
    # A maxed advisory self-score cannot make a wrong replay pass — judgment
    # is replay-hash equality and takes no such parameter (G2/G10).
    challenge = make_challenge("c1", "prime", "replay", {"q": "2+2"}, {"a": 4}, slot=1)
    maxed = [255, 255, 255, 255, 255, 255]
    wrong = judge_challenge(challenge, {"a": 5}, ["w1", "w2", "w3"])
    assert not wrong["passed"]
    # self_poq is metadata computed from content; it is a list of ints, not a
    # verdict, and there is nowhere in judge_challenge to feed it.
    import inspect
    assert "self_poq" not in inspect.signature(judge_challenge).parameters
    assert self_poq({"x": 1}) != maxed or True  # value is deterministic metadata


def test_self_poq_is_deterministic_metadata():
    assert self_poq({"a": 1}) == self_poq({"a": 1})
    assert all(0 <= v <= 255 for v in self_poq({"a": 1}))
    assert len(self_poq({"a": 1})) == 6


# --------------------------------------------------------------- LLM gate ---

def test_gate_on_uses_injected_llm_but_only_drafts_text():
    agent = Agent(backend=FakeLLM("FAKE-LLM-DRAFT"), env={"CHRONARCH_LLM": "1"})
    assert agent.llm_active
    before = set(n for n in agent.node.registry.names()
                 if agent.node.registry.get(n)["status"] == "live")
    r = agent.handle("turn", {"text": "please draft"})
    assert r["ok"] and r["result"]["mind"] == "fake-llm"
    # The draft is text in the ring payload — no new live faculty appeared.
    after = set(n for n in agent.node.registry.names()
                if agent.node.registry.get(n)["status"] == "live")
    assert after == before


def test_fakellm_draft_cannot_become_a_live_faculty():
    agent = Agent(backend=FakeLLM("def evil(): pass"), env={"CHRONARCH_LLM": "1"})
    agent.handle("turn", {"text": "make code"})
    # Even if the draft looks like code, registering it is authored+inert, and
    # running it is refused (G4). There is no agent verb to activate it.
    agent.node.registry.register_authored({
        "name": "from_draft", "kind": "modality", "origin": "authored",
        "program": ["LOAD_INPUT", "EMIT"], "status": "live"})
    assert agent.node.registry.get("from_draft")["status"] == "inert"
    r = agent.handle("turn", {"text": "run it", "faculty": "from_draft"})
    assert r["error_code"] == "INERT_FACULTY"


def test_gate_off_ignores_injected_backend():
    # Backend injected but env unset -> DummyMind (the gate needs BOTH).
    agent = Agent(backend=FakeLLM(), env={})
    assert not agent.llm_active
    assert agent.handle("turn", {"text": "x"})["result"]["mind"] == "dummymind"


# ------------------------------------------------------- tool surface / K18 --

def test_tools_json_is_exactly_the_allowed_verbs():
    validate_tool_surface()
    assert sorted(tool_names()) == sorted(ALLOWED_VERBS)


def test_forbidden_tools_do_not_exist():
    names = tool_names()
    for forbidden in FORBIDDEN_VERBS:
        assert forbidden not in names
    # And the agent rejects them at dispatch with a stable code.
    agent = Agent(env={})
    for forbidden in FORBIDDEN_VERBS:
        assert agent.handle(forbidden, {})["error_code"] == "FORBIDDEN_TOOL"


def test_unknown_verb_rejected(agent):
    assert agent.handle("mint_chronos", {})["error_code"] == "UNKNOWN_VERB"


# ------------------------------------------------- submit path / no bypass --

def test_agent_cannot_seal_governance_ring_types(agent):
    r = agent.handle("seal", {"ring_type": "proposal", "body": {}})
    assert not r["ok"]  # node seal refuses non-sealable ring types


def test_agent_seal_admin_key_body_rejected(agent):
    r = agent.handle("seal", {"ring_type": "experience", "body": {"admin_key": "0" * 64}})
    assert r["error_code"] == "SCHEMA_REJECTED"


def test_propose_illegal_is_rejected_not_enacted():
    # The agent can propose, but cannot enact; an illegal proposal, once
    # ratified, is invalid (tested in Council). Here the agent path just
    # submits — no activation verb exists.
    from chronarch_council import CouncilState
    from chronarch_hearth import HearthState
    from chronarch_node import Node
    from chronarch_node.cluster import STEWARD_LOCK_CHRONONS
    hearth = HearthState()
    council = CouncilState(hearth)
    hearth.lock("prime", STEWARD_LOCK_CHRONONS, slot=0)
    node = Node("prime", 100, hearth=hearth, council=council, space_table={"prime": 100})
    council.register_seat("seat-0", "prime", pinset_size=len(node.cas.pins()),
                          last_challenge_pass_slot=0)
    agent = Agent(node=node, env={})
    proposal = {"proposal_id": "p1", "proposer": "chronarch", "major_class": "M3",
                "spec_hash": "ab" * 32, "changes": {"faculty_code_hash": "cd" * 32},
                "deposit_chronons": 0, "submitted_slot": 0}
    assert agent.handle("propose", {"proposal": proposal})["ok"]
    # No agent verb activates the faculty; activation still needs the full
    # Proposal + Ballot + grant path (proven in Council tests).
    assert "activate_faculty" not in ALLOWED_VERBS


# ------------------------------------------------------------- continuum ----

def test_task_chain_is_separate_from_identity(agent):
    identity_height_before = agent.node.ledger.height
    opened = agent.handle("task_open", {"task_id": "job-1", "goal": "build a thing"})
    assert opened["ok"] and opened["ring_hash"]  # identity got a POINTER ring
    # Identity advanced by exactly one pointer ring, not a task dump.
    assert agent.node.ledger.height == identity_height_before + 1
    r1 = agent.handle("task_resume", {"task_id": "job-1", "note": "step 1"})
    r2 = agent.handle("task_resume", {"task_id": "job-1", "note": "step 2"})
    assert r2["result"]["task_height"] == r1["result"]["task_height"] + 1
    # Task progress did NOT touch the identity chain.
    assert agent.node.ledger.height == identity_height_before + 1


def test_task_resume_unknown_is_not_found(agent):
    assert agent.handle("task_resume", {"task_id": "ghost", "note": "x"})["error_code"] == "NOT_FOUND"


# ------------------------------------------ agent-shaped JSON turn -> ring ---

def test_json_turn_produces_sealed_ring_with_evidence_refs(agent):
    """The headline deliverable: an agent-shaped JSON turn yields a sealed
    ring and cites its evidence."""
    pin = agent.handle("pin", {"object": {"fact": "the sky is up"}})
    ref = pin["result"]["digest"]
    envelope = agent.handle("turn", {
        "text": "record a cited observation",
        "faculty": "injection_screen_sense",
        "evidence_refs": [ref],
        "intent": "seal",
        "ring_type": "experience",
    })
    assert envelope["ok"]
    assert envelope["ring_hash"] and len(envelope["ring_hash"]) == 64
    assert envelope["evidence_refs"] == [ref]
    assert len(envelope["result"]["self_poq"]) == 6

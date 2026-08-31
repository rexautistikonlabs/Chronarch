"""DummyMind (K16): deterministic interpreter for primitive faculty programs.

Runs ONLY live-registry faculty hashes (G3). Re-hashes the program before
every run so a tampered record cannot execute (the recomputed code hash no
longer matches). No LLM, no I/O, no clock, no randomness — a faculty is a
pure function of (inputs, env primitives).
"""
from __future__ import annotations

from chronarch_spec import SchemaError, screen_keys
from chronarch_spec.constants import OPCODE_MENU

from .registry import FacultyRegistry, InertFacultyError, RegistryError, faculty_code_hash


class ExecutorError(ValueError):
    pass


def _op_load_input(stack, inputs, env):
    stack.append(inputs)


def _op_const(stack, inputs, env):
    stack.append(inputs.get("const"))


def _op_hash_walk(stack, inputs, env):
    stack.append(env["hash_walk"](stack.pop()))


def _op_pin_fetch(stack, inputs, env):
    stack.append(env["pin_fetch"](stack.pop()))


def _op_pin_verify(stack, inputs, env):
    stack.append(env["pin_verify"](stack.pop()))


def _op_screen_injection(stack, inputs, env):
    payload = stack.pop()
    try:
        screen_keys(payload)
    except SchemaError as exc:
        stack.append({"clean": False, "reason": str(exc)})
        return
    stack.append({"clean": True, "reason": ""})


def _op_diff_covenant(stack, inputs, env):
    stack.append(env["diff_covenant"](stack.pop()))


def _op_measure_prestress(stack, inputs, env):
    stack.append(env["measure_prestress"](stack.pop()))


def _op_predict_transmission(stack, inputs, env):
    stack.append(env["predict_transmission"](stack.pop()))


def _op_emit_scar(stack, inputs, env):
    # Produces a scar BODY. Sealing is core's job (chain.seal_scar) so a
    # faculty can never write history directly.
    payload = stack.pop()
    stack.append({
        "interface": payload["interface"],
        "cause": payload["cause"],
        "evidence_hashes": list(payload.get("evidence_hashes", [])),
        "restriction_hash": payload.get("restriction_hash", ""),
    })


def _op_draft_proposal(stack, inputs, env):
    # Produces an INERT proposal body (G15). Submission, gym review, voting
    # and activation all happen elsewhere; drafting enacts nothing.
    payload = stack.pop()
    stack.append({"draft": payload, "inert": True})


def _op_score_health(stack, inputs, env):
    stack.append(env["score_health"](stack.pop()))


def _op_sum_rewards(stack, inputs, env):
    stack.append(env["sum_rewards"](stack.pop()))


def _op_tally_ballots(stack, inputs, env):
    stack.append(env["tally_ballots"](stack.pop()))


def _op_thresh(stack, inputs, env):
    value = stack.pop()
    threshold = inputs.get("threshold", 0)
    numeric = value if isinstance(value, int) else len(value) if hasattr(value, "__len__") else 0
    stack.append(numeric >= threshold)


def _op_emit(stack, inputs, env):
    if not stack:
        raise ExecutorError("EMIT on empty stack")


_OPS = {
    "LOAD_INPUT": _op_load_input,
    "CONST": _op_const,
    "HASH_WALK": _op_hash_walk,
    "PIN_FETCH": _op_pin_fetch,
    "PIN_VERIFY": _op_pin_verify,
    "SCREEN_INJECTION": _op_screen_injection,
    "DIFF_COVENANT": _op_diff_covenant,
    "MEASURE_PRESTRESS": _op_measure_prestress,
    "PREDICT_TRANSMISSION": _op_predict_transmission,
    "EMIT_SCAR": _op_emit_scar,
    "DRAFT_PROPOSAL": _op_draft_proposal,
    "SCORE_HEALTH": _op_score_health,
    "SUM_REWARDS": _op_sum_rewards,
    "TALLY_BALLOTS": _op_tally_ballots,
    "THRESH": _op_thresh,
    "EMIT": _op_emit,
}

assert set(_OPS) == set(OPCODE_MENU), "executor must implement exactly the audited opcode menu"


def run_faculty(registry: FacultyRegistry, name: str, inputs: dict, env: dict):
    """Execute a faculty. Raises InertFacultyError for anything not live."""
    record = registry.get_live(name)  # G3/G4 gate
    if faculty_code_hash(record) != record["code_hash"]:
        raise RegistryError(f"faculty {name!r} program does not match its code hash")
    stack: list = []
    for opcode in record["program"]:
        if opcode not in _OPS:
            raise ExecutorError(f"opcode {opcode!r} is not on the audited menu (K5)")
        _OPS[opcode](stack, inputs, env)
    if not stack:
        raise ExecutorError(f"faculty {name!r} produced no output")
    return stack[-1]

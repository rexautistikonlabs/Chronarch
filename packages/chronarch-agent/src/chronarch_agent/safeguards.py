"""Injection / conveyance safeguards — code, not policy prose (S1–S10).

Agents cannot convey agents. There is no inbox and no outbox between agents
in this runtime: peer influence happens only through sealed rings other
agents *choose* to recall. These functions detect the shapes that would
smuggle an instruction from one agent into another and refuse them at the
runtime boundary.
"""
from __future__ import annotations

from chronarch_spec import canonical_bytes

# S3/S10: keys that would name or address another agent, or forward a raw
# tool call, are forbidden anywhere in an agent's JSON.
CONVEYANCE_KEYS = (
    "peer_agent_id", "instruct_agent", "target_agent", "whisper", "convey",
    "forwarded_tool_calls", "forward_tool_calls", "instruct", "to_agent",
    "deliver_to", "on_behalf_of",
)

# S4: a payload is "tool-call shaped" if it looks like a function call an LLM
# could be tricked into executing: a dict carrying both `name` and
# `arguments`, or a `tools`/`tool_calls`/`function_call` key.
_TOOL_CALL_PAIR = frozenset({"name", "arguments"})
_TOOL_CALL_KEYS = ("tools", "tool_calls", "function_call", "functions")

# S9: size / nesting limits on a turn payload.
MAX_PAYLOAD_BYTES = 16 * 1024
MAX_NESTING_DEPTH = 8


def find_conveyance_key(obj: object, path: str = "$") -> str | None:
    """Return the first conveyance key found anywhere in obj, else None."""
    if isinstance(obj, dict):
        for key, value in obj.items():
            if str(key).lower() in CONVEYANCE_KEYS:
                return f"{path}.{key}"
            hit = find_conveyance_key(value, f"{path}.{key}")
            if hit:
                return hit
    elif isinstance(obj, (list, tuple)):
        for i, item in enumerate(obj):
            hit = find_conveyance_key(item, f"{path}[{i}]")
            if hit:
                return hit
    return None


def is_tool_call_shaped(obj: object) -> bool:
    """True if obj (at any depth) carries a tool-call shape (S4)."""
    if isinstance(obj, dict):
        keys = {str(k).lower() for k in obj}
        if _TOOL_CALL_PAIR <= keys:
            return True
        if any(k in keys for k in _TOOL_CALL_KEYS):
            return True
        return any(is_tool_call_shaped(v) for v in obj.values())
    if isinstance(obj, (list, tuple)):
        return any(is_tool_call_shaped(v) for v in obj)
    return False


def _depth(obj: object) -> int:
    if isinstance(obj, dict):
        return 1 + max((_depth(v) for v in obj.values()), default=0)
    if isinstance(obj, (list, tuple)):
        return 1 + max((_depth(v) for v in obj), default=0)
    return 0


def payload_too_big(obj: object) -> str | None:
    """Return a reason if the payload is oversized or too deeply nested (S9)."""
    try:
        size = len(canonical_bytes(obj))
    except Exception:
        return "payload is not canonically encodable"
    if size > MAX_PAYLOAD_BYTES:
        return f"payload {size}B exceeds {MAX_PAYLOAD_BYTES}B"
    if _depth(obj) > MAX_NESTING_DEPTH:
        return f"payload nesting exceeds depth {MAX_NESTING_DEPTH}"
    return None

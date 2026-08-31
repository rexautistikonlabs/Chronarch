"""The closed tool surface loader/validator.

`tools.json` (shipped at the package root) is the authoritative list of
agent verbs. This module loads it and enforces two invariants that a test
pins:

  * the tool set is EXACTLY the allowed verbs; and
  * none of the forbidden tool names is present — there is no
    activate_faculty, execute_upgrade, edit_ring, or helm_override tool,
    because those capabilities do not exist for an agent (G1/G4/G14/G17).
"""
from __future__ import annotations

import json
from pathlib import Path

ALLOWED_VERBS = (
    "init", "recall", "pin", "challenge", "seal", "propose", "ballot",
    "health", "turn", "task_open", "task_resume",
)

# Names an agent must never have a tool for. Kept as string data (not
# identifiers) so the K18 AST scan stays clean.
FORBIDDEN_VERBS = ("activate_faculty", "execute_upgrade", "edit_ring", "helm_override")

_TOOLS_PATH = Path(__file__).resolve().parents[2] / "tools.json"


def load_tools() -> dict:
    return json.loads(_TOOLS_PATH.read_text())


def tool_names() -> list[str]:
    return [t["function"]["name"] for t in load_tools()["tools"]]


def validate_tool_surface() -> None:
    names = tool_names()
    if sorted(names) != sorted(ALLOWED_VERBS):
        raise ValueError(f"tool surface drift: {sorted(names)} != {sorted(ALLOWED_VERBS)}")
    for forbidden in FORBIDDEN_VERBS:
        if forbidden in names:
            raise ValueError(f"forbidden tool present: {forbidden!r}")

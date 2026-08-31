"""Machine protocol (Phase 5): every agent-facing call is JSON -> JSON.

Envelope:
    {"ok": bool,
     "error_code": str | None,   # from ERROR_CODES, present iff not ok
     "result": object | None,
     "ring_hash": str | None,    # set when a call sealed a ring
     "evidence_refs": [str]|None} # CAS hashes the call verified/produced

No prose-only APIs: a caller can branch entirely on `ok` and `error_code`.
The error-code set is closed and documented in specs/AGENT.md.
"""
from __future__ import annotations

# Stable, closed error-code set. Adding or renaming a code is a documented
# interface change (specs/AGENT.md), not a silent one.
ERROR_CODES = (
    "BAD_REQUEST",         # params were not a JSON object / missing a field
    "UNKNOWN_VERB",        # verb not in the closed tool surface
    "FORBIDDEN_TOOL",      # a forbidden verb was requested (activate_faculty, ...)
    "EVIDENCE_MISSING",    # an evidence_ref was absent or failed hash re-verify
    "INERT_FACULTY",       # tried to run a non-live-registry faculty
    "SCHEMA_REJECTED",     # ring/body failed the codec/K18 schema screen
    "ADMISSION_REJECTED",  # a tx was rejected at the admission chokepoint
    "COUNCIL_REJECTED",    # a proposal/ballot was rejected by the Council machine
    "LLM_DISABLED",        # the LLM path was requested while the gate is off
    "NOT_FOUND",           # identity/task not found
    "CONVEYANCE_DENIED",   # an attempt to convey/instruct another agent (S3/S10)
    "GYM_TARGET_FOREIGN",  # a hat/gym target outside Chronarch fixtures (G12/S7)
    "HATS_INCOMPLETE",     # propose_release before white+red+black all passed (S8)
    "QUARANTINE",          # tool-call-shaped or oversized payload quarantined (S4/S9)
    "INTERNAL",            # an unexpected error (should not happen; reported, not hidden)
)


def ok(result=None, *, ring_hash: str | None = None,
       evidence_refs: list | None = None) -> dict:
    return {"ok": True, "error_code": None, "result": result,
            "ring_hash": ring_hash, "evidence_refs": evidence_refs}


def err(error_code: str, detail: str = "") -> dict:
    if error_code not in ERROR_CODES:
        raise ValueError(f"undocumented error_code {error_code!r}")
    return {"ok": False, "error_code": error_code, "result": {"detail": detail},
            "ring_hash": None, "evidence_refs": None}

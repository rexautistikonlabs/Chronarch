"""Recall: fetch evidence from CAS and re-verify hashes before use.

No "trust the prompt". Every evidence_ref is a CAS content hash; recall
fetches the bytes and re-hashes them, and a miss or a mismatch is an
EVIDENCE_MISSING error — never a silent pass. Agents cite rings; recall is
how a cite is checked.
"""
from __future__ import annotations

import json

from chronarch_core.cas import CASMiss
from chronarch_spec import hash_bytes

from .safeguards import is_tool_call_shaped


class EvidenceError(ValueError):
    """An evidence_ref was absent or failed hash re-verification."""


class QuarantineError(ValueError):
    """Recalled evidence carried tool-call-shaped content (S4). It is
    quarantined — never handed to DummyMind/LLM — and flagged I6."""

    def __init__(self, ref: str) -> None:
        self.ref = ref
        super().__init__(f"evidence {ref[:16]}… is tool-call shaped — quarantined (S4/I6)")


def recall_evidence(cas, evidence_refs: list[str]) -> list[dict]:
    """Return [{ref, bytes_len, verified}] for each ref. Raises EvidenceError
    on a missing/mismatched ref, or QuarantineError on tool-call-shaped
    content — so a smuggled instruction never reaches the mind."""
    out = []
    for ref in evidence_refs:
        if not isinstance(ref, str):
            raise EvidenceError(f"evidence_ref must be a string, got {type(ref).__name__}")
        try:
            data = cas.get(ref)
        except CASMiss:
            raise EvidenceError(f"evidence {ref[:16]}… not in CAS") from None
        # Re-verify: content-addressed, so the bytes MUST hash to the ref.
        if hash_bytes(data) != ref:
            raise EvidenceError(f"evidence {ref[:16]}… failed hash re-verify (tampered)")
        # S4: strip/quarantine tool-call-shaped payloads BEFORE the mind sees them.
        try:
            decoded = json.loads(data)
        except (json.JSONDecodeError, UnicodeDecodeError):
            decoded = None
        if decoded is not None and is_tool_call_shaped(decoded):
            raise QuarantineError(ref)
        out.append({"ref": ref, "bytes_len": len(data), "verified": True})
    return out

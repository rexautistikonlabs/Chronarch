"""Recall: fetch evidence from CAS and re-verify hashes before use.

No "trust the prompt". Every evidence_ref is a CAS content hash; recall
fetches the bytes and re-hashes them, and a miss or a mismatch is an
EVIDENCE_MISSING error — never a silent pass. Agents cite rings; recall is
how a cite is checked.
"""
from __future__ import annotations

from chronarch_core.cas import CASMiss
from chronarch_spec import hash_bytes


class EvidenceError(ValueError):
    """An evidence_ref was absent or failed hash re-verification."""


def recall_evidence(cas, evidence_refs: list[str]) -> list[dict]:
    """Return [{ref, bytes_len, verified}] for each ref, or raise
    EvidenceError on the first missing/mismatched ref."""
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
        out.append({"ref": ref, "bytes_len": len(data), "verified": True})
    return out

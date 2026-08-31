"""Silos (Phase 5): inert artifact stores with a release gate.

Four silos: silo.codex, silo.antihacker, silo.llm, silo.commons. Everything
put into a silo is INERT — a stored artifact never runs and never releases
itself. Release is earned: white + red + black hat_run passes, then
`propose_release`, then the Council if the artifact is authored (M3, G14).
There is no `Chronarch.release()` and no silo auto-release (S8).

silo.llm holds LLM drafts and hands out only OPAQUE hashes to everything
outside itself (S5): a draft cannot be executed and this runtime never
forwards it into another agent's prompt.
"""
from __future__ import annotations

import copy

from chronarch_spec import canonical_bytes, hash_bytes, screen_keys

SILOS = ("silo.codex", "silo.antihacker", "silo.llm", "silo.commons")


class SiloError(ValueError):
    pass


class SiloStore:
    def __init__(self) -> None:
        self._open: set[str] = set()
        self._items: dict[str, dict[str, dict]] = {s: {} for s in SILOS}

    def open(self, silo: str) -> None:
        if silo not in SILOS:
            raise SiloError(f"unknown silo {silo!r} (known: {list(SILOS)})")
        self._open.add(silo)

    def put(self, silo: str, artifact_id: str, obj: object, *, kind: str = "artifact") -> dict:
        if silo not in SILOS:
            raise SiloError(f"unknown silo {silo!r}")
        if silo not in self._open:
            raise SiloError(f"silo {silo!r} is not open")
        screen_keys(obj)  # K18 even inside a silo
        content_hash = hash_bytes(canonical_bytes(obj))
        record = {
            "artifact_id": artifact_id,
            "silo": silo,
            "kind": kind,
            "content_hash": content_hash,
            "inert": True,           # artifacts never run; release is earned
            "_content": copy.deepcopy(obj),
        }
        self._items[silo][artifact_id] = record
        return self._public(record)

    def list(self, silo: str) -> list[dict]:
        if silo not in SILOS:
            raise SiloError(f"unknown silo {silo!r}")
        return [self._public(r) for r in self._items[silo].values()]

    def get(self, silo: str, artifact_id: str) -> dict:
        if silo not in SILOS or artifact_id not in self._items[silo]:
            raise SiloError(f"artifact {artifact_id!r} not in {silo!r}")
        return self._public(self._items[silo][artifact_id])

    def _public(self, record: dict) -> dict:
        """Public view. silo.llm is opaque: hash only, never the draft (S5)."""
        pub = {k: v for k, v in record.items() if k != "_content"}
        if record["silo"] != "silo.llm":
            pub["content"] = copy.deepcopy(record["_content"])
        else:
            pub["opaque"] = True  # draft withheld; only the hash is exposed
        return pub

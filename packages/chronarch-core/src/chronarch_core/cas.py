"""Content-addressed store (CAMBIUM/CAS lane).

Pin failure is a nervous event at I3, not a 'lost file' — callers surface
misses to the nervous layer; the store itself never fakes availability.
"""
from __future__ import annotations

from chronarch_spec import canonical_bytes, hash_bytes


class CASMiss(KeyError):
    """Requested pin is not available — an I3 nervous event for the caller."""


class CAS:
    def __init__(self) -> None:
        self._store: dict[str, bytes] = {}

    def put_bytes(self, data: bytes) -> str:
        digest = hash_bytes(data)
        self._store[digest] = data
        return digest

    def put_object(self, obj: object) -> str:
        return self.put_bytes(canonical_bytes(obj))

    def get(self, digest: str) -> bytes:
        try:
            return self._store[digest]
        except KeyError:
            raise CASMiss(digest) from None

    def verify(self, digest: str) -> bool:
        data = self.get(digest)
        return hash_bytes(data) == digest

    def has(self, digest: str) -> bool:
        return digest in self._store

    def pins(self) -> list[str]:
        return sorted(self._store)

    def withhold(self, digest: str) -> None:
        """Sim/gym helper: model a withheld pin (the attack, not an API)."""
        self._store.pop(digest, None)

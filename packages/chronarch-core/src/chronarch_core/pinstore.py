"""On-disk CAS pin lane (Phase 12).

A directory of content-addressed objects — the disk form of the CAMBIUM/CAS
lane. It stores memory (rings, faculties, gym fixtures, embedding
commitments), NOT space: it is separate from a `.cseal` plot file, and a
`.cseal` never contains these blobs.

`pinset_root(hashes)` is a domain-separated **list hash**:

    cas_root = chash("CasRoot", {"pins": sorted(unique(hashes))})

It matches the frozen `chronarch_farm.cas_root_of` formula, so a PinStore's
`cas_root()` equals the `cas_root` a SpaceSeal commits to for the same pins.
(It is a sorted-list commitment, not a full Merkle tree — documented as such.)

K18: a put whose bytes parse as a consensus object is screened for forbidden
keys and rejected on any hit. Raw non-consensus bytes are allowed only with
`kind="opaque"`.
"""
from __future__ import annotations

import json
import os
import re

from chronarch_spec import canonical_bytes, chash, hash_bytes, screen_keys

_HASH_RE = re.compile(r"^[0-9a-f]{64}$")


class PinError(ValueError):
    pass


def pinset_root(hashes) -> str:
    """Domain-separated sorted-list hash of a pin set (the cas_root)."""
    return chash("CasRoot", {"pins": sorted(set(hashes))})


def _is_hash(name: str) -> bool:
    return bool(_HASH_RE.match(name))


class PinStore:
    def __init__(self, directory: str) -> None:
        self.dir = directory
        os.makedirs(directory, exist_ok=True)

    def _path(self, h: str) -> str:
        return os.path.join(self.dir, h)

    # -- write --------------------------------------------------------------
    def put(self, data: bytes, *, kind: str = "object") -> str:
        """Store bytes, addressed by SHA-256. `kind="object"` requires the
        bytes to be a canonical consensus object (a JSON dict) and screens it
        for K18 forbidden keys; `kind="opaque"` stores raw non-consensus
        bytes. Any bytes that parse as a dict are K18-screened regardless of
        kind, so a forbidden object cannot be smuggled in as opaque."""
        parsed = None
        try:
            parsed = json.loads(data)
        except (json.JSONDecodeError, UnicodeDecodeError):
            parsed = None
        if isinstance(parsed, dict):
            screen_keys(parsed)  # K18 always (raises SchemaError on a forbidden key)
            if kind == "object":
                data = canonical_bytes(parsed)  # normalize + ban floats/exotic
        elif kind == "object":
            raise PinError(
                "kind='object' needs canonical consensus-object bytes; "
                "use kind='opaque' for raw blobs")
        digest = hash_bytes(data)
        with open(self._path(digest), "wb") as f:
            f.write(data)
        return digest

    def put_object(self, obj) -> str:
        return self.put(canonical_bytes(obj), kind="object")

    # -- read ---------------------------------------------------------------
    def get(self, h: str):
        """Return the object's bytes, or None if the pin is missing (I3)."""
        path = self._path(h)
        if not os.path.exists(path):
            return None
        with open(path, "rb") as f:
            return f.read()

    def has(self, h: str) -> bool:
        return os.path.exists(self._path(h))

    def verify(self, h: str) -> bool:
        data = self.get(h)
        return data is not None and hash_bytes(data) == h

    def pins(self) -> list[str]:
        if not os.path.isdir(self.dir):
            return []
        return sorted(name for name in os.listdir(self.dir) if _is_hash(name))

    def cas_root(self) -> str:
        return pinset_root(self.pins())

    def withhold(self, h: str) -> None:
        """Delete a pin (models a withholding farmer — an I3 nervous event,
        never a lost consensus object)."""
        path = self._path(h)
        if os.path.exists(path):
            os.remove(path)

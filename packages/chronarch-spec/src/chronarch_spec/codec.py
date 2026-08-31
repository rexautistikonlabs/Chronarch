"""K2: canonical codec + SHA-256 hash spec.

Consensus objects are trees of: None, bool, int, str, list, dict[str, ...].
Floats are BANNED (nondeterministic across platforms); ratios are integer
basis points. Canonical bytes are JSON with sorted keys, minimal separators
and ASCII-escaped strings, UTF-8 encoded. Hashes are domain-separated:

    chash(type_tag, obj) = sha256(b"chronarch/v0/" + type_tag + b"\\n" + canonical_bytes)

hex-encoded. Domain separation means a Ballot can never collide with a
Proposal even if their bodies are byte-identical.
"""
from __future__ import annotations

import hashlib
import json

from .constants import PROTOCOL, PROTOCOL_VERSION

_DOMAIN_PREFIX = f"{PROTOCOL}/{PROTOCOL_VERSION}/"

_SCALARS = (type(None), bool, int, str)


class CodecError(ValueError):
    """Raised when an object is not canonically encodable."""


def _check(obj: object, path: str = "$") -> None:
    if isinstance(obj, bool) or obj is None or isinstance(obj, str):
        return
    if isinstance(obj, float):
        raise CodecError(f"floats are banned from consensus objects at {path}")
    if isinstance(obj, int):
        return
    if isinstance(obj, (list, tuple)):
        for i, item in enumerate(obj):
            _check(item, f"{path}[{i}]")
        return
    if isinstance(obj, dict):
        for key, value in obj.items():
            if not isinstance(key, str):
                raise CodecError(f"non-string dict key at {path}: {key!r}")
            _check(value, f"{path}.{key}")
        return
    raise CodecError(f"unencodable type {type(obj).__name__} at {path}")


def canonical_bytes(obj: object) -> bytes:
    """Deterministic canonical encoding of a consensus object."""
    _check(obj)
    return json.dumps(
        obj,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
        allow_nan=False,
        default=_reject_default,
    ).encode("utf-8")


def _reject_default(obj: object) -> None:
    raise CodecError(f"unencodable type {type(obj).__name__}")


def chash(type_tag: str, obj: object) -> str:
    """Domain-separated SHA-256 of an object's canonical bytes (hex)."""
    if not type_tag or "/" in type_tag or "\n" in type_tag:
        raise CodecError(f"bad type tag: {type_tag!r}")
    h = hashlib.sha256()
    h.update(_DOMAIN_PREFIX.encode("ascii"))
    h.update(type_tag.encode("ascii"))
    h.update(b"\n")
    h.update(canonical_bytes(obj))
    return h.hexdigest()


def hash_bytes(data: bytes) -> str:
    """Plain SHA-256 of raw bytes (hex) — used for CAS content addressing."""
    return hashlib.sha256(data).hexdigest()

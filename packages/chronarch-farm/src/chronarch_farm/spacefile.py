"""On-disk SpaceSeal files (.cseal) — Chronarch's OWN format (Phase 10).

This is NOT a Chia plot, NOT CHIP-48, and NOT a database. A .cseal reserves
space and seals a SpaceSeal (PlotCommitment) header; its body is inert
reserved bytes. It MUST NOT contain rings, faculties, drafts, or raw CAS
blobs — the reader enforces that (closed header schema, K18 screen, exact
file size, all-zero body).

Layout:
    4 bytes   magic "CSL1"
    4 bytes   big-endian uint32 header length
    header    canonical-codec bytes of the SpaceSeal fields
              {plot_id, k_size, space_units, farmer_id, cas_root, index}
    body      reserved bytes of length file_body_bytes(space_units), all zero

Test size class only: one TEST unit = 4096 body bytes (NOT 101 GiB). We do
not create real k32 files in CI.
"""
from __future__ import annotations

import json
import os

from chronarch_spec import canonical_bytes

from .plots import PlotError, verify_plot_commitment

MAGIC = b"CSL1"
CSEAL_EXT = ".cseal"

# One abstract space unit reserves this many body bytes on disk. Tiny on
# purpose: the TEST unit body is 4096 bytes, not gigabytes.
BODY_BYTES_PER_UNIT = 4096
TEST_BODY_BYTES = BODY_BYTES_PER_UNIT  # test size class = 1 unit

_HEADER_OFFSET = 8  # magic(4) + header_len(4)
_MAX_HEADER_LEN = 0xFFFFFFFF
_SCAN_CHUNK = 65536


class SpaceFileError(ValueError):
    pass


class BadMagic(SpaceFileError):
    pass


class BadHeader(SpaceFileError):
    pass


class ShortBody(SpaceFileError):
    pass


class PayloadFound(SpaceFileError):
    """The body carried non-zero bytes — a .cseal stores no payload."""


def file_body_bytes(space_units: int) -> int:
    if not isinstance(space_units, int) or isinstance(space_units, bool) or space_units <= 0:
        raise SpaceFileError("space_units must be a positive int")
    return space_units * BODY_BYTES_PER_UNIT


def file_total_bytes(space_seal: dict) -> int:
    header = canonical_bytes(space_seal)
    return _HEADER_OFFSET + len(header) + file_body_bytes(space_seal["space_units"])


def write_space_seal(path: str, space_seal: dict) -> dict:
    """Write a .cseal. Validates the SpaceSeal (K18 + plot_id recompute) and
    reserves the body. Never writes rings/blobs — the body is zeros."""
    seal = verify_plot_commitment(dict(space_seal))
    header = canonical_bytes(seal)
    if len(header) > _MAX_HEADER_LEN:
        raise BadHeader("header too large")
    body_bytes = file_body_bytes(seal["space_units"])
    total = _HEADER_OFFSET + len(header) + body_bytes
    with open(path, "wb") as f:
        f.write(MAGIC)
        f.write(len(header).to_bytes(4, "big"))
        f.write(header)
        # Reserve the body as a zero region (sparse via truncate; st_size is
        # the full reserved size, so short-body tampering is detectable).
        f.truncate(total)
    return {"path": path, "bytes": total, "plot_id": seal["plot_id"],
            "body_bytes": body_bytes}


def read_space_seal(path: str) -> dict:
    """Read + validate a .cseal, returning the SpaceSeal (PlotCommitment).

    Rejects: bad magic, a truncated/oversized header, a header that fails the
    closed schema / K18 / plot_id recompute, a file whose size does not match
    the claimed units exactly (short body OR appended payload), and any
    non-zero body byte (stuffed rings/jsonl/blobs)."""
    size = os.path.getsize(path)
    with open(path, "rb") as f:
        if f.read(4) != MAGIC:
            raise BadMagic("not a .cseal (bad magic)")
        hl = f.read(4)
        if len(hl) < 4:
            raise BadHeader("missing header length")
        header_len = int.from_bytes(hl, "big")
        header = f.read(header_len)
        if len(header) < header_len:
            raise BadHeader("truncated header")
        try:
            seal = json.loads(header)
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            raise BadHeader(f"unparseable header: {exc}") from None
        if not isinstance(seal, dict):
            raise BadHeader("header is not an object")
        # Closed schema + K18 screen + plot_id recompute (raises PlotError).
        verify_plot_commitment(seal)

        body_bytes = file_body_bytes(seal["space_units"])
        expected = _HEADER_OFFSET + header_len + body_bytes
        if size != expected:
            raise ShortBody(
                f"file size {size} != expected {expected} "
                "(short body or appended payload)")
        # The body must be reserved zeros — no rings, no blobs, no jsonl.
        remaining = body_bytes
        while remaining > 0:
            chunk = f.read(min(_SCAN_CHUNK, remaining))
            if not chunk:
                raise ShortBody("body truncated")
            if any(chunk):
                raise PayloadFound("non-zero body byte — a .cseal stores no payload")
            remaining -= len(chunk)
    return seal


def inspect_space_seal(path: str) -> dict:
    """Header summary for the CLI (no body scan beyond size validation)."""
    seal = read_space_seal(path)
    return {
        "plot_id": seal["plot_id"],
        "k_size": seal["k_size"],
        "space_units": seal["space_units"],
        "farmer_id": seal["farmer_id"],
        "cas_root": seal["cas_root"],
        "index": seal["index"],
        "file_bytes": os.path.getsize(path),
        "body_bytes": file_body_bytes(seal["space_units"]),
    }


def prove_from_file(path: str, challenge: str) -> dict:
    """Load a .cseal → SpaceSeal → a SpaceProof for the challenge (uses the
    frozen make_pospace via the post façade). No new lottery math."""
    from .post import make_space_proof
    seal = read_space_seal(path)
    return make_space_proof(seal, challenge)

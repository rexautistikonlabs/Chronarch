"""Peer/space table persistence (Phase 18).

A net home records the fleet it belongs to in `home/peers.json`: a canonical
list of `{identity, space_units}` sorted by identity. This is what lets a bare
`Node(home=DIR)` resume a net-produced ledger — one that contains slots led by
PEERS — without a conductor passing the space table in. The lottery and the
slot-header verifier read the fleet from this file.

The peers file is a **closed schema**, K18-screened, integer units only. It is
never silently rewritten with a different fleet: a peers.json that disagrees
with the home's own identity/units, or with the net's planned fleet, fails
closed as **PEERS_MISMATCH**. There is no admin peer key — the fleet is data the
operators agree on, not a privileged override.
"""
from __future__ import annotations

from chronarch_spec import canonical_bytes, screen_keys

from .node import NodeError

_PEER_FIELDS = ("identity", "space_units")


class PeersError(NodeError):
    """A peer/space-table problem: a corrupt peers.json, or one that disagrees
    with the home's own identity/units or the planned fleet (PEERS_MISMATCH)."""


def canonical_peers(space_table: dict) -> list[dict]:
    """A space table -> the canonical peers list (sorted by identity, integer
    units)."""
    return [{"identity": str(identity), "space_units": int(units)}
            for identity, units in sorted(space_table.items())]


def verify_peers(peers) -> list[dict]:
    """Validate the closed peers schema and return the canonical (sorted) list.
    Raises PeersError on any hole — a foreign key, a non-integer unit, a
    duplicate identity, or a non-list. Never silently repairs."""
    if not isinstance(peers, list) or not peers:
        raise PeersError("PEERS_MISMATCH: peers must be a non-empty list")
    seen: set[str] = set()
    out: list[dict] = []
    for entry in peers:
        if not isinstance(entry, dict):
            raise PeersError("PEERS_MISMATCH: each peer must be an object")
        screen_keys(entry)  # K18 forbidden-key screen (admin_key & kin)
        if set(entry) != set(_PEER_FIELDS):
            raise PeersError(
                f"PEERS_MISMATCH: peer keys must be exactly {sorted(_PEER_FIELDS)}")
        identity, units = entry["identity"], entry["space_units"]
        if not isinstance(identity, str) or not identity:
            raise PeersError("PEERS_MISMATCH: peer identity must be a non-empty string")
        # bool is an int subclass — reject it so a truthy flag can't be units.
        if isinstance(units, bool) or not isinstance(units, int) or units <= 0:
            raise PeersError("PEERS_MISMATCH: peer space_units must be a positive integer")
        if identity in seen:
            raise PeersError(f"PEERS_MISMATCH: duplicate peer {identity!r}")
        seen.add(identity)
        out.append({"identity": identity, "space_units": units})
    canonical = sorted(out, key=lambda e: e["identity"])
    canonical_bytes(canonical)  # final float/exotic ban
    return canonical


def space_table_from_peers(peers) -> dict:
    """The `{identity: space_units}` lottery table from a peers list."""
    return {e["identity"]: e["space_units"] for e in verify_peers(peers)}


def peers_bytes(peers) -> bytes:
    """Canonical bytes of a peers list — identical on every home for the same
    fleet, so `home/peers.json` is byte-for-byte reproducible."""
    return canonical_bytes(verify_peers(peers))


def peers_match(peers, space_table: dict) -> bool:
    """True when a (possibly unsorted) peers list is exactly this fleet."""
    try:
        return verify_peers(peers) == canonical_peers(space_table)
    except PeersError:
        return False

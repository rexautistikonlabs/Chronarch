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

from chronarch_spec import canonical_bytes, chash, screen_keys

from .node import NodeError

_PEER_FIELDS = ("identity", "space_units")

# Phase 19: a peer-set change is a Proposal ring plus a slashing-backed vote —
# never an admin key, never an AI self-enact. The change rides in the Proposal's
# free-form `changes` dict under the key `peer_change`; it is a MEMBERSHIP change
# (M6), an existing major class, so the kernel manifest / genesis hashes are
# unchanged (a new major class would alter K14 and re-hash genesis).
_PEER_CHANGE_FIELDS = ("kind", "identity", "space_units")
PEER_CHANGE_KINDS = ("peer_add", "peer_remove")
PEER_CHANGE_MAJOR_CLASS = "M6"  # council_thresholds_or_membership_floors
PEER_CHANGE_KEY = "peer_change"


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


# -- PeerChange: the body of a peer-set change proposal (Phase 19) -----------
def verify_peer_change(body) -> dict:
    """Validate the closed PeerChange schema
    `{kind: peer_add|peer_remove, identity, space_units}`. Raises PeersError on
    any hole. K18-screened; integer units only."""
    if not isinstance(body, dict):
        raise PeersError("PEERS_MISMATCH: peer change must be an object")
    screen_keys(body)  # K18 forbidden-key screen
    if set(body) != set(_PEER_CHANGE_FIELDS):
        raise PeersError(
            f"PEERS_MISMATCH: peer change keys must be exactly {sorted(_PEER_CHANGE_FIELDS)}")
    kind, identity, units = body["kind"], body["identity"], body["space_units"]
    if kind not in PEER_CHANGE_KINDS:
        raise PeersError(f"PEERS_MISMATCH: kind must be one of {PEER_CHANGE_KINDS}")
    if not isinstance(identity, str) or not identity:
        raise PeersError("PEERS_MISMATCH: peer change identity must be a non-empty string")
    if isinstance(units, bool) or not isinstance(units, int) or units <= 0:
        raise PeersError("PEERS_MISMATCH: peer change space_units must be a positive integer")
    canonical_bytes(body)
    return {"kind": kind, "identity": identity, "space_units": units}


def apply_peer_change(space_table: dict, body) -> dict:
    """Apply a PeerChange to a space table, returning the new table. peer_add of
    an existing identity, or peer_remove of an absent one (or one whose units
    disagree), is PEERS_MISMATCH — the change is not silently coerced."""
    body = verify_peer_change(body)
    table = dict(space_table)
    identity, units = body["identity"], body["space_units"]
    if body["kind"] == "peer_add":
        if identity in table:
            raise PeersError(f"PEERS_MISMATCH: peer_add {identity!r} is already in the fleet")
        table[identity] = units
    else:  # peer_remove
        if identity not in table:
            raise PeersError(f"PEERS_MISMATCH: peer_remove {identity!r} is not in the fleet")
        if table[identity] != units:
            raise PeersError(
                f"PEERS_MISMATCH: peer_remove {identity!r} lists {units} units but the "
                f"fleet has {table[identity]}")
        del table[identity]
    return table


def peer_change_proposal(proposal_id: str, proposer: str, body, *, slot: int,
                         deposit_chronons: int = 0) -> dict:
    """Build a Council Proposal that carries a PeerChange in its `changes` dict.
    A MEMBERSHIP change (M6): it activates ONLY via a passed, slashing-backed
    ballot — there is no self-enact path."""
    body = verify_peer_change(body)
    return {
        "proposal_id": proposal_id,
        "proposer": proposer,
        "major_class": PEER_CHANGE_MAJOR_CLASS,
        "spec_hash": chash("PeerChangeSpec", body),
        "changes": {PEER_CHANGE_KEY: body},
        "deposit_chronons": deposit_chronons,
        "submitted_slot": slot,
    }


def peer_change_from_proposal(proposal: dict) -> dict:
    """Extract + validate the PeerChange body from a peer-set-change proposal.
    Raises PeersError if the proposal is not a well-formed peer change."""
    if not isinstance(proposal, dict) or proposal.get("major_class") != PEER_CHANGE_MAJOR_CLASS:
        raise PeersError("PEERS_MISMATCH: not a peer-set-change proposal (M6)")
    changes = proposal.get("changes")
    if not isinstance(changes, dict) or set(changes) != {PEER_CHANGE_KEY}:
        raise PeersError(f"PEERS_MISMATCH: changes must be exactly {{{PEER_CHANGE_KEY!r}}}")
    return verify_peer_change(changes[PEER_CHANGE_KEY])

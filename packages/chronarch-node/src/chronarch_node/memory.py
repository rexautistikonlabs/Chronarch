"""Lab memory: one read-only view of what a home remembers.

The Timechain, the home directory, and the pin lane ARE the organism's
persistent memory — there is no other store. `memory(home)` resumes the home
through the frozen replay path (Phase 13: a corrupt or truncated log, a
kernel / Ring 0 drift, or a peers.json that disagrees with the home all fail
closed), re-walks the whole chain (`verify_full`), checks the pin lane
(`verify_pins`, I3 is reported, never raised), and reports exactly:

    {identity, height, head_hash, ring_count, scar_count, pins_ok, i3,
     credits_by_reason}

It never writes. No ring is re-sealed on disk, no scar is wiped (G5: scars
cannot vanish — "clean memory" is not a thing this organism has), no head.json
is refreshed, no Chronos is credited, and a home that does not exist is an
error, never an initialisation. `memory` is how a lab session reads back what
`pulse` and the operator path left behind.
"""
from __future__ import annotations

from chronarch_core import totals_by_reason
from chronarch_core.chain import ChainError

from .home import NodeHome
from .node import HomeError, Node

# The closed shape of a memory report — the CLI prints exactly these keys.
MEMORY_KEYS = (
    "identity", "height", "head_hash", "ring_count", "scar_count",
    "pins_ok", "i3", "credits_by_reason",
)


def memory(home: str) -> dict:
    """Read what `home` remembers. Raises HomeError (BAD_HOME / LEDGER_INVALID)
    or PeersError (PEERS_MISMATCH) rather than guessing — fail closed."""
    node_home = NodeHome(home)
    if not node_home.is_initialized():
        # A read never creates a home: NodeHome(...) touched nothing on disk.
        raise HomeError(f"BAD_HOME: no node home at {home}")

    # Resume = replay home/ledger through the frozen Timechain. The placeholder
    # identity is ignored: the home names the organism. Replay hash-checks
    # every ring and the head commitment; PeersError surfaces if peers.json
    # disagrees with what the home is. Nothing is appended on resume.
    node = Node("_memory_", home=home)
    ledger = node.ledger
    try:
        ledger.verify_full()  # the full hash walk, not just the O(1) head
    except ChainError as exc:
        raise HomeError(f"LEDGER_INVALID: {exc}") from None

    pins = node.verify_pins(slot=ledger.height)  # read-only; I3 is a report
    return {
        "identity": node.identity,
        "height": ledger.height,
        "head_hash": ledger.head_hash,
        # Rings in the Timechain including Ring 0 (genesis), so ring_count is
        # height + 1 on an intact chain.
        "ring_count": len(ledger.rings()),
        "scar_count": len(ledger.scars()),
        "pins_ok": pins["ok"],
        "i3": pins["restriction"],
        # Chronos is blood, not consensus: totals come from home/rewards.jsonl
        # (reloaded on resume), never from the rings.
        "credits_by_reason": totals_by_reason(node.reward_credits),
    }

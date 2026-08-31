"""Abstract-to-plot adapter (Phase 4).

The slot lottery's input stays what it has always been: INTEGER space
units. This adapter maps between that abstract world and typed
PlotCommitments in both directions, so a fleet can migrate to plot-shaped
space without the election changing by a single draw:

    abstract N units  ->  commitments summing to N  ->  N units again

Prestress floors are untouched — the adapter produces the space table; the
node's eligibility gates still decide who contends (NERVOUS.md,
ARCHITECTURE §5). Nothing here weights the draw by stake, PoQ, or salience
(G2/G10).
"""
from __future__ import annotations

from .plots import SIZE_TABLE, PlotError, make_plot_commitment, verify_plot_commitment

# Greedy decomposition order: largest denomination first, "test" (1 unit)
# guarantees any positive integer is representable exactly.
_DENOMS = tuple(sorted(SIZE_TABLE, key=lambda k: SIZE_TABLE[k], reverse=True))
assert SIZE_TABLE["test"] == 1, "the 1-unit denomination anchors exactness"


def commitments_from_abstract(farmer_id: str, units: int, *,
                              cas_root: str = "") -> list[dict]:
    """Decompose abstract units into plot commitments summing EXACTLY to
    `units`. Deterministic: greedy over the size table, indices 0..n-1."""
    if not isinstance(units, int) or isinstance(units, bool) or units <= 0:
        raise PlotError("units must be a positive int")
    commitments: list[dict] = []
    remaining = units
    index = 0
    for k_size in _DENOMS:
        size = SIZE_TABLE[k_size]
        while remaining >= size:
            commitments.append(make_plot_commitment(
                farmer_id, k_size, index=index, cas_root=cas_root))
            remaining -= size
            index += 1
    assert remaining == 0  # "test"=1 makes the greedy walk exact
    return commitments


def total_units(commitments: list[dict]) -> int:
    """Sum of VERIFIED commitments' units. Any invalid commitment raises —
    unverifiable space never enters a space table silently."""
    total = 0
    for commitment in commitments:
        verify_plot_commitment(commitment)
        total += commitment["space_units"]
    return total


def space_table_from_commitments(commitments: list[dict]) -> dict[str, int]:
    """Build the lottery's {farmer_id: units} table from plot commitments.

    This is the whole adapter contract: the table is integer units, exactly
    as the abstract world produced, so `slot_leader` needs no change and
    elects identically for identical units.
    """
    table: dict[str, int] = {}
    for commitment in commitments:
        verify_plot_commitment(commitment)
        table[commitment["farmer_id"]] = (
            table.get(commitment["farmer_id"], 0) + commitment["space_units"])
    return table

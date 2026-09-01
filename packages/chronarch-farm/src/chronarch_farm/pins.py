"""Bind a SpaceSeal's cas_root to an on-disk PinStore (Phase 12).

A `.cseal`'s `cas_root` is a **commitment only**. `verify_pins` checks
whether the pin lane currently honors that commitment; a failure is an **I3
nervous event** (retrieval restriction) — it does NOT invalidate the
`.cseal`, does NOT change lottery winners, and does NOT slash space.

Codes:
  PINS_OK       — every present pin verifies and the pinset root matches
  PIN_MISMATCH  — a stored object's bytes do not hash to its name (tampered)
  PIN_MISSING   — the pinset root no longer matches the committed cas_root
                  (a committed pin was withheld / the set changed)
"""
from __future__ import annotations

from .plots import verify_plot_commitment

PINS_OK = "PINS_OK"
PIN_MISSING = "PIN_MISSING"
PIN_MISMATCH = "PIN_MISMATCH"


def _i3(magnitude_bps: int, slot: int) -> dict:
    from chronarch_nervous import measure_restriction
    return measure_restriction("I3", magnitude_bps, slot=slot)


def verify_pins(space_seal: dict, pin_store, *, slot: int = 0) -> dict:
    """Return {ok, code, restriction}. `restriction` is an I3 RestrictionState
    on failure, else None. Never raises on a withheld/tampered pin — that is a
    nervous event, reported, not an exception."""
    verify_plot_commitment(space_seal)  # ensure a real SpaceSeal

    # A tampered object (bytes no longer hash to their name) is PIN_MISMATCH.
    for h in pin_store.pins():
        if not pin_store.verify(h):
            return {"ok": False, "code": PIN_MISMATCH, "restriction": _i3(10000, slot)}

    committed = space_seal.get("cas_root", "")
    if not committed:
        # No pin commitment on this SpaceSeal — nothing to honor.
        return {"ok": True, "code": PINS_OK, "restriction": None}

    if pin_store.cas_root() != committed:
        # The committed pinset is not fully present (a pin was withheld).
        return {"ok": False, "code": PIN_MISSING, "restriction": _i3(10000, slot)}

    return {"ok": True, "code": PINS_OK, "restriction": None}

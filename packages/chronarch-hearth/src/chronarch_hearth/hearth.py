"""Hearth (K13): one lock, two legs — 'two birds'.

Leg A: security bond — slashable, gates Council eligibility.
Leg B: liquidity inventory — protocol AMM / POL (Chronos <-> AXON simulated
       quote in MVP).

Homage to $XCH farming and $CPHY lock/salience — NOT a wrap of those assets.
G13: Hearth slash and LP math cannot override G1–G7 — nothing in this module
touches rings, challenges, ballots' legality, or scars.
"""
from __future__ import annotations

import copy

from chronarch_spec import validate
from chronarch_spec.constants import (
    HEARTH_BOND_LEG_BPS,
    HEARTH_LIQUIDITY_LEG_BPS,
    MAX_CHALLENGE_GAP_SLOTS,
    MIN_COUNCIL_BOND_CHRONONS,
    MIN_PINSET_SIZE,
    SALIENCE_CLAMP_MAX_BPS,
    SALIENCE_CLAMP_MIN_BPS,
    UNBOND_DELAY_SLOTS,
)


class HearthError(ValueError):
    pass


def salience_multiplier_bps(raw_bps: int) -> int:
    """Clamp a salience overlay to 0.25x..4x (bps of 10000).

    Applies to retrieval RANKING only. There is no code path from this
    value to Challenge judgment or Ballot validity (G2) — grep for callers.
    """
    return max(SALIENCE_CLAMP_MIN_BPS, min(SALIENCE_CLAMP_MAX_BPS, raw_bps))


class HearthState:
    def __init__(self) -> None:
        self._positions: dict[str, dict] = {}
        # Vote liens: identity -> set of open obligations (e.g. un-tallied
        # ballots). A position cannot release while a lien is open, so a
        # slashing-backed vote (G14) cannot be escaped by unbonding inside
        # the voting window.
        self._liens: dict[str, set] = {}
        self.treasury_chronons = 0
        # Sim AMM inventory (Chronos <-> AXON simulated quote, MVP).
        self.lp_chronos = 0
        self.lp_axon = 10**6 * 10**12  # simulated counter-asset depth

    # -- lifecycle -----------------------------------------------------------
    def lock(self, identity: str, chronons: int, slot: int) -> dict:
        if chronons <= 0:
            raise HearthError("lock must be positive")
        if identity in self._positions:
            raise HearthError(f"{identity} already holds a position (one lock)")
        bond = chronons * HEARTH_BOND_LEG_BPS // 10000
        liquidity = chronons - bond  # exact split, no dust lost
        position = {
            "identity": identity,
            "locked_chronons": chronons,
            "bond_leg_chronons": bond,
            "liquidity_leg_chronons": liquidity,
            "lock_slot": slot,
            "unbond_request_slot": -1,
            "slashed": False,
            "quarantined": False,
        }
        validate("HearthPosition", position)
        self._positions[identity] = position
        self.lp_chronos += liquidity
        return copy.deepcopy(position)

    def request_unbond(self, identity: str, slot: int) -> None:
        position = self._require(identity)
        position["unbond_request_slot"] = slot

    def release(self, identity: str, slot: int) -> int:
        """Release a completed unbond. Fails inside the delay so slashes land."""
        position = self._require(identity)
        requested = position["unbond_request_slot"]
        if requested < 0:
            raise HearthError("no unbond requested")
        if slot < requested + UNBOND_DELAY_SLOTS:
            raise HearthError(
                f"unbond delay not elapsed ({slot} < {requested + UNBOND_DELAY_SLOTS})"
            )
        if self._liens.get(identity):
            raise HearthError(
                f"open vote liens {sorted(self._liens[identity])}: the slash "
                "must be able to land before the bond leaves (G14)"
            )
        if position["quarantined"]:
            raise HearthError(
                "quarantined position cannot release until the quarantine lifts"
            )
        # A slashed position lost its bond leg to the treasury; the liquidity
        # leg still unwinds — slashing punishes judgment abuse, it does not
        # confiscate liquidity (G13).
        amount = position["bond_leg_chronons"] + position["liquidity_leg_chronons"]
        self.lp_chronos -= position["liquidity_leg_chronons"]
        del self._positions[identity]
        return amount

    def slash(self, identity: str, *, reason: str, slot: int) -> int:
        """Slash the bond leg to the treasury. LP leg unwinds unslashed —
        slashing punishes judgment abuse, it does not raid liquidity (G13)."""
        position = self._require(identity)
        seized = position["bond_leg_chronons"]
        position["bond_leg_chronons"] = 0
        position["slashed"] = True
        self.treasury_chronons += seized
        return seized

    def quarantine(self, identity: str) -> None:
        self._require(identity)["quarantined"] = True

    def lift_quarantine(self, identity: str) -> None:
        self._require(identity)["quarantined"] = False

    # -- vote liens (G14: slashes must be able to land) -------------------------
    def add_lien(self, identity: str, tag: str) -> None:
        self._require(identity)
        self._liens.setdefault(identity, set()).add(tag)

    def clear_lien(self, identity: str, tag: str) -> None:
        liens = self._liens.get(identity)
        if liens is not None:
            liens.discard(tag)
            if not liens:
                del self._liens[identity]

    # -- queries ---------------------------------------------------------------
    def _require(self, identity: str) -> dict:
        if identity not in self._positions:
            raise HearthError(f"no hearth position for {identity}")
        return self._positions[identity]

    def position(self, identity: str) -> dict | None:
        p = self._positions.get(identity)
        return copy.deepcopy(p) if p else None

    def is_bonded(self, identity: str) -> bool:
        p = self._positions.get(identity)
        return bool(p) and not p["slashed"] and p["bond_leg_chronons"] > 0

    def council_eligible(self, identity: str, *, slot: int,
                         pinset_size: int, last_challenge_pass_slot: int) -> bool:
        """COUNCIL.md membership floors — also nervous prestress members."""
        p = self._positions.get(identity)
        if not p or p["slashed"] or p["quarantined"]:
            return False
        if p["unbond_request_slot"] >= 0:
            return False
        if p["bond_leg_chronons"] < MIN_COUNCIL_BOND_CHRONONS:
            return False
        if pinset_size < MIN_PINSET_SIZE:
            return False
        if slot - last_challenge_pass_slot > MAX_CHALLENGE_GAP_SLOTS:
            return False
        return True

    def solvency(self) -> dict:
        """I9 instrumentation: inventory must cover liabilities.

        Liabilities are what open positions can reclaim (bond + liquidity
        legs); inventory is the LP pool plus held bond legs. In a healthy
        state the two are equal to the chronon; any divergence (an LP path
        that moved lp_chronos without a matching position change) reports
        insolvent and is an I9 nervous event.
        """
        liabilities = sum(
            p["bond_leg_chronons"] + p["liquidity_leg_chronons"]
            for p in self._positions.values()
        )
        inventory = self.lp_chronos + sum(
            p["bond_leg_chronons"] for p in self._positions.values()
        )
        return {
            "liabilities_chronons": liabilities,
            "inventory_chronons": inventory,
            "solvent": inventory >= liabilities,
            "treasury_chronons": self.treasury_chronons,
        }

    def quote_axon_for_chronos(self, chronons_in: int) -> int:
        """Constant-product sim quote (MVP). Liquidity math only — G13."""
        if chronons_in <= 0 or self.lp_chronos <= 0:
            return 0
        k = self.lp_chronos * self.lp_axon
        new_chronos = self.lp_chronos + chronons_in
        return self.lp_axon - k // new_chronos

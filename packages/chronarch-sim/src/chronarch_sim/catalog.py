"""Run the full 12-case Immune Gym catalog across the node fixture (G12:
Chronarch targets only). Each node gets every case; a case whose oracle
fails on any node is a fleet-wide immune failure.
"""
from __future__ import annotations

from chronarch_gym import make_case, run_case
from chronarch_spec.constants import GYM_CASE_CATALOG

from .world import SimWorld


def run_gym_catalog(world: SimWorld) -> list[dict]:
    """Return one row per (node, attack): {node, attack, detected, detail}."""
    rows: list[dict] = []
    for node_id in world.node_ids:
        env = world.gym_env(node_id)
        for i, attack in enumerate(GYM_CASE_CATALOG):
            case = make_case(f"{node_id}-{i}", attack, node_id,
                             target_class="chronarch_sim")
            receipt = run_case(case, env)
            rows.append({
                "node": node_id,
                "attack": attack,
                "detected": receipt["detected"],
                "rejected": receipt["rejected"],
                "detail": receipt["detail"],
            })
    return rows


def catalog_summary(rows: list[dict]) -> dict:
    """Fold catalog rows into per-attack pass counts."""
    by_attack: dict[str, dict] = {}
    for row in rows:
        entry = by_attack.setdefault(row["attack"], {"detected": 0, "total": 0})
        entry["total"] += 1
        if row["detected"]:
            entry["detected"] += 1
    all_pass = all(e["detected"] == e["total"] for e in by_attack.values())
    return {"by_attack": by_attack, "all_pass": all_pass,
            "cases_run": len(rows)}

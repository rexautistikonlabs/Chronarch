"""chronarch-node: Phase 3 — a real gossiping node process + slot loop.

Wires the SimWorld-equivalent loop to real transports: gossip of
headers/rings/challenges, an abstract-PoST slot leader, and the eight RPC
verbs (init, seal, verify, pin, challenge, propose, ballot, health).
Everything routes through the frozen kernel machinery.
"""
from .cluster import STEWARD_LOCK_CHRONONS, Cluster
from .leader import plot_challenge_proof, slot_leader, verify_leader
from .node import Node, NodeError
from .transport import InProcessBus, RpcServer, rpc_call

__all__ = [
    "Cluster",
    "STEWARD_LOCK_CHRONONS",
    "Node",
    "NodeError",
    "slot_leader",
    "verify_leader",
    "plot_challenge_proof",
    "InProcessBus",
    "RpcServer",
    "rpc_call",
]

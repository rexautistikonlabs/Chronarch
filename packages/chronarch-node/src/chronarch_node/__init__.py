"""chronarch-node: Phase 3 — a real gossiping node process + slot loop.

Wires the SimWorld-equivalent loop to real transports: gossip of
headers/rings/challenges, an abstract-PoST slot leader, and the eight RPC
verbs (init, seal, verify, pin, challenge, propose, ballot, health).
Everything routes through the frozen kernel machinery.
"""
from .cluster import STEWARD_LOCK_CHRONONS, Cluster
from .home import NodeHome
from .leader import plot_challenge_proof, slot_leader, verify_leader
from .net import net_run, net_status
from .node import HomeError, Node, NodeError
from .peers import PeersError, canonical_peers, space_table_from_peers, verify_peers
from .pulse import pulse
from .slotheader import (
    SlotHeaderError,
    build_slot_header,
    commitment_for_node,
    pospace_challenge,
    verify_slot_header,
)
from .transport import InProcessBus, RpcServer, rpc_call

__all__ = [
    "Cluster",
    "STEWARD_LOCK_CHRONONS",
    "Node",
    "NodeError",
    "HomeError",
    "NodeHome",
    "pulse",
    "net_run",
    "net_status",
    "PeersError",
    "canonical_peers",
    "verify_peers",
    "space_table_from_peers",
    "slot_leader",
    "verify_leader",
    "plot_challenge_proof",
    "InProcessBus",
    "RpcServer",
    "rpc_call",
    "SlotHeaderError",
    "build_slot_header",
    "verify_slot_header",
    "commitment_for_node",
    "pospace_challenge",
]

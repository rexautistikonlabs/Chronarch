"""Phase 23: a two-node loopback TCP net.

The same slot headers, rings, and pin offers the in-process net gossips are
carried here over real TCP sockets as **line-delimited JSON** — reusing the
transport's `_send_line` / `_recv_line` framing. Two Node homes run as two OS
threads (or two `chronarch net tcp` processes), each with a gossip listener and
a send connection to its peer. Convergence is the same rule as the in-process
net: every node ends at the same height AND head_hash.

This is **loopback only** — the listener binds 127.0.0.1 (never 0.0.0.0), there
is no peer discovery, no DHT, no public network, and no chiapos. The in-process
`net_run` stays the default; this is an opt-in TCP path over the identical
message envelopes.

A garbled TCP line (bad JSON, a forged/out-of-order message) is skipped: the
reader counts it and keeps the stream alive, and the ledger still verifies —
tampering is detectable, never fatal.
"""
from __future__ import annotations

import socket
import threading
import time

from chronarch_core import make_compute_receipt
from chronarch_council import CouncilState
from chronarch_hearth import HearthState

from .cluster import STEWARD_LOCK_CHRONONS
from .home import NodeHome
from .leader import slot_leader
from .node import Node, NodeError
from .peers import canonical_peers, space_table_from_peers
from .pulse import PULSE_FACULTY
from .transport import _send_line

_LOOPBACK = {"127.0.0.1", "localhost", "::1"}
_WAIT_TIMEOUT_S = 20.0
_POLL_S = 0.004


def parse_addr(text: str) -> tuple[str, int]:
    """Parse HOST:PORT. Loopback only — a non-loopback host is refused (this is
    not a public network)."""
    if ":" not in text:
        raise NodeError(f"address must be HOST:PORT, got {text!r}")
    host, _, port = text.rpartition(":")
    host = host or "127.0.0.1"
    if host not in _LOOPBACK:
        raise NodeError(
            f"loopback only: refusing to use {host!r} (use 127.0.0.1; never 0.0.0.0)")
    try:
        return host, int(port)
    except ValueError:
        raise NodeError(f"bad port in {text!r}") from None


class TcpGossipServer:
    """A line-JSON gossip listener bound to a node. Each accepted connection is
    a stream of gossip messages; each is applied via `node.on_gossip`. A garbled
    or rejected line is counted and skipped — never a crash, never a dropped
    connection."""

    def __init__(self, node: Node, host: str = "127.0.0.1", port: int = 0) -> None:
        if host not in _LOOPBACK:
            raise NodeError(f"loopback only: refusing to bind {host!r}")
        self.node = node
        self.lock = threading.Lock()  # serialize this node's mutations
        self.garbled = 0
        self._sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._sock.bind((host, port))
        self._sock.listen(16)
        self.host, self.port = self._sock.getsockname()
        self._stop = threading.Event()
        self._threads: list[threading.Thread] = []

    def start(self) -> "TcpGossipServer":
        t = threading.Thread(target=self._accept_loop, daemon=True)
        t.start()
        self._threads.append(t)
        return self

    def _accept_loop(self) -> None:
        self._sock.settimeout(0.2)
        while not self._stop.is_set():
            try:
                conn, _ = self._sock.accept()
            except socket.timeout:
                continue
            except OSError:
                break
            rt = threading.Thread(target=self._read_conn, args=(conn,), daemon=True)
            rt.start()
            self._threads.append(rt)

    def _read_conn(self, conn: socket.socket) -> None:
        import json
        with conn, conn.makefile("r", encoding="utf-8") as reader:
            while not self._stop.is_set():
                try:
                    line = reader.readline()
                except OSError:
                    break
                if not line:
                    break
                line = line.strip()
                if not line:
                    continue
                try:
                    message = json.loads(line)
                except json.JSONDecodeError:
                    self.garbled += 1  # a garbled line is rejected, not fatal
                    continue
                if not isinstance(message, dict):
                    self.garbled += 1
                    continue
                sender = message.get("from_id") or message.get("leader") or "peer"
                try:
                    with self.lock:
                        self.node.on_gossip(sender, message)
                except Exception:
                    # A forged/out-of-order gossip is rejected (bad proof, hash
                    # mismatch, …) — count it and keep the stream + ledger alive.
                    self.garbled += 1

    def stop(self) -> None:
        self._stop.set()
        try:
            self._sock.close()
        except OSError:
            pass
        for t in self._threads:
            t.join(timeout=2.0)


class TcpPeer:
    """A send-only line-JSON connection to a peer's gossip listener. Reconnects
    on failure; connection is lazy (the peer may not be listening yet)."""

    def __init__(self, host: str, port: int) -> None:
        self.addr = (host, port)
        self._sock: socket.socket | None = None
        self._lock = threading.Lock()

    def _connect(self) -> None:
        last = None
        for _ in range(100):
            try:
                self._sock = socket.create_connection(self.addr, timeout=2.0)
                return
            except OSError as exc:  # peer listener not up yet — retry briefly
                last = exc
                time.sleep(0.05)
        raise ConnectionError(f"cannot reach peer {self.addr}: {last}")

    def send(self, message: dict) -> None:
        with self._lock:
            if self._sock is None:
                self._connect()
            try:
                _send_line(self._sock, message)
            except OSError:
                self._sock = None
                self._connect()
                _send_line(self._sock, message)

    def send_raw(self, data: bytes) -> None:
        """Inject raw bytes (a garbled line) — used only by tests."""
        with self._lock:
            if self._sock is None:
                self._connect()
            try:
                self._sock.sendall(data)
            except OSError:
                self._sock = None
                self._connect()
                self._sock.sendall(data)

    def close(self) -> None:
        with self._lock:
            if self._sock is not None:
                try:
                    self._sock.close()
                except OSError:
                    pass
                self._sock = None


def _node_loop(node: Node, peers: list[TcpPeer], fleet: dict, slots: int,
               start: int, lock: threading.Lock, garble_first: bool = False) -> None:
    """One node's autonomous slot loop. When elected leader it produces and
    sends the slot's gossip (slot_header, ring, header, then pin offers) to each
    peer; otherwise it waits for its listener to apply the slot."""
    eligible = set(fleet)  # every peer is bonded in this node's hearth
    for offset in range(slots):
        slot = start + offset
        leader = slot_leader(slot, fleet, eligible)
        if leader is None:
            continue
        if leader == node.identity:
            with lock:
                receipt = make_compute_receipt(
                    node.identity, "dummymind", PULSE_FACULTY, node=node,
                    inputs={"tx": {"tcp_slot": slot}}, slot=slot)
                node.submit_compute_receipt(receipt)
                messages = node.produce_slot(slot)
            if not messages:
                continue
            if garble_first and offset == 0:
                for peer in peers:
                    peer.send_raw(b"{ this is not valid json\n")  # a garbled line
            for message in messages:
                for peer in peers:
                    peer.send(message)
            for offer in node.make_pin_offers():
                for peer in peers:
                    peer.send(offer)
        else:
            deadline = time.time() + _WAIT_TIMEOUT_S
            while node.ledger.height < slot and time.time() < deadline:
                time.sleep(_POLL_S)


def _build_tcp_node(home: str, identity: str, units: int | None, fleet: dict):
    """A node with its OWN hearth/council (a separate process), every fleet
    identity bonded so its leader election sees the whole fleet."""
    hearth = HearthState()
    council = CouncilState(hearth)
    for fid in fleet:
        hearth.lock(fid, STEWARD_LOCK_CHRONONS, slot=0)
    kwargs = {"home": home, "hearth": hearth, "council": council,
              "space_table": dict(fleet)}
    node = Node(identity, units, **kwargs) if units is not None else Node(identity, **kwargs)
    node.space_table = fleet
    node.rpc("challenge", {"slot": node.ledger.height + 1})
    return node


def tcp_net_run(homes, slots: int = 6, *, host: str = "127.0.0.1",
                garble: bool = False) -> dict:
    """Run a loopback TCP net across (exactly two) home dirs on separate threads,
    gossiping over real sockets, and return convergence + per-home state.

    `garble=True` injects a garbled TCP line before each leader's first send to
    prove a bad line is rejected without breaking convergence.
    """
    from .net import _check_existing_peers, _plan_home

    homes = list(homes)
    if len(homes) != 2:
        raise ValueError("the loopback TCP net is two homes")
    if slots < 1:
        raise ValueError("tcp_net_run needs at least one slot")

    plans = [_plan_home(home, i) for i, home in enumerate(homes)]
    fleet = {identity: units for identity, units in plans}
    if len(fleet) != len(plans):
        raise ValueError("net homes must have distinct identities")
    _check_existing_peers(homes, fleet)

    nodes: dict[str, Node] = {}
    servers: dict[str, TcpGossipServer] = {}
    for home, (identity, units) in zip(homes, plans):
        node = _build_tcp_node(home, identity, units, fleet)
        nodes[identity] = node
        servers[identity] = TcpGossipServer(node, host=host).start()

    fleet_canon = canonical_peers(fleet)
    for home in homes:
        NodeHome(home).write_peers(fleet_canon)

    identities = list(nodes)
    peer_conns = {
        identity: [TcpPeer(host, servers[other].port)
                   for other in identities if other != identity]
        for identity in identities
    }

    start = next(iter(nodes.values())).ledger.height + 1
    threads = []
    for identity in identities:
        t = threading.Thread(
            target=_node_loop,
            args=(nodes[identity], peer_conns[identity], fleet, slots, start,
                  servers[identity].lock, garble),
            daemon=True)
        threads.append(t)
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=_WAIT_TIMEOUT_S + 10)

    for conns in peer_conns.values():
        for peer in conns:
            peer.close()
    for server in servers.values():
        server.stop()

    heads = {node.ledger.head_hash for node in nodes.values()}
    heights = {node.ledger.height for node in nodes.values()}
    converged = len(heads) == 1 and len(heights) == 1
    return {
        "transport": "tcp-loopback",
        "converged": converged,
        "garbled": sum(server.garbled for server in servers.values()),
        "homes": [{
            "identity": node.identity,
            "height": node.ledger.height,
            "head_hash": node.ledger.head_hash,
            "verify": node.ledger.verify_full(),
        } for node in nodes.values()],
    }


def tcp_serve(home: str, listen: str, peer: str, slots: int = 6) -> dict:
    """Run ONE node of a loopback TCP net (the CLI path): listen on `listen`,
    gossip with the peer at `peer`, drive this node's slot loop, return this
    node's final state. The fleet is read from the home's peers.json (establish
    it once with the in-process `chronarch net --homes A,B`)."""
    node_home = NodeHome(home)
    if not node_home.is_initialized():
        raise NodeError(f"BAD_HOME: no node home at {home}")
    if not node_home.has_peers():
        raise NodeError(
            "no fleet: this home has no peers.json (establish it with "
            "`chronarch net --homes A,B` first)")
    fleet = space_table_from_peers(node_home.read_peers())
    identity = node_home.read_identity()
    if identity not in fleet:
        raise NodeError(f"PEERS_MISMATCH: {identity!r} is not in this home's fleet")

    listen_host, listen_port = parse_addr(listen)
    peer_host, peer_port = parse_addr(peer)

    node = _build_tcp_node(home, identity, None, fleet)
    server = TcpGossipServer(node, host=listen_host, port=listen_port).start()
    peer_conn = TcpPeer(peer_host, peer_port)
    start = node.ledger.height + 1
    try:
        _node_loop(node, [peer_conn], fleet, slots, start, server.lock)
    finally:
        peer_conn.close()
        server.stop()
    return {
        "transport": "tcp-loopback",
        "identity": identity,
        "listen": f"{server.host}:{server.port}",
        "peer": f"{peer_host}:{peer_port}",
        "height": node.ledger.height,
        "head_hash": node.ledger.head_hash,
        "garbled": server.garbled,
        "verify": node.ledger.verify_full(),
    }

"""Transports for gossip and RPC.

`InProcessBus` is a deterministic message bus used by the Cluster and tests
— no sockets, sorted delivery order, fully reproducible.

`TcpTransport` / `serve_rpc` carry the same messages over real TCP sockets
as line-delimited JSON, so a node can run as an actual OS process and a CLI
on another host can drive it. Both speak the same envelope, so code written
against one works against the other.

Wire format (one JSON object per line, UTF-8):
  {"kind": "rpc", "method": "...", "params": {...}}      -> request
  {"ok": true, "result": {...}} | {"ok": false, "error": "..."}  -> reply
  {"kind": "ring"|"header"|"challenge", ...}             -> gossip
"""
from __future__ import annotations

import json
import socket
import threading


class InProcessBus:
    """Deterministic broadcast bus. Nodes register by identity."""

    def __init__(self) -> None:
        self._peers: dict[str, object] = {}

    def register(self, identity: str, node: object) -> None:
        self._peers[identity] = node

    def broadcast(self, sender: str, message: dict) -> None:
        # Sorted, sender-excluded delivery — reproducible every run.
        for identity in sorted(self._peers):
            if identity != sender:
                self._peers[identity].on_gossip(sender, message)

    def peers(self) -> list[str]:
        return sorted(self._peers)


def _send_line(sock: socket.socket, obj: dict) -> None:
    sock.sendall((json.dumps(obj, separators=(",", ":")) + "\n").encode("utf-8"))


def _recv_line(fileobj) -> dict | None:
    line = fileobj.readline()
    if not line:
        return None
    return json.loads(line)


def rpc_call(host: str, port: int, method: str, params: dict,
             timeout: float = 5.0) -> dict:
    """Send one RPC request to a running node process and return its reply."""
    with socket.create_connection((host, port), timeout=timeout) as sock:
        _send_line(sock, {"kind": "rpc", "method": method, "params": params})
        with sock.makefile("r", encoding="utf-8") as reader:
            reply = _recv_line(reader)
    if reply is None:
        raise ConnectionError("no reply from node")
    return reply


class RpcServer:
    """A threaded line-JSON RPC server bound to a node's `rpc` dispatcher.

    Each connection carries one request/reply (simple, robust for a CLI).
    The dispatcher NEVER sees a way to bypass admission or Council — it only
    exposes the node's own RPC verbs, which themselves call the frozen
    machinery.
    """

    def __init__(self, dispatch, host: str = "127.0.0.1", port: int = 0) -> None:
        self._dispatch = dispatch
        self._sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._sock.bind((host, port))
        self._sock.listen(16)
        self.host, self.port = self._sock.getsockname()
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()

    def serve_forever(self) -> None:
        self._sock.settimeout(0.25)
        while not self._stop.is_set():
            try:
                conn, _ = self._sock.accept()
            except socket.timeout:
                continue
            except OSError:
                break
            with conn:
                self._handle(conn)

    def _handle(self, conn: socket.socket) -> None:
        try:
            with conn.makefile("r", encoding="utf-8") as reader:
                request = _recv_line(reader)
            if not request or request.get("kind") != "rpc":
                _send_line(conn, {"ok": False, "error": "expected an rpc request"})
                return
            try:
                result = self._dispatch(request["method"], request.get("params") or {})
                _send_line(conn, {"ok": True, "result": result})
            except Exception as exc:  # a bad request must not kill the server
                _send_line(conn, {"ok": False, "error": f"{type(exc).__name__}: {exc}"})
        except (json.JSONDecodeError, OSError) as exc:
            try:
                _send_line(conn, {"ok": False, "error": f"malformed request: {exc}"})
            except OSError:
                pass

    def start(self) -> "RpcServer":
        self._thread = threading.Thread(target=self.serve_forever, daemon=True)
        self._thread.start()
        return self

    def stop(self) -> None:
        self._stop.set()
        try:
            self._sock.close()
        except OSError:
            pass
        if self._thread is not None:
            self._thread.join(timeout=2.0)

"""Phase 23 tests: a two-node loopback TCP net.

The same slot headers, rings, and pin offers the in-process net gossips are
carried over real TCP sockets as line-JSON. Two homes on two threads converge on
one head; a garbled TCP line is rejected without breaking the ledger; and the
in-process net_run still converges. Loopback only — no public network, no DHT,
no chiapos.
"""
import socket
import threading

import pytest

from chronarch_node import net_run, tcp_net_run, tcp_serve
from chronarch_node.tcpnet import parse_addr
from chronarch_node.node import NodeError


def _homes(tmp_path, n=2):
    return [str(tmp_path / f"home-{i}") for i in range(n)]


def _free_port() -> int:
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


# -- two loopback nodes converge -------------------------------------------
def test_two_loopback_nodes_converge(tmp_path):
    result = tcp_net_run(_homes(tmp_path), slots=4)
    assert result["transport"] == "tcp-loopback"
    assert result["converged"] is True
    heads = {h["head_hash"] for h in result["homes"]}
    heights = {h["height"] for h in result["homes"]}
    assert len(heads) == 1 and heights == {4}
    assert all(h["verify"] for h in result["homes"])
    assert result["garbled"] == 0


def test_tcp_head_matches_in_process_over_same_fleet(tmp_path):
    # The TCP transport carries the same messages to the same consensus outcome.
    ip = net_run([str(tmp_path / "ip0"), str(tmp_path / "ip1")], slots=5)
    tcp = tcp_net_run([str(tmp_path / "tc0"), str(tmp_path / "tc1")], slots=5)
    assert {h["head_hash"] for h in ip["homes"]} == {h["head_hash"] for h in tcp["homes"]}


# -- garbled TCP line rejected; ledger still verifies ----------------------
def test_garbled_line_rejected_and_ledger_verifies(tmp_path):
    result = tcp_net_run(_homes(tmp_path), slots=4, garble=True)
    assert result["converged"] is True          # convergence survives the bad line
    assert result["garbled"] >= 1               # the garbled line was rejected
    assert all(h["verify"] for h in result["homes"])  # ledger still verifies


# -- the CLI single-node path (two threads, ephemeral ports) ---------------
def test_tcp_serve_two_nodes_converge(tmp_path):
    homes = _homes(tmp_path)
    net_run(homes, slots=2)  # establish the fleet (peers.json)
    port_a, port_b = _free_port(), _free_port()
    out = {}

    def run(home, listen, peer, key):
        out[key] = tcp_serve(home, listen, peer, slots=4)

    threads = [
        threading.Thread(target=run, args=(homes[0], f"127.0.0.1:{port_a}",
                                           f"127.0.0.1:{port_b}", "a")),
        threading.Thread(target=run, args=(homes[1], f"127.0.0.1:{port_b}",
                                           f"127.0.0.1:{port_a}", "a2")),
    ]
    for t in threads:
        t.start()
    for t in threads:
        t.join(30)
    assert out["a"]["head_hash"] == out["a2"]["head_hash"]
    assert out["a"]["height"] == out["a2"]["height"]
    assert out["a"]["verify"] and out["a2"]["verify"]


# -- loopback only ----------------------------------------------------------
def test_non_loopback_address_refused():
    with pytest.raises(NodeError):
        parse_addr("0.0.0.0:9999")
    with pytest.raises(NodeError):
        parse_addr("8.8.8.8:9999")
    # loopback forms are accepted
    assert parse_addr("127.0.0.1:8731") == ("127.0.0.1", 8731)
    assert parse_addr("localhost:1") == ("localhost", 1)


def test_tcp_serve_requires_a_fleet(tmp_path):
    # a solo home (pulse, no peers.json) cannot join a net
    from chronarch_node import pulse
    home = str(tmp_path / "solo")
    pulse(home)
    with pytest.raises(NodeError):
        tcp_serve(home, "127.0.0.1:0", "127.0.0.1:1", slots=1)


# -- the in-process default still works ------------------------------------
def test_in_process_net_run_still_converges(tmp_path):
    result = net_run(_homes(tmp_path), slots=4)
    assert result["converged"] is True

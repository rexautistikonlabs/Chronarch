"""Phase 3 CLI tests: the cluster demo and RPC verbs over a live server."""
import json

import pytest

from chronarch_cli import main
from chronarch_node import Node, RpcServer


def test_cluster_subcommand_converges(capsys):
    rc = main(["cluster", "--nodes", "4", "--slots", "6"])
    out = json.loads(capsys.readouterr().out)
    assert rc == 0
    assert out["converged"] and out["all_verify"]
    assert out["ledger_height"] == 6
    assert len(out["leaders"]) == 6


@pytest.fixture()
def server():
    node = Node("cli-node", 100)
    srv = RpcServer(node.rpc, host="127.0.0.1", port=0).start()
    yield srv
    srv.stop()


def test_cli_init_verb_over_server(capsys, server):
    rc = main(["init", "--host", server.host, "--port", str(server.port)])
    out = json.loads(capsys.readouterr().out)
    assert rc == 0 and out["ok"] and out["result"]["boot_ok"]


def test_cli_seal_then_verify(capsys, server):
    main(["seal", "--host", server.host, "--port", str(server.port),
          "--json", json.dumps({"ring_type": "experience", "body": {"x": 1}})])
    capsys.readouterr()
    main(["verify", "--host", server.host, "--port", str(server.port)])
    out = json.loads(capsys.readouterr().out)
    assert out["result"]["chain_ok"] and out["result"]["height"] == 1


def test_cli_submit_tx_override_rejected(capsys, server):
    main(["submit-tx", "--host", server.host, "--port", str(server.port),
          "--json", json.dumps({"tx": {"tx_type": "helm_override", "sender": "x"}})])
    out = json.loads(capsys.readouterr().out)
    assert out["ok"] and not out["result"]["accepted"] and out["result"]["scar_hash"]


def test_help_lists_all_verbs():
    from chronarch_cli import build_parser
    parser = build_parser()
    # Every RPC verb + serve + cluster is a registered subcommand.
    subactions = [a for a in parser._actions if hasattr(a, "choices") and a.choices]
    choices = set(subactions[0].choices)
    for verb in ("serve", "cluster", "init", "seal", "verify", "pin",
                 "challenge", "propose", "ballot", "health", "submit-tx"):
        assert verb in choices

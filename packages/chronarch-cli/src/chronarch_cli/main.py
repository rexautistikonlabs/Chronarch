"""chronarch-cli: drive a node process or run a local cluster.

  chronarch serve   --identity node-0 --space 100 [--host --port]
  chronarch cluster --nodes 4 --slots 6
  chronarch <verb>  [--host --port] [--json '{...}']

where <verb> is one of the RPC verbs: init, seal, verify, pin, challenge,
propose, ballot, health, submit-tx. The CLI is a thin transport: every verb
maps to a node RPC, which routes through the frozen kernel. There is no
CLI verb that bypasses admission or Council — the surface is exactly the
node's own RPC surface.
"""
from __future__ import annotations

import argparse
import json
import sys

RPC_VERBS = ("init", "seal", "verify", "pin", "challenge", "propose",
             "ballot", "health", "submit-tx")


def _print(obj: object) -> None:
    print(json.dumps(obj, indent=2, sort_keys=True))


def _cmd_serve(args) -> int:
    from chronarch_node import Node, RpcServer

    node = Node(args.identity, args.space, compute_units=args.compute)
    server = RpcServer(node.rpc, host=args.host, port=args.port).start()
    _print({"serving": args.identity, "host": server.host, "port": server.port,
            "boot_ok": node.boot["report"]["boot_ok"]})
    try:
        server._thread.join()  # block until killed
    except KeyboardInterrupt:
        server.stop()
    return 0


def _cmd_cluster(args) -> int:
    from chronarch_node import Cluster

    cluster = Cluster(n_nodes=args.nodes)
    log = cluster.run_slots(args.slots)
    _print({
        "nodes": args.nodes,
        "slots": args.slots,
        "leaders": [r["leader"] for r in log],
        "converged": cluster.converged(),
        "all_verify": cluster.all_verify(),
        "ledger_height": cluster.head_height(),
    })
    return 0 if cluster.converged() and cluster.all_verify() else 1


def _cmd_rpc(args) -> int:
    from chronarch_node import rpc_call

    method = args.verb.replace("-", "_")
    params = json.loads(args.json) if args.json else {}
    reply = rpc_call(args.host, args.port, method, params)
    _print(reply)
    return 0 if reply.get("ok") else 1


def _cmd_agent(args) -> int:
    # Thin: boot a Chronarch-Prime agent in-process and run one verb. Always
    # JSON out. The CLI never injects an LLM, so the mind is DummyMind (the
    # optional LLM backend is a library-injection path, not a CLI flag).
    from chronarch_agent import Agent

    agent = Agent()
    params = json.loads(args.json) if args.json else {}
    envelope = agent.handle(args.agent_verb, params)
    _print(envelope)
    return 0 if envelope.get("ok") else 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="chronarch", description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    serve = sub.add_parser("serve", help="boot a node and serve RPC")
    serve.add_argument("--identity", default="node-0")
    serve.add_argument("--space", type=int, default=100)
    serve.add_argument("--compute", type=int, default=8)
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", type=int, default=8731)
    serve.set_defaults(func=_cmd_serve)

    cluster = sub.add_parser("cluster", help="run an in-process cluster demo")
    cluster.add_argument("--nodes", type=int, default=4)
    cluster.add_argument("--slots", type=int, default=6)
    cluster.set_defaults(func=_cmd_cluster)

    for verb in RPC_VERBS:
        p = sub.add_parser(verb, help=f"RPC: {verb}")
        p.add_argument("--host", default="127.0.0.1")
        p.add_argument("--port", type=int, default=8731)
        p.add_argument("--json", default="", help="JSON params object")
        p.set_defaults(func=_cmd_rpc, verb=verb)

    agent = sub.add_parser("agent", help="agent runtime (DummyMind; JSON out)")
    agent_sub = agent.add_subparsers(dest="agent_verb", required=True)
    for verb in ("turn", "health", "recall"):
        p = agent_sub.add_parser(verb, help=f"agent {verb}")
        p.add_argument("--json", default="", help="JSON params object")
        p.set_defaults(func=_cmd_agent, agent_verb=verb)

    return parser


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(sys.argv[1:] if argv is None else argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())

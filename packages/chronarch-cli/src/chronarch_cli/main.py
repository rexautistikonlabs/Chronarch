"""chronarch-cli: drive a node process or run a local cluster.

  chronarch serve   --identity node-0 --space 100 [--host --port]
  chronarch cluster --nodes 4 --slots 6
  chronarch <verb>  [--host --port] [--json '{...}']

Lab verbs (JSON out, fail-closed, docs/LAB.md):

  chronarch status              # what lab-v0 is (STATUS.md) + git describe
  chronarch pulse  --home DIR   # one organism pulse on a home
  chronarch memory --home DIR   # read-only: what the home remembers

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


def build_node_from_space(identity, space, compute, home=None):
    """`--space` is a .cseal path when it ends with .cseal, else abstract
    integer units. A bad/missing file raises NodeError (JSON error to caller).

    With `--home`, a durable node is booted: on an existing home the space
    (and identity) are recovered from it, so `--space` may be omitted; a fresh
    home still needs a `--space` (a file to copy in, or units to record)."""
    from chronarch_node import Node

    kwargs = {"compute_units": compute}
    if home is not None:
        kwargs["home"] = home
    if space is None:
        return Node(identity, **kwargs)  # resume: home is the source of truth
    if isinstance(space, str) and space.endswith(".cseal"):
        return Node(identity, space_path=space, **kwargs)
    return Node(identity, int(space), **kwargs)


def _cmd_serve(args) -> int:
    from chronarch_node import NodeError, RpcServer

    space = args.space
    if space is None and args.home is None:
        space = "100"  # no home and no --space: the historic abstract default
    try:
        node = build_node_from_space(args.identity, space, args.compute, home=args.home)
    except NodeError as exc:
        _print({"ok": False, "error_code": "BAD_SPACE", "result": {"detail": str(exc)}})
        return 1
    server = RpcServer(node.rpc, host=args.host, port=args.port).start()
    _print({"serving": node.identity, "host": server.host, "port": server.port,
            "space_units": node.space_units, "space_path": node.space_path,
            "home": args.home, "height": node.ledger.height,
            "boot_ok": node.boot["report"]["boot_ok"]})
    try:
        server._thread.join()  # block until killed
    except KeyboardInterrupt:
        server.stop()
    return 0


def _cmd_cluster(args) -> int:
    import glob
    import os

    from chronarch_node import Cluster, NodeError

    space_paths = None
    if args.space_dir:
        files = sorted(glob.glob(os.path.join(args.space_dir, "*.cseal")))
        if not files:
            _print({"ok": False, "error_code": "NO_CSEAL_FILES",
                    "result": {"detail": f"no .cseal files in {args.space_dir}"}})
            return 1
        # Node identity per file = its farmer_id (read from the SpaceSeal).
        from chronarch_farm import read_space_seal
        space_paths = {}
        try:
            for path in files:
                seal = read_space_seal(path)
                space_paths[seal["farmer_id"]] = path
        except (NodeError, ValueError, OSError) as exc:
            _print({"ok": False, "error_code": "BAD_SPACE",
                    "result": {"detail": str(exc)}})
            return 1
        cluster = Cluster(space_paths=space_paths)
    else:
        cluster = Cluster(n_nodes=args.nodes)

    log = cluster.run_slots(args.slots)
    _print({
        "ok": True,
        "nodes": len(cluster.nodes),
        "slots": args.slots,
        "space_table": cluster.space_table,
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


def _cmd_farm(args) -> int:
    # On-disk SpaceSeal (.cseal) tooling. JSON out. No verb writes rings.
    from chronarch_farm import (
        SIZE_TABLE,
        inspect_space_seal,
        make_space_seal,
        prove_from_file,
        verify_space_proof,
        write_space_seal,
    )

    if args.farm_verb == "init":
        units_to_ksize = {v: k for k, v in SIZE_TABLE.items()}
        k_size = units_to_ksize.get(args.units)
        if k_size is None:
            _print({"ok": False, "error_code": "BAD_UNITS",
                    "result": {"detail": f"--units must be one of {sorted(units_to_ksize)}"}})
            return 1
        seal = make_space_seal(args.farmer_id, k_size, cas_root=args.cas_root or "")
        info = write_space_seal(args.out, seal)
        _print({"ok": True, "result": {"out": args.out, "k_size": k_size,
                                       "space_units": seal["space_units"], **info}})
        return 0

    if args.farm_verb == "inspect":
        _print({"ok": True, "result": inspect_space_seal(args.path)})
        return 0

    if args.farm_verb == "prove":
        space_units = inspect_space_seal(args.path)["space_units"]
        proof = prove_from_file(args.path, args.challenge)
        result = verify_space_proof(proof, space_units)
        _print({"ok": result["ok"], "result": {"proof": proof, "verify": result}})
        return 0 if result["ok"] else 1

    _print({"ok": False, "error_code": "UNKNOWN_VERB"})
    return 1


def _cmd_pin(args) -> int:
    # On-disk CAS pin lane tooling. JSON out.
    from chronarch_core import PinError, PinStore
    from chronarch_spec import SchemaError

    if args.pin_verb == "put":
        store = PinStore(args.dir)
        with open(args.file, "rb") as f:
            data = f.read()
        try:
            digest = store.put(data, kind=args.kind)
        except (PinError, SchemaError) as exc:
            _print({"ok": False, "error_code": "PIN_REJECTED",
                    "result": {"detail": str(exc)}})
            return 1
        _print({"ok": True, "result": {"hash": digest, "kind": args.kind,
                                       "bytes": len(data)}})
        return 0

    if args.pin_verb == "get":
        store = PinStore(args.dir)
        data = store.get(args.hash)
        found = data is not None
        _print({"ok": found, "result": {"found": found,
                                        "bytes": len(data) if found else 0,
                                        "verified": store.verify(args.hash) if found else False}})
        return 0 if found else 1

    if args.pin_verb == "verify":
        from chronarch_farm import read_space_seal, verify_pins
        store = PinStore(args.dir)
        try:
            seal = read_space_seal(args.space)
        except Exception as exc:
            _print({"ok": False, "error_code": "BAD_SPACE", "result": {"detail": str(exc)}})
            return 1
        result = verify_pins(seal, store)
        _print({"ok": result["ok"], "result": {"code": result["code"],
                                                "i3": result["restriction"]}})
        return 0 if result["ok"] else 1

    _print({"ok": False, "error_code": "UNKNOWN_VERB"})
    return 1


def _cmd_home(args) -> int:
    # Durable node home tooling (Phase 13). `inspect` resumes a home read-only
    # and reports its height, pin health, and farmed space. JSON out.
    from chronarch_node import Node, NodeError

    if args.home_verb == "inspect":
        try:
            # Identity is recovered from the home; the placeholder is ignored on
            # resume. Inspecting an uninitialized home is a BAD_HOME error and
            # never creates one.
            node = Node("_inspect_", home=args.home)
        except NodeError as exc:
            _print({"ok": False, "error_code": "BAD_HOME",
                    "result": {"detail": str(exc)}})
            return 1
        pins = node.verify_pins()
        _print({"ok": True, "result": {
            "identity": node.identity, "height": node.ledger.height,
            "pins_ok": pins["ok"], "space_units": node.space_units}})
        return 0

    _print({"ok": False, "error_code": "UNKNOWN_VERB"})
    return 1


def _cmd_net(args) -> int:
    # A two-home (N-home) local net (Phase 17): durable homes gossip slots on
    # the in-process bus and converge on one head. JSON out. Existing error
    # codes: BAD_HOME / SPACE_UNITS_MISMATCH / HOME_KERNEL_MISMATCH.
    from chronarch_node import NodeError, net_run

    homes = [h for h in (args.homes or "").split(",") if h]
    if len(homes) < 2:
        _print({"ok": False, "error_code": "BAD_REQUEST",
                "result": {"detail": "--homes needs at least two comma-separated dirs"}})
        return 1
    try:
        result = net_run(homes, slots=args.slots)
    except NodeError as exc:
        detail = str(exc)
        if "PEERS_MISMATCH" in detail:
            code = "PEERS_MISMATCH"
        elif "HOME_KERNEL_MISMATCH" in detail:
            code = "HOME_KERNEL_MISMATCH"
        elif "SPACE_UNITS_MISMATCH" in detail:
            code = "SPACE_UNITS_MISMATCH"
        else:
            code = "BAD_HOME"
        _print({"ok": False, "error_code": code, "result": {"detail": detail}})
        return 1
    _print({"ok": True, "result": result})
    return 0 if result["converged"] else 1


def _cmd_net_status(args) -> int:
    # Read-only status of each home in a net (Phase 18): identity, height,
    # head_hash, peer_count, peers_ok. No node booted, no file written.
    from chronarch_node import net_status

    homes = [h for h in args.homes.split(",") if h]
    if len(homes) < 1:
        _print({"ok": False, "error_code": "BAD_REQUEST",
                "result": {"detail": "--homes needs at least one dir"}})
        return 1
    result = net_status(homes)
    _print({"ok": True, "result": result})
    return 0 if all(h["peers_ok"] for h in result["homes"]) else 1


def _cmd_net_tcp(args) -> int:
    # Run ONE node of a loopback TCP net (Phase 23): listen on --listen, gossip
    # slot headers + pin offers with the peer at --peer over line-JSON. Loopback
    # only (127.0.0.1); the in-process `net --homes` stays the default. The
    # fleet is read from the home's peers.json (establish it once with
    # `net --homes A,B`). JSON out.
    from chronarch_node import NodeError, tcp_serve

    try:
        result = tcp_serve(args.home, args.listen, args.peer, slots=args.slots)
    except NodeError as exc:
        detail = str(exc)
        if "BAD_HOME" in detail:
            code = "BAD_HOME"
        elif "PEERS_MISMATCH" in detail or "no fleet" in detail:
            code = "PEERS_MISMATCH"
        elif "loopback only" in detail:
            code = "NOT_LOOPBACK"
        else:
            code = "BAD_REQUEST"
        _print({"ok": False, "error_code": code, "result": {"detail": detail}})
        return 1
    except (ConnectionError, OSError) as exc:
        _print({"ok": False, "error_code": "PEER_UNREACHABLE",
                "result": {"detail": str(exc)}})
        return 1
    _print({"ok": True, "result": result})
    return 0 if result["verify"] else 1


def _cmd_peers(args) -> int:
    # Draft a peer-set-change proposal (Phase 19). A peer change is a MAJOR
    # change (M6): it activates ONLY via a passed, slashing-backed Council
    # ballot — never an admin key, never self-enact. This verb validates and
    # drafts the Proposal; ratification runs on the Council machine API +
    # net.ratify_peer_change (see specs/PEERS.md). JSON out.
    from chronarch_node import (
        NodeHome,
        PeersError,
        apply_peer_change,
        peer_change_proposal,
        space_table_from_peers,
        verify_peer_change,
    )
    from chronarch_spec import SchemaError, validate

    if args.peers_verb != "propose":
        _print({"ok": False, "error_code": "UNKNOWN_VERB"})
        return 1

    home = NodeHome(args.home)
    if not home.is_initialized():
        _print({"ok": False, "error_code": "BAD_HOME",
                "result": {"detail": f"no node home at {args.home}"}})
        return 1

    body = {"kind": args.kind, "identity": args.identity, "space_units": args.units}
    try:
        body = verify_peer_change(body)
        # The change must be a legal add/remove against the home's current fleet.
        if home.has_peers():
            apply_peer_change(space_table_from_peers(home.read_peers()), body)
    except PeersError as exc:
        _print({"ok": False, "error_code": "PEERS_MISMATCH", "result": {"detail": str(exc)}})
        return 1

    proposer = f"councilor:{home.read_identity()}"
    proposal_id = f"peer-{body['kind']}-{body['identity']}"
    proposal = peer_change_proposal(proposal_id, proposer, body, slot=0)
    try:
        validate("Proposal", proposal)  # closed schema + K18; a Council-legal shape
    except SchemaError as exc:
        _print({"ok": False, "error_code": "PROPOSAL_INVALID", "result": {"detail": str(exc)}})
        return 1

    # Phase 20: submit the proposal to the home's persistent Council and open
    # voting, so `council ballot`/`status`/`tally` can act on it. Proposing
    # enacts nothing — the peers.json fleet is untouched.
    from chronarch_council import CouncilError
    from chronarch_node import CouncilHomeError, council_propose
    try:
        council_propose(args.home, proposal)
    except (CouncilError, CouncilHomeError) as exc:
        _print({"ok": False, "error_code": "MAJOR_NEEDS_COUNCIL",
                "result": {"detail": str(exc), "proposal_id": proposal_id}})
        return 1

    _print({"ok": True, "result": {
        "proposal_id": proposal_id, "status": "MAJOR_NEEDS_COUNCIL",
        "major_class": proposal["major_class"], "proposer": proposer,
        "kind": body["kind"], "identity": body["identity"],
        "space_units": body["space_units"],
        "note": "submitted + voting open; a peer-set change activates only via a "
                "passed, slashing-backed Council ballot (M6) — no self-enact"}})
    return 0


def _cmd_council(args) -> int:
    # Council operator CLI (Phase 20): status / ballot / tally on a home's
    # persisted Council. G14 unchanged — this only CALLS the frozen Council
    # machine (real Ballot path: liens, weight, eligibility; illegal → slash +
    # I8). JSON out.
    from chronarch_council import CouncilError
    from chronarch_node import (
        CouncilHomeError,
        council_cast,
        council_status,
        council_tally,
    )

    try:
        if args.council_verb == "status":
            _print({"ok": True, "result": council_status(args.home)})
            return 0
        if args.council_verb == "ballot":
            identity = args.identity or NodeHome_identity(args.home)
            result = council_cast(args.home, args.proposal_id, identity, args.vote)
            _print({"ok": True, "result": result})
            return 0
        if args.council_verb == "tally":
            homes = [h for h in (args.homes or "").split(",") if h] or None
            result = council_tally(args.home, args.proposal_id, homes_to_ratify=homes)
            _print({"ok": True, "result": result})
            return 0
    except CouncilHomeError as exc:
        code = "BAD_HOME" if "BAD_HOME" in str(exc) else "COUNCIL_UNAVAILABLE"
        _print({"ok": False, "error_code": code, "result": {"detail": str(exc)}})
        return 1
    except CouncilError as exc:
        detail = str(exc)
        code = "PEERS_MISMATCH" if "PEERS_MISMATCH" in detail else "COUNCIL_ERROR"
        _print({"ok": False, "error_code": code, "result": {"detail": detail}})
        return 1

    _print({"ok": False, "error_code": "UNKNOWN_VERB"})
    return 1


def NodeHome_identity(home: str) -> str:
    from chronarch_node import NodeHome
    return NodeHome(home).read_identity()


def _cmd_pulse(args) -> int:
    # The organism pulse (Phase 16): one deterministic loop that farms, checks
    # pins, attests a DummyMind compute job, and credits Chronos on a home.
    # JSON out. Existing error codes: BAD_HOME / SPACE_UNITS_MISMATCH /
    # COMPUTE_UNATTESTED / BAD_SPACE.
    from chronarch_farm import SpaceFileError
    from chronarch_node import NodeError, pulse

    try:
        result = pulse(args.home, space_path=args.space, slots=args.slots)
    except NodeError as exc:
        detail = str(exc)
        if "SPACE_UNITS_MISMATCH" in detail:
            code = "SPACE_UNITS_MISMATCH"
        elif "COMPUTE_UNATTESTED" in detail or "compute receipt" in detail:
            code = "COMPUTE_UNATTESTED"
        elif "space file" in detail or "bad space" in detail:
            code = "BAD_SPACE"
        else:
            code = "BAD_HOME"
        _print({"ok": False, "error_code": code, "result": {"detail": detail}})
        return 1
    except (SpaceFileError, OSError, ValueError) as exc:
        _print({"ok": False, "error_code": "BAD_SPACE", "result": {"detail": str(exc)}})
        return 1
    _print({"ok": True, "result": result})
    return 0


def _cmd_compute(args) -> int:
    # Attest and submit a compute receipt against a home node (Phase 15). The
    # node builds the receipt honestly (running a DummyMind faculty or a gym
    # oracle) and attests it; JSON out is ok or COMPUTE_UNATTESTED /
    # GYM_TARGET_FOREIGN. There is no backdoor: an unattested job is refused.
    from chronarch_core import (
        ComputeError,
        ForeignGymTargetError,
        GYM_TARGET_FOREIGN,
        make_compute_receipt,
    )
    from chronarch_node import Node, NodeError, NodeHome

    if args.compute_verb != "submit":
        _print({"ok": False, "error_code": "UNKNOWN_VERB"})
        return 1

    if not NodeHome(args.home).is_initialized():
        _print({"ok": False, "error_code": "BAD_HOME",
                "result": {"detail": f"no node home at {args.home}"}})
        return 1
    try:
        node = Node("_compute_", home=args.home)
    except NodeError as exc:
        _print({"ok": False, "error_code": "BAD_HOME", "result": {"detail": str(exc)}})
        return 1

    worker = args.worker or node.identity
    try:
        if args.job_kind == "dummymind":
            if not args.input:
                _print({"ok": False, "error_code": "BAD_REQUEST",
                        "result": {"detail": "--input HEX is required for a dummymind job"}})
                return 1
            inputs = {"tx": {"input": args.input}}
            receipt = make_compute_receipt(worker, "dummymind", args.job_id,
                                           node=node, inputs=inputs)
        else:  # gym
            receipt = make_compute_receipt(worker, "gym", args.job_id)
        result = node.submit_compute_receipt(receipt)
    except ForeignGymTargetError as exc:
        _print({"ok": False, "error_code": GYM_TARGET_FOREIGN, "result": {"detail": str(exc)}})
        return 1
    except (NodeError, ComputeError) as exc:
        _print({"ok": False, "error_code": "COMPUTE_UNATTESTED", "result": {"detail": str(exc)}})
        return 1

    _print({"ok": True, "result": {
        "code": result["code"], "worker": worker,
        "job_kind": receipt["job_kind"], "job_id": receipt["job_id"],
        "buffered": len(node.compute_receipts)}})
    return 0


def _cmd_rewards(args) -> int:
    # Chronos credit ledger tooling (Phase 14). `inspect` reads
    # home/rewards.jsonl directly (no ledger replay) and reports totals by
    # reason + the last slot credited. JSON out.
    import os

    from chronarch_core import totals_by_reason
    from chronarch_node import HomeError, NodeHome

    if args.rewards_verb == "inspect":
        home = NodeHome(args.home)
        if not home.is_initialized():
            _print({"ok": False, "error_code": "BAD_HOME",
                    "result": {"detail": f"no node home at {args.home}"}})
            return 1
        try:
            credits = home.read_rewards()
        except HomeError as exc:
            _print({"ok": False, "error_code": "BAD_REWARDS",
                    "result": {"detail": str(exc)}})
            return 1
        last_slot = max((c["slot"] for c in credits), default=None)
        _print({"ok": True, "result": {
            "totals": totals_by_reason(credits),
            "last_slot": last_slot, "credits": len(credits)}})
        return 0

    _print({"ok": False, "error_code": "UNKNOWN_VERB"})
    return 1


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


LAB_RELEASE = "lab-v0"
# Used only when specs/STATUS.md cannot be located (a non-editable install far
# from the repo). Says the same thing STATUS.md's first paragraph says, shorter.
LAB_SUMMARY = ("Chronarch lab-v0 is a research organism that runs on an "
               "in-process or loopback net. It is not a public blockchain.")


def _find_status_md():
    """specs/STATUS.md from the CWD or from the checkout this CLI was
    installed from (an editable install keeps the source tree). None if
    neither exists — the caller then falls back to LAB_SUMMARY."""
    import os

    here = os.path.dirname(os.path.abspath(__file__))
    repo = os.path.abspath(os.path.join(here, "..", "..", "..", ".."))
    for root in (os.getcwd(), repo):
        path = os.path.join(root, "specs", "STATUS.md")
        if os.path.isfile(path):
            return path
    return None


def status_summary(status_path: str) -> str:
    """The first paragraph of STATUS.md (the prose after the H1, up to the
    first blank line), with markdown emphasis stripped. Fail-closed on
    language: this verb never says "mainnet", so a paragraph containing that
    word is refused rather than echoed (STATUS_CLAIM_REFUSED)."""
    with open(status_path, "r", encoding="utf-8") as f:
        lines = f.read().splitlines()
    para: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not para and (stripped == "" or stripped.startswith("#")):
            continue  # skip the title and any leading blanks
        if stripped == "":
            break
        para.append(stripped)
    text = " ".join(para).replace("**", "")
    if not text:
        raise ValueError("STATUS_EMPTY: STATUS.md has no opening paragraph")
    if "mainnet" in text.lower():
        raise ValueError("STATUS_CLAIM_REFUSED: the status paragraph names mainnet")
    return text


def _git_describe(cwd) -> str | None:
    """`git describe --tags --always` for the checkout, or None when git or a
    checkout is unavailable. Never raises."""
    import subprocess

    try:
        proc = subprocess.run(["git", "describe", "--tags", "--always"],
                              cwd=cwd, capture_output=True, text=True, timeout=5)
    except (OSError, subprocess.SubprocessError):
        return None
    if proc.returncode != 0:
        return None
    out = proc.stdout.strip()
    return out or None


def _cmd_status(args) -> int:
    # What lab-v0 is: STATUS.md's first paragraph + the checkout's git describe.
    # JSON out. Read-only. It cannot say "mainnet": status_summary refuses a
    # paragraph that does, and the fallback summary is fixed text.
    import os

    path = _find_status_md()
    try:
        if path is not None:
            summary = status_summary(path)
            with open(path, "r", encoding="utf-8") as f:
                not_public = "not a public blockchain" in f.read()
            rel = os.path.relpath(path)
            source = path if rel.startswith("..") else rel  # absolute when outside the CWD
        else:
            summary, not_public, source = LAB_SUMMARY, True, "builtin"
    except ValueError as exc:
        code = str(exc).split(":", 1)[0]
        _print({"ok": False, "error_code": code, "result": {"detail": str(exc)}})
        return 1
    except OSError as exc:
        _print({"ok": False, "error_code": "STATUS_UNREADABLE", "result": {"detail": str(exc)}})
        return 1
    cwd = os.path.dirname(os.path.dirname(path)) if path is not None else os.getcwd()
    _print({"ok": True, "result": {
        "lab": LAB_RELEASE,
        "status": summary,
        "not_a_public_blockchain": not_public,
        "git_describe": _git_describe(cwd),
        "source": source,
    }})
    return 0 if not_public else 1


def _cmd_memory(args) -> int:
    # Read-only: what a home remembers (Timechain + home + pins). Resumes the
    # home through the frozen fail-closed replay, re-walks the chain, checks
    # pins, and prints exactly MEMORY_KEYS. Rewrites no ring, wipes no scar.
    # Error codes: BAD_HOME / LEDGER_INVALID / PEERS_MISMATCH.
    from chronarch_node import NodeError, memory

    try:
        result = memory(args.home)
    except NodeError as exc:
        detail = str(exc)
        if "PEERS_MISMATCH" in detail:
            code = "PEERS_MISMATCH"
        elif "LEDGER_INVALID" in detail:
            code = "LEDGER_INVALID"
        else:
            code = "BAD_HOME"
        _print({"ok": False, "error_code": code, "result": {"detail": detail}})
        return 1
    _print({"ok": True, "result": result})
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="chronarch", description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    serve = sub.add_parser("serve", help="boot a node and serve RPC")
    serve.add_argument("--identity", default="node-0")
    # --space is abstract integer units, OR a path ending in .cseal to farm
    # from an on-disk SpaceSeal file. With --home on an existing home it may be
    # omitted (the home's space wins); without --home it defaults to 100 units.
    serve.add_argument("--space", default=None)
    serve.add_argument("--home", default=None,
                       help="durable node home dir (persist + resume as the same organism)")
    serve.add_argument("--compute", type=int, default=8)
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", type=int, default=8731)
    serve.set_defaults(func=_cmd_serve)

    cluster = sub.add_parser("cluster", help="run an in-process cluster demo")
    cluster.add_argument("--nodes", type=int, default=4)
    cluster.add_argument("--slots", type=int, default=6)
    cluster.add_argument("--space-dir", default="",
                         help="dir of .cseal files; one file-backed node per file")
    cluster.set_defaults(func=_cmd_cluster)

    for verb in RPC_VERBS:
        p = sub.add_parser(verb, help=f"RPC: {verb}")
        p.add_argument("--host", default="127.0.0.1")
        p.add_argument("--port", type=int, default=8731)
        p.add_argument("--json", default="", help="JSON params object")
        p.set_defaults(func=_cmd_rpc, verb=verb)

    home = sub.add_parser("home", help="durable node home tooling; JSON out")
    home_sub = home.add_subparsers(dest="home_verb", required=True)
    h_inspect = home_sub.add_parser("inspect", help="resume a home read-only and report state")
    h_inspect.add_argument("--home", required=True)
    h_inspect.set_defaults(func=_cmd_home, home_verb="inspect")

    net = sub.add_parser("net", help="run a two-home local net (in-process bus); JSON out")
    net.add_argument("--homes",
                     help="comma-separated home dirs, e.g. /tmp/a,/tmp/b")
    net.add_argument("--slots", type=int, default=6)
    net.set_defaults(func=_cmd_net)
    net_sub = net.add_subparsers(dest="net_verb")
    net_tcp = net_sub.add_parser("tcp", help="run one node of a loopback TCP net; JSON out")
    net_tcp.add_argument("--home", required=True)
    net_tcp.add_argument("--listen", required=True, help="loopback HOST:PORT to bind (127.0.0.1)")
    net_tcp.add_argument("--peer", required=True, help="the peer's loopback HOST:PORT")
    net_tcp.add_argument("--slots", type=int, default=6)
    net_tcp.set_defaults(func=_cmd_net_tcp)
    net_status = net_sub.add_parser("status", help="read-only net status; JSON out")
    net_status.add_argument("--homes", required=True,
                            help="comma-separated home dirs, e.g. /tmp/a,/tmp/b")
    net_status.set_defaults(func=_cmd_net_status)

    pulse = sub.add_parser("pulse", help="run one organism pulse on a home; JSON out")
    pulse.add_argument("--home", required=True)
    pulse.add_argument("--space", default=None,
                       help=".cseal path to farm (abstract TEST units if omitted)")
    pulse.add_argument("--slots", type=int, default=3,
                       help="slots to run (this identity wins its own slots)")
    pulse.set_defaults(func=_cmd_pulse)

    status = sub.add_parser("status", help="what lab-v0 is (STATUS.md + git describe); JSON out")
    status.set_defaults(func=_cmd_status)

    memory = sub.add_parser("memory", help="read-only: what a home remembers; JSON out")
    memory.add_argument("--home", required=True)
    memory.set_defaults(func=_cmd_memory)

    compute = sub.add_parser("compute", help="attest + submit compute receipts; JSON out")
    compute_sub = compute.add_subparsers(dest="compute_verb", required=True)
    c_submit = compute_sub.add_parser("submit", help="attest a DummyMind/gym job and buffer it")
    c_submit.add_argument("--home", required=True)
    c_submit.add_argument("--job-kind", choices=("dummymind", "gym"), required=True)
    c_submit.add_argument("--job-id", required=True,
                          help="dummymind: a live-registry faculty; gym: a catalog attack")
    c_submit.add_argument("--input", default="",
                          help="dummymind input (HEX/opaque); ignored for gym")
    c_submit.add_argument("--worker", default="",
                          help="worker account credited (default: the node identity)")
    c_submit.set_defaults(func=_cmd_compute, compute_verb="submit")

    rewards = sub.add_parser("rewards", help="Chronos credit ledger tooling; JSON out")
    rewards_sub = rewards.add_subparsers(dest="rewards_verb", required=True)
    r_inspect = rewards_sub.add_parser("inspect", help="totals by reason + last slot credited")
    r_inspect.add_argument("--home", required=True)
    r_inspect.set_defaults(func=_cmd_rewards, rewards_verb="inspect")

    agent = sub.add_parser("agent", help="agent runtime (DummyMind; JSON out)")
    agent_sub = agent.add_subparsers(dest="agent_verb", required=True)
    for verb in ("turn", "health", "recall"):
        p = agent_sub.add_parser(verb, help=f"agent {verb}")
        p.add_argument("--json", default="", help="JSON params object")
        p.set_defaults(func=_cmd_agent, agent_verb=verb)

    farm = sub.add_parser("farm", help="on-disk SpaceSeal (.cseal) tooling; JSON out")
    farm_sub = farm.add_subparsers(dest="farm_verb", required=True)
    f_init = farm_sub.add_parser("init", help="write a .cseal SpaceSeal file")
    f_init.add_argument("--farmer-id", required=True)
    f_init.add_argument("--units", type=int, required=True)
    f_init.add_argument("--out", required=True)
    f_init.add_argument("--cas-root", default="")
    f_init.set_defaults(func=_cmd_farm, farm_verb="init")
    f_inspect = farm_sub.add_parser("inspect", help="inspect a .cseal header")
    f_inspect.add_argument("path")
    f_inspect.set_defaults(func=_cmd_farm, farm_verb="inspect")
    f_prove = farm_sub.add_parser("prove", help="prove space from a .cseal")
    f_prove.add_argument("path")
    f_prove.add_argument("--challenge", required=True)
    f_prove.set_defaults(func=_cmd_farm, farm_verb="prove")

    pin = sub.add_parser("pins", help="on-disk CAS pin lane; JSON out")
    pin_sub = pin.add_subparsers(dest="pin_verb", required=True)
    p_put = pin_sub.add_parser("put", help="store an object/blob, return its hash")
    p_put.add_argument("--dir", required=True)
    p_put.add_argument("--file", required=True)
    p_put.add_argument("--kind", choices=("object", "opaque"), default="object")
    p_put.set_defaults(func=_cmd_pin, pin_verb="put")
    p_get = pin_sub.add_parser("get", help="fetch an object by hash")
    p_get.add_argument("--dir", required=True)
    p_get.add_argument("--hash", required=True)
    p_get.set_defaults(func=_cmd_pin, pin_verb="get")
    p_verify = pin_sub.add_parser("verify", help="verify a pin dir against a .cseal cas_root")
    p_verify.add_argument("--space", required=True)
    p_verify.add_argument("--dir", required=True)
    p_verify.set_defaults(func=_cmd_pin, pin_verb="verify")

    peers = sub.add_parser("peers", help="propose a peer-set change (needs a Council ballot); JSON out")
    peers_sub = peers.add_subparsers(dest="peers_verb", required=True)
    pp = peers_sub.add_parser("propose", help="submit a PeerChange proposal (M6, needs a ballot)")
    pp.add_argument("--home", required=True)
    pp.add_argument("--kind", choices=("peer_add", "peer_remove"), required=True)
    pp.add_argument("--identity", required=True)
    pp.add_argument("--units", type=int, required=True)
    pp.set_defaults(func=_cmd_peers, peers_verb="propose")

    council = sub.add_parser("council", help="Council operator CLI (status/ballot/tally); JSON out")
    council_sub = council.add_subparsers(dest="council_verb", required=True)
    c_status = council_sub.add_parser("status", help="show a home's persisted Council")
    c_status.add_argument("--home", required=True)
    c_status.set_defaults(func=_cmd_council, council_verb="status")
    c_ballot = council_sub.add_parser("ballot", help="cast a ballot (real path: liens, weight, eligibility)")
    c_ballot.add_argument("--home", required=True)
    c_ballot.add_argument("--proposal-id", required=True, dest="proposal_id")
    c_ballot.add_argument("--vote", choices=("yes", "no", "abstain"), required=True)
    c_ballot.add_argument("--identity", default="",
                          help="steward casting (default: the home's own identity)")
    c_ballot.set_defaults(func=_cmd_council, council_verb="ballot")
    c_tally = council_sub.add_parser("tally", help="tally a proposal (illegal → slash + I8)")
    c_tally.add_argument("--home", required=True)
    c_tally.add_argument("--proposal-id", required=True, dest="proposal_id")
    c_tally.add_argument("--homes", default="",
                         help="comma-separated homes to ratify an approved PeerChange onto")
    c_tally.set_defaults(func=_cmd_council, council_verb="tally")

    return parser


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(sys.argv[1:] if argv is None else argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())

"""Agent: an AI-agent runtime that WEARS the kernel (Phase 5).

It does not replace the node — it boots one and drives it through the same
frozen machinery. The wear loop (turn):

    load identity head
    recall evidence_refs and re-verify CAS hashes
    run ONLY live-registry faculty ids via DummyMind
    attach advisory self_poq (0..255 x6) as METADATA (never into judgment)
    admit -> seal, or propose (M3 still needs Proposal + Ballot)

Every verb returns the JSON envelope from `protocol`. Authored faculty stays
inert; the LLM (if gated on) only drafts text into a payload — never code,
never an upgrade, never a Challenge verdict.
"""
from __future__ import annotations

from chronarch_core import InertFacultyError, Timechain, ring_hash, run_faculty
from chronarch_council import CouncilError
from chronarch_node import Node
from chronarch_spec import SchemaError, build_ring0
from chronarch_spec.constants import CHRONARCH_PRIME

from .backend import resolve_backend
from .poq import self_poq
from .protocol import err, ok
from .recall import EvidenceError, recall_evidence
from .tools import ALLOWED_VERBS, FORBIDDEN_VERBS

DEFAULT_FACULTY = "injection_screen_sense"


class Agent:
    def __init__(self, identity: str = CHRONARCH_PRIME, *, space_units: int = 100,
                 backend=None, env: dict | None = None, node: Node | None = None) -> None:
        self.identity = identity
        self.node = node or Node(identity, space_units)
        self.backend, self.llm_active = resolve_backend(backend, env)
        self.tasks: dict[str, Timechain] = {}

    # -- dispatch -----------------------------------------------------------
    def handle(self, verb: str, params: dict | None = None) -> dict:
        params = params or {}
        if not isinstance(params, dict):
            return err("BAD_REQUEST", "params must be a JSON object")
        if verb in FORBIDDEN_VERBS:
            return err("FORBIDDEN_TOOL",
                       f"{verb!r} does not exist: authored code stays inert and "
                       "upgrades go through Proposal + Ballot (G4/G14/G17)")
        if verb not in ALLOWED_VERBS:
            return err("UNKNOWN_VERB", f"{verb!r} is not in the tool surface")
        handler = getattr(self, f"_verb_{verb}")
        try:
            return handler(params)
        except EvidenceError as exc:
            return err("EVIDENCE_MISSING", str(exc))
        except InertFacultyError as exc:
            return err("INERT_FACULTY", str(exc))
        except SchemaError as exc:
            return err("SCHEMA_REJECTED", str(exc))
        except CouncilError as exc:
            return err("COUNCIL_REJECTED", str(exc))
        except KeyError as exc:
            return err("BAD_REQUEST", f"missing field {exc}")
        except Exception as exc:  # never hide a failure; report it
            return err("INTERNAL", f"{type(exc).__name__}: {exc}")

    # -- simple verbs (wrap node RPC into the envelope) ---------------------
    def _verb_init(self, params: dict) -> dict:
        r = self.node.rpc("init", {})
        return ok({**r, "llm_active": self.llm_active, "backend": getattr(self.backend, "name", "?")})

    def _verb_recall(self, params: dict) -> dict:
        refs = params.get("evidence_refs")
        if not isinstance(refs, list):
            return err("BAD_REQUEST", "evidence_refs must be a list")
        verified = recall_evidence(self.node.cas, refs)
        return ok({"evidence": verified}, evidence_refs=[e["ref"] for e in verified])

    def _verb_pin(self, params: dict) -> dict:
        r = self.node.rpc("pin", params)
        return ok(r, evidence_refs=[r["digest"]])

    def _verb_challenge(self, params: dict) -> dict:
        # self_poq is NOT accepted here — judgment is replay-hash equality (G2).
        r = self.node.rpc("challenge", params)
        return ok(r)

    def _verb_seal(self, params: dict) -> dict:
        r = self.node.rpc("seal", params)
        return ok(r, ring_hash=r["ring_hash"])

    def _verb_propose(self, params: dict) -> dict:
        r = self.node.rpc("propose", params)
        return ok(r)

    def _verb_ballot(self, params: dict) -> dict:
        r = self.node.rpc("ballot", params)
        return ok(r)

    def _verb_health(self, params: dict) -> dict:
        return ok(self.node.rpc("health", params))

    # -- the wear loop ------------------------------------------------------
    def _verb_turn(self, params: dict) -> dict:
        text = str(params.get("text", ""))
        faculty = params.get("faculty", DEFAULT_FACULTY)
        inputs = params.get("inputs") or {"tx": {"text": text}}
        evidence_refs = params.get("evidence_refs") or []
        intent = params.get("intent", "seal")

        # 1. identity head (a cite anchor for this turn).
        head = self.node.ledger.head_state()

        # 2. recall + re-verify evidence (raises EvidenceError -> EVIDENCE_MISSING).
        recalled = recall_evidence(self.node.cas, evidence_refs)

        # 3. run ONLY a live-registry faculty via DummyMind (raises
        #    InertFacultyError -> INERT_FACULTY for authored/inert code).
        faculty_output = run_faculty(self.node.registry, faculty, inputs, {})

        # 4. advisory self_poq metadata — never enters judgment.
        candidate = {"text": text, "faculty": faculty, "output": faculty_output}
        poq = self_poq(candidate)

        # 5. optional LLM draft: a STRING in the payload, never code.
        draft = self.backend.complete(text) if self.llm_active else None

        body = {
            "author": self.identity,
            "text": text,
            "faculty": faculty,
            "faculty_output": faculty_output,
            "self_poq": poq,            # metadata only
            "evidence_refs": [e["ref"] for e in recalled],
            "identity_head": head["head_hash"],
            "draft": draft,             # None unless LLM gated on
            "mind": getattr(self.backend, "name", "?"),
        }

        if intent == "propose":
            proposal = params["proposal"]
            r = self.node.rpc("propose", {"proposal": proposal})
            return ok({"intent": "propose", "self_poq": poq, **r},
                      evidence_refs=body["evidence_refs"])

        ring_type = params.get("ring_type", "experience")
        sealed = self.node.rpc("seal", {"ring_type": ring_type, "body": body})
        return ok({"intent": "seal", "self_poq": poq,
                   "faculty_output": faculty_output, "mind": body["mind"],
                   "height": sealed["height"]},
                  ring_hash=sealed["ring_hash"],
                  evidence_refs=body["evidence_refs"])

    # -- Continuum (task chain + identity pointer, G8) ----------------------
    def _verb_task_open(self, params: dict) -> dict:
        task_id = str(params["task_id"])
        goal = str(params["goal"])
        if task_id in self.tasks:
            return err("BAD_REQUEST", f"task {task_id!r} already open")
        # A separate task chain — identity != continuum, pointers only (G8).
        task_chain = Timechain(build_ring0(self.node.kernel))
        task_head = task_chain.seal("task_head", {"task_id": task_id, "goal": goal},
                                    author=self.identity, slot=0)
        self.tasks[task_id] = task_chain
        # On the identity ledger: a POINTER ring only, no task dump.
        pointer = self.node.rpc("seal", {"ring_type": "task_head", "body": {
            "task_id": task_id, "pointer": True,
            "task_genesis": task_chain.hash_at(0),
            "task_head": ring_hash(task_head),
        }})
        return ok({"task_id": task_id, "task_head": ring_hash(task_head),
                   "task_height": task_chain.height},
                  ring_hash=pointer["ring_hash"])

    def _verb_task_resume(self, params: dict) -> dict:
        task_id = str(params["task_id"])
        note = str(params["note"])
        chain = self.tasks.get(task_id)
        if chain is None:
            return err("NOT_FOUND", f"no open task {task_id!r}")
        ring = chain.seal("experience", {"task_id": task_id, "note": note},
                          author=self.identity, slot=chain.height + 1)
        # Identity chain is untouched — task work never splices into identity.
        return ok({"task_id": task_id, "task_head": ring_hash(ring),
                   "task_height": chain.height})

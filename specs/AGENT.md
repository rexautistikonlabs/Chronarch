# AGENT.md — The Agent Runtime (Phase 5)

AI agents are the primary builders on Chronarch. This spec is the interface
they build through: a machine protocol, a closed tool surface, a DummyMind
wear loop, and an optional LLM behind a gate. The agent **wears** the
kernel — it boots a node and drives it through the frozen machinery. It does
not replace the node and it holds no power the node does not.

Status: v0 draft. Phase 5 optimizes the *interface*, never consensus. No
frozen kernel file changes.

> Chronos is blood, not conscience. Plots prove space. CAS stores memory.
> Agents cite rings. Judgment is not for sale.

---

## 1. Wear vs node

| | Node (Phase 3) | Agent (Phase 5) |
|---|---|---|
| Is | A consensus process: boot, gossip, slot loop, RPC | A builder that wears a node and takes turns on it |
| Owns | The ledger, CAS, faculty registry, gossip | A mind (DummyMind, optionally an LLM) + the wear loop |
| Can | Seal rings, propose, ballot, challenge, publish health | The same — via the node — plus recall + Continuum tasks |
| Cannot | Activate authored code, edit history, override | Exactly the same limits; wearing adds no power |

The agent never reimplements consensus. Every mutation routes through the
node's RPC, which routes through admission / Council / Timechain / challenge
— the frozen kernel.

## 2. Machine protocol

Every agent-facing call is JSON in, JSON out, with one envelope:

```json
{"ok": true, "error_code": null, "result": {…}, "ring_hash": "…", "evidence_refs": ["…"]}
```

- `ok` — the only field a caller must branch on first.
- `error_code` — present iff `ok` is false; drawn from the closed set below.
- `result` — verb-specific payload (or `{"detail": "…"}` on error).
- `ring_hash` — set when the call sealed a ring.
- `evidence_refs` — CAS hashes the call verified or produced.

No prose-only APIs: an agent can drive the whole surface from the envelope.

### Error codes (closed set)

| `error_code` | Meaning |
|---|---|
| `BAD_REQUEST` | params were not a JSON object, or a required field was missing |
| `UNKNOWN_VERB` | the verb is not in the tool surface |
| `FORBIDDEN_TOOL` | a forbidden verb was requested (see §3) |
| `EVIDENCE_MISSING` | an `evidence_ref` was absent or failed hash re-verify |
| `INERT_FACULTY` | tried to run a non-live-registry faculty (G3/G4) |
| `SCHEMA_REJECTED` | a ring/body failed the codec / K18 schema screen |
| `ADMISSION_REJECTED` | a tx was rejected at the admission chokepoint |
| `COUNCIL_REJECTED` | a proposal/ballot was rejected by the Council machine |
| `LLM_DISABLED` | the LLM path was requested while the gate is off |
| `NOT_FOUND` | identity or task not found |
| `INTERNAL` | an unexpected error — reported, never hidden |

## 3. Closed tool surface

`packages/chronarch-agent/tools.json` ships OpenAI-style function schemas
for exactly these verbs:

`init`, `recall`, `pin`, `challenge`, `seal`, `propose`, `ballot`,
`health`, `turn`, `task_open`, `task_resume`.

**Forbidden — these tools do not exist**, and requesting one returns
`FORBIDDEN_TOOL`:

- `activate_faculty` — authored code is inert; activation is M3, Proposal +
  Ballot only (G4/G14).
- `execute_upgrade` — there is no upgrade bypass (G17).
- `edit_ring` — history is append-only; correction is a new ring or a scar
  (G1/G5).
- `helm_override` — there is no helm key (G17).

A test pins the tool set to exactly the allowed verbs and asserts none of
the forbidden names is present.

## 4. The wear loop (`turn`, DummyMind default)

1. **Load identity head** — the ledger head, an anchor the turn cites.
2. **Recall + re-verify evidence** — each `evidence_ref` is fetched from CAS
   and re-hashed; a miss or mismatch is `EVIDENCE_MISSING`. No "trust the
   prompt".
3. **Run a live faculty via DummyMind** — only live-registry faculty ids
   execute (`run_faculty`); an authored/inert faculty is `INERT_FACULTY`.
4. **Attach advisory `self_poq`** — 6 ints in 0..255, deterministic from the
   candidate. It is **metadata**: it never enters `Challenge.pass` (the
   judgment signature takes no such parameter, G2/G10) and never weights the
   lottery.
5. **Admit → seal or propose** — the body (with `evidence_refs`, `self_poq`,
   the faculty output, and any LLM draft string) is sealed as a ring, or a
   proposal is submitted to the Council. Authored faculty stays inert; a
   major change still needs Proposal + Ballot.

DummyMind is **required** and runs with zero LLM and zero API keys (G11/K16).

## 5. The LLM gate

An optional backend implements one method:

```
complete(prompt: str) -> str
```

It is active only when **both** hold: `CHRONARCH_LLM=1` in the environment
**and** a backend instance is injected. Otherwise the mind is DummyMind.

The LLM's output is a **draft string** placed in a CAS object / ring
payload. It is never:

- live code (there is no `eval` of model text anywhere);
- an upgrade (upgrades are Proposal + Ballot);
- a Challenge verdict (judgment is replay-hash equality; the signature takes
  no backend).

With the gate off, `turn` still produces deterministic DummyMind output, so
the whole suite passes with no keys.

## 6. Continuum for long jobs (G8)

`task_open` creates a **separate task chain** and seals a *pointer* ring on
the identity chain (task id + task genesis/head hash). `task_resume` appends
progress to the task chain. Task work never splices into identity — the
identity chain stays a pointer, not a task dump.

## 7. What an agent must not do

- Activate authored code, or run any faculty not live in the registry.
- Edit or delete a ring or a scar.
- Pass `self_poq`, Chronos, stake, or salience into a Challenge or a Ballot.
- Enact a major change — it may only *propose*; the Council decides (G14).
- Treat an LLM draft as code, an upgrade, or a verdict.
- Point the Immune Gym at anything but Chronarch targets (G12).

## 8. CLI

```
chronarch agent turn   --json '{"text":"…","evidence_refs":["…"]}'
chronarch agent health --json '{"slot":32}'
chronarch agent recall --json '{"evidence_refs":["…"]}'
```

Always JSON out (the envelope). The CLI never injects an LLM — the mind is
DummyMind; the optional backend is a library-injection path, not a flag.

---

Lineage: cognition primitives follow the Cyberphysics / Cypher Tempre
lineage ([ATTRIBUTION.md](ATTRIBUTION.md), K17). The agent is a *wearer* of
those primitives, not a new mind spliced into consensus.

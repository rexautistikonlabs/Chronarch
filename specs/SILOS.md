# SILOS.md — Silos, Hats, and the Black-Hat Prevention Modality

Agents build artifacts in **silos**, prove them through a three-**hat**
pipeline, and only then propose a release — which the **Council** ratifies
if the artifact is authored code. There is no `Chronarch.release()` and no
silo auto-release.

> Black-hat is a prevention catalog, not an actor. Agents cannot convey
> agents. Major change is a proposal ring plus a slashing-backed vote (G14).

---

## 1. Silos

Four silos, all holding **inert** artifacts (nothing in a silo runs):

| Silo | Holds |
|---|---|
| `silo.codex` | candidate faculties / code artifacts (inert) |
| `silo.antihacker` | prevention cases and the black-hat modality's outputs |
| `silo.llm` | LLM drafts — exposed to everything outside as **opaque hashes** only (S5) |
| `silo.commons` | shared inert artifacts |

`silo.llm` is special: a draft placed there is never handed out as content
and this runtime never forwards it into another agent's prompt. `silo_list`
on `silo.llm` returns hashes only.

Verbs: `silo_open`, `silo_put` (artifact stored inert, K18-screened),
`silo_list`.

## 2. The hat pipeline

Release is earned by three independent hats, **all against Chronarch
fixtures only** (G12). A foreign target is refused before anything loads
(`GYM_TARGET_FOREIGN`, S7).

| Hat | Checks | On |
|---|---|---|
| **White** | schema / tests / K18, and rejects tool-call-shaped artifacts | the artifact |
| **Red** | Immune-Gym cases must be detected | an **isolated** fixture (a fresh booted node, never the agent's own ledger) |
| **Black** | the prevention-catalog modality only (§3) | the same fixtures |

`hat_run` records a pass per `(artifact_id, role)`. Targets are exactly
`fixture`, `sim`, `testnet` (mapped to the Chronarch gym target classes);
anything else is foreign.

## 3. The black-hat prevention modality

`prevention_catalog_modality` (kind: modality; silo: `silo.antihacker`).
Black-hat is a **restricted prevention modality, not an agent role**. It
exposes exactly three operations and *nothing else* — the forbidden
capabilities are unrepresentable, because the class holds no reference to any
agent, ledger, hearth, council, socket, or peer, and has no method that could
send, seal, ballot, activate, or move Chronos. It has no inbox and no outbox.

**Allowed (closed list):**

1. `list_attack_classes` — known Chronarch Immune-Gym attack_class ids.
2. `propose_case` — a NEW catalog case as **inert text + oracle**, against a
   Chronarch fixture only. Never an executable payload.
3. `score_fixture_run` — score a fixture run: `pass` | `fail`.

**Forbidden (unrepresentable):** messaging other agents (no whisper/convey/
peer injection); targeting the live ledger, mainnet peers, or foreign hosts;
producing executable payloads; activating faculties, sealing rings, casting
ballots, moving Chronos; holding Hearth, sitting on Council, winning slots;
reading `silo.llm` drafts except as opaque hashes. It runs only when it is
live in the hat toolset **and** the caller is `hat_run(role="black")` **and**
the target is a Chronarch fixture/sim/testnet (S6/S7/G12).

## 4. Release

`propose_release(artifact_id)`:

- requires **white + red + black** passes, else `HATS_INCOMPLETE` (S8);
- submits a **Proposal** (M3 for authored faculty activation);
- the faculty stays **inert until the Council votes** (G14). `propose_release`
  never activates anything, and there is no `release_now`.

## 5. Why it is built this way

- **No black-hat agent.** An attacker role that can act is a weapon; a
  prevention catalog that can only enumerate, propose inert cases, and score
  is instrumentation. G12 keeps even that pointed only at Chronarch's own
  fixtures.
- **No peer conveyance.** Agents that can instruct each other are a
  prompt-injection substrate. The only inter-agent channel is a sealed ring
  another agent *chooses* to recall — pull, never push, and every pull is
  hash-verified and tool-call-fenced.
- **No silo auto-release.** Authored code reaching the protocol path is a
  major change; the hats gather evidence, the Council decides (G14).

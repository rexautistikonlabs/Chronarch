/** Session JSON → SceneState. Fail-closed parsing of pasted lab output.
 *
 * Accepted shapes:
 *   1. a session envelope  {schema: "chronarch.session/1", steps: [{cmd, output, home?}], focus_home?}
 *      (what web/fixtures/*.json are: literal `python -m chronarch_cli` outputs, in order)
 *   2. one CLI envelope     {ok: true, result: {...}}  from `memory`, `pulse`, `net status`, `home inspect`
 *   3. one bare result      {identity, height, head_hash, ...}
 * Anything else is a SessionError — the scene never guesses.
 */
export type Credits = Record<string, number>;

export interface Proposal {
  proposal_id: string;
  major_class: string;
  outcome: string; // "approved" | "rejected" | "open" | ...
  ratified: boolean;
  yes_seats?: number;
  eligible_seats?: number;
  slashes?: number;
}

export interface SceneState {
  identity: string;
  height: number;
  head_hash: string;
  ring_count: number;
  scar_count: number;
  pins_ok: boolean;
  i3: unknown | null; // an I3 RestrictionState when the pin lane faulted
  peer_count: number;
  peers_ok: boolean | null;
  won_slots: number | null;
  credits_by_reason: Credits;
  seats: string[];
  proposal: Proposal | null;
  converged: boolean | null;
  attested: boolean; // a compute receipt paid the COMPUTE share
}

export interface SessionStep {
  cmd: string;
  home?: string;
  output: { ok: boolean; error_code?: string; result?: unknown };
}

export interface Session {
  label: string;
  focus_home: string | null;
  steps: SessionStep[];
  state: SceneState;
  status: { status: string; not_a_public_blockchain: boolean; lab: string } | null;
}

export class SessionError extends Error {}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, name: string): number => {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0) throw new SessionError(`${name} must be a non-negative integer`);
  return v;
};
const str = (v: unknown, name: string): string => {
  if (typeof v !== "string" || !v) throw new SessionError(`${name} must be a non-empty string`);
  return v;
};

export function emptyState(): SceneState {
  return {
    identity: "—", height: 0, head_hash: "", ring_count: 0, scar_count: 0, pins_ok: true, i3: null,
    peer_count: 0, peers_ok: null, won_slots: null, credits_by_reason: {}, seats: [], proposal: null,
    converged: null, attested: false,
  };
}

/** A `memory` / `pulse` / `home inspect` / `net status` home entry → partial state. */
function stateFromResult(r: Obj, base: SceneState): SceneState {
  const s: SceneState = { ...base };
  if ("identity" in r) s.identity = str(r.identity, "identity");
  if ("height" in r) s.height = num(r.height, "height");
  if ("head_hash" in r) {
    const h = str(r.head_hash, "head_hash");
    if (!/^[0-9a-f]{64}$/.test(h)) throw new SessionError("head_hash must be 64 hex chars");
    s.head_hash = h;
  }
  if ("ring_count" in r) s.ring_count = num(r.ring_count, "ring_count");
  else if ("height" in r) s.ring_count = s.height + 1; // Ring 0 counts
  if ("scar_count" in r) s.scar_count = num(r.scar_count, "scar_count");
  if ("pins_ok" in r) {
    if (typeof r.pins_ok !== "boolean") throw new SessionError("pins_ok must be boolean");
    s.pins_ok = r.pins_ok;
  }
  if ("i3" in r) s.i3 = r.i3 ?? null;
  if ("peer_count" in r) s.peer_count = num(r.peer_count, "peer_count");
  if ("peers_ok" in r && typeof r.peers_ok === "boolean") s.peers_ok = r.peers_ok;
  if ("won_slots" in r) s.won_slots = num(r.won_slots, "won_slots");
  if ("credits_by_reason" in r) {
    if (!isObj(r.credits_by_reason)) throw new SessionError("credits_by_reason must be an object");
    const c: Credits = {};
    for (const [k, v] of Object.entries(r.credits_by_reason)) c[k] = num(v, `credits_by_reason.${k}`);
    s.credits_by_reason = c;
    s.attested = (c.compute ?? 0) > 0;
  }
  if (s.ring_count < s.height + 1 && s.ring_count !== 0) throw new SessionError("ring_count is below height + 1");
  if (s.peer_count === 0) s.peer_count = 1; // a home always counts itself
  return s;
}

function envelopeResult(o: Obj): Obj | null {
  if (typeof o.ok === "boolean" && "result" in o) {
    if (!o.ok) throw new SessionError(`CLI output was not ok: ${String(o.error_code ?? "error")}`);
    if (!isObj(o.result)) throw new SessionError("result is not an object");
    return o.result;
  }
  return null;
}

function applyStep(step: SessionStep, focus: string | null, state: SceneState): SceneState {
  const r = envelopeResult(step.output as Obj);
  if (!r) return state;
  const cmd = step.cmd;
  const forFocus = focus === null || step.home === undefined || step.home === focus;
  if (/\b(memory|pulse|home inspect)\b/.test(cmd) && forFocus) return stateFromResult(r, state);
  if (/\bnet status\b/.test(cmd) && Array.isArray(r.homes)) {
    const home = (r.homes as Obj[]).find((h) => h.home === focus) ?? (r.homes as Obj[])[0];
    return home ? stateFromResult(home, state) : state;
  }
  if (/\bnet\b/.test(cmd) && Array.isArray(r.homes) && typeof r.converged === "boolean") {
    const s = { ...state, converged: r.converged };
    const home = (r.homes as Obj[])[0];
    if (home && (focus === null || focus === "A" || step.home === undefined)) return stateFromResult(home, s);
    return s;
  }
  if (/\bcouncil status\b/.test(cmd) && forFocus) {
    const s = { ...state };
    if (Array.isArray(r.seats)) s.seats = (r.seats as unknown[]).map((x) => String(x));
    if (Array.isArray(r.proposals) && (r.proposals as Obj[])[0]) {
      const p = (r.proposals as Obj[])[0]!;
      s.proposal = {
        proposal_id: str(p.proposal_id, "proposal_id"),
        major_class: String(p.major_class ?? ""),
        outcome: String(p.outcome ?? p.status ?? "open"),
        ratified: p.needs_ratify === false && String(p.outcome ?? "") === "approved",
        ...(state.proposal ?? {}),
      };
      s.proposal.outcome = String(p.outcome ?? p.status ?? s.proposal.outcome);
    }
    return s;
  }
  if (/\bcouncil tally\b/.test(cmd) && forFocus) {
    return {
      ...state,
      proposal: {
        proposal_id: str(r.proposal_id, "proposal_id"),
        major_class: state.proposal?.major_class ?? "M6",
        outcome: String(r.outcome ?? "open"),
        ratified: r.ratified === true,
        yes_seats: typeof r.yes_seats === "number" ? r.yes_seats : undefined,
        eligible_seats: typeof r.eligible_seats === "number" ? r.eligible_seats : undefined,
        slashes: typeof r.slashes === "number" ? r.slashes : undefined,
      },
    };
  }
  if (/\bpeers propose\b/.test(cmd) && forFocus) {
    return {
      ...state,
      proposal: {
        proposal_id: str(r.proposal_id, "proposal_id"),
        major_class: String(r.major_class ?? "M6"),
        outcome: "open",
        ratified: false,
      },
    };
  }
  return state;
}

export function parseSession(text: string): Session {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new SessionError(`not JSON: ${(e as Error).message}`);
  }
  return sessionFromJson(data);
}

export function sessionFromJson(data: unknown): Session {
  if (!isObj(data)) throw new SessionError("session must be a JSON object");
  // 1. envelope
  if (Array.isArray(data.steps)) {
    if (data.schema !== undefined && data.schema !== "chronarch.session/1") throw new SessionError(`unknown schema ${String(data.schema)}`);
    const focus = typeof data.focus_home === "string" ? data.focus_home : null;
    const steps: SessionStep[] = (data.steps as unknown[]).map((s, i) => {
      if (!isObj(s) || typeof s.cmd !== "string" || !isObj(s.output)) throw new SessionError(`step ${i} needs {cmd, output}`);
      return { cmd: s.cmd, home: typeof s.home === "string" ? s.home : undefined, output: s.output as SessionStep["output"] };
    });
    let state = emptyState();
    let status: Session["status"] = null;
    for (const step of steps) {
      if (/chronarch_cli status$/.test(step.cmd) || /\bchronarch status$/.test(step.cmd)) {
        const r = envelopeResult(step.output as Obj);
        if (r && typeof r.status === "string") {
          status = { status: r.status, not_a_public_blockchain: r.not_a_public_blockchain === true, lab: String(r.lab ?? "lab-v0") };
        }
        continue;
      }
      state = applyStep(step, focus, state);
    }
    if (!state.head_hash) throw new SessionError("session carries no head_hash for the focus home");
    if (state.seats.length === 0) state.seats = [`seat:${state.identity}`];
    return { label: typeof data.label === "string" ? data.label : "session", focus_home: focus, steps, state, status };
  }
  // 2. one CLI envelope, or 3. a bare result
  const result = envelopeResult(data) ?? data;
  if (Array.isArray(result.homes)) {
    const home = (result.homes as Obj[])[0];
    if (!home) throw new SessionError("no homes in output");
    const state = stateFromResult(home, emptyState());
    if (typeof result.converged === "boolean") state.converged = result.converged;
    return finish(state, "pasted net output");
  }
  if (!("head_hash" in result)) throw new SessionError("no head_hash: paste a `memory`, `pulse` or session JSON");
  return finish(stateFromResult(result, emptyState()), "pasted output");
}

function finish(state: SceneState, label: string): Session {
  if (state.seats.length === 0) state.seats = [`seat:${state.identity}`];
  return { label, focus_home: null, steps: [], state, status: null };
}

export function shortHash(h: string, n = 8): string {
  return h ? `${h.slice(0, n)}…` : "—";
}

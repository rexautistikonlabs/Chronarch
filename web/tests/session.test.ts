import { describe, expect, it } from "vitest";

import opa from "../fixtures/session-opa.json";
import solo from "../fixtures/session-solo.json";
import { findBanned } from "../src/lib/banned";
import { parseSession, SessionError, sessionFromJson } from "../src/lib/session";

describe("session fixtures (literal operator-path output)", () => {
  it("session-opa.json is the operator path: height 4, head ecdbe6b0…, 3 peers, approved peer_add", () => {
    const s = sessionFromJson(opa);
    expect(s.state.height).toBe(4);
    expect(s.state.ring_count).toBe(5);
    expect(s.state.head_hash.startsWith("ecdbe6b0")).toBe(true);
    expect(s.state.peer_count).toBe(3);
    expect(s.state.peers_ok).toBe(true);
    expect(s.state.converged).toBe(true);
    expect(s.state.seats).toEqual(["seat:net-node-0", "seat:net-node-1", "seat:net-node-2"]);
    expect(s.state.proposal).toMatchObject({ proposal_id: "peer-peer_add-net-node-2", outcome: "approved", ratified: true, major_class: "M6" });
    expect(s.state.attested).toBe(true);
    expect(s.status?.not_a_public_blockchain).toBe(true);
  });

  it("session-solo.json is one pulsed home: height 3, four rings, one seat", () => {
    const s = sessionFromJson(solo);
    expect(s.state.height).toBe(3);
    expect(s.state.ring_count).toBe(4);
    expect(s.state.scar_count).toBe(0);
    expect(s.state.peer_count).toBe(1);
    expect(s.state.proposal).toBeNull();
    expect(s.state.seats).toEqual(["seat:chronarch-pulse"]);
  });

  it("fails closed on anything that is not a lab output", () => {
    expect(() => parseSession("not json")).toThrow(SessionError);
    expect(() => parseSession("[]")).toThrow(SessionError);
    expect(() => parseSession('{"ok": false, "error_code": "BAD_HOME", "result": {}}')).toThrow(/BAD_HOME/);
    expect(() => parseSession('{"ok": true, "result": {"identity": "x", "height": -1, "head_hash": "00"}}')).toThrow(SessionError);
    expect(() => parseSession('{"ok": true, "result": {"identity": "x", "height": 1, "head_hash": "zz"}}')).toThrow(/head_hash/);
    expect(() => parseSession('{"schema": "other/9", "steps": []}')).toThrow(/schema/);
  });

  it("the fixtures contain no banned language", () => {
    expect(findBanned(JSON.stringify(opa))).toBeNull();
    expect(findBanned(JSON.stringify(solo))).toBeNull();
    expect(findBanned("a live net" + "work of nodes")).not.toBeNull();
  });
});

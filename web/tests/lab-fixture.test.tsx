import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderAt } from "./render";

describe("lab console", () => {
  it("loading a fixture changes ring_count in the readout", () => {
    renderAt("/lab");
    expect(screen.getByTestId("ring-count")).toHaveTextContent("4"); // session-solo.json
    fireEvent.click(screen.getByTestId("load-session-opa.json"));
    expect(screen.getByTestId("ring-count")).toHaveTextContent("5"); // operator path: height 4 + Ring 0
    expect(screen.getByTestId("json-viewer")).toHaveTextContent(/peer-peer_add-net-node-2/); // plain <pre>, no editor
    expect(screen.getByTestId("peer-count")).toHaveTextContent("3");
    expect(screen.getByTestId("head-hash")).toHaveTextContent(/^ecdbe6b08f/);
    fireEvent.click(screen.getByTestId("load-session-solo.json"));
    expect(screen.getByTestId("ring-count")).toHaveTextContent("4");
  });

  it("applies pasted memory JSON and refuses garbage", () => {
    renderAt("/lab");
    const input = screen.getByTestId("json-input");
    const memory = {
      ok: true,
      result: {
        identity: "pasted", height: 9, head_hash: "ab".repeat(32), ring_count: 10, scar_count: 2,
        pins_ok: true, i3: null, credits_by_reason: { space: 1, compute: 0 },
      },
    };
    fireEvent.change(input, { target: { value: JSON.stringify(memory) } });
    fireEvent.click(screen.getByTestId("apply-json"));
    expect(screen.getByTestId("apply-result")).toHaveTextContent("applied");
    expect(screen.getByTestId("ring-count")).toHaveTextContent("10");
    expect(screen.getByTestId("scar-count")).toHaveTextContent("2");

    fireEvent.change(input, { target: { value: '{"hello": "world"}' } });
    fireEvent.click(screen.getByTestId("apply-json"));
    expect(screen.getByTestId("apply-result")).toHaveTextContent(/refused/);
    expect(screen.getByTestId("ring-count")).toHaveTextContent("10"); // unchanged
  });
});

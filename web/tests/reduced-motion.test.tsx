import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { prefersReducedMotion } from "../src/lib/motion";
import { renderAt } from "./render";

describe("prefers-reduced-motion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not throw when matchMedia is missing (jsdom default)", () => {
    expect(typeof window.matchMedia).toBe("undefined");
    expect(prefersReducedMotion()).toBe(false);
    expect(() => renderAt("/")).not.toThrow();
  });

  it("reports motion off when the media query matches, and still renders every route", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("reduce"),
      media: q,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));
    expect(prefersReducedMotion()).toBe(true);
    for (const path of ["/", "/lab", "/timechain", "/council", "/hearth", "/farm", "/gym", "/consortium", "/operator"]) {
      const { unmount } = renderAt(path);
      unmount();
    }
    renderAt("/");
    expect(screen.getByTestId("motion-badge")).toHaveTextContent(/off/);
  });

  it("throws-free when matchMedia itself throws", () => {
    vi.stubGlobal("matchMedia", () => {
      throw new Error("no media");
    });
    expect(prefersReducedMotion()).toBe(false);
    expect(() => renderAt("/timechain")).not.toThrow();
  });
});

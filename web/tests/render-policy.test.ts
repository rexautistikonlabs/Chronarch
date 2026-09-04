/** The render policy: frames are drawn only while something holds the loop;
 *  200 ms after the last release it sleeps, once. Fake timers, no canvas. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { _resetRenderPolicy, hold, IDLE_MS, isAwake, subscribe, touch, TOUCH_MS } from "../src/scene/renderPolicy";

describe("render policy", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    _resetRenderPolicy();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("wakes on the first hold and sleeps 200 ms after the last release", () => {
    const seen: boolean[] = [];
    const unsub = subscribe((a) => seen.push(a));
    expect(seen).toEqual([false]);
    const r1 = hold("focus");
    const r2 = hold("bloom");
    expect(isAwake()).toBe(true);
    expect(seen).toEqual([false, true]);
    r1();
    vi.advanceTimersByTime(IDLE_MS + 50);
    expect(isAwake()).toBe(true); // bloom still holds
    r2();
    vi.advanceTimersByTime(IDLE_MS - 1);
    expect(isAwake()).toBe(true); // not yet
    vi.advanceTimersByTime(2);
    expect(isAwake()).toBe(false);
    expect(seen).toEqual([false, true, false]);
    unsub();
  });

  it("a hold during the idle window cancels the sleep, and release is idempotent", () => {
    const r = hold("iris");
    r();
    r();
    vi.advanceTimersByTime(IDLE_MS / 2);
    const r2 = hold("rings");
    vi.advanceTimersByTime(IDLE_MS * 2);
    expect(isAwake()).toBe(true);
    r2();
    vi.advanceTimersByTime(IDLE_MS + 1);
    expect(isAwake()).toBe(false);
  });

  it("touch re-arms on every call and lets go TOUCH_MS + IDLE_MS after the last one", () => {
    touch("pointer-move");
    vi.advanceTimersByTime(TOUCH_MS - 10);
    touch("pointer-move");
    vi.advanceTimersByTime(TOUCH_MS - 10);
    expect(isAwake()).toBe(true);
    vi.advanceTimersByTime(20 + IDLE_MS);
    expect(isAwake()).toBe(false);
  });

  it("the constants are what the doctrine says", () => {
    expect(IDLE_MS).toBe(200);
  });
});

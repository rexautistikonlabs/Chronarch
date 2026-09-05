/** A door never stays half-open: complete, or reset by pagehide / pageshow
 *  (BFCache included) / visibilitychange to visible. */
import { describe, expect, it, vi } from "vitest";

import { attachDoorReset, createDoorState } from "../src/lib/doorState";

describe("door state", () => {
  it("starts, completes once, and notifies subscribers", () => {
    const d = createDoorState();
    const seen: (string | null)[] = [];
    const unsub = d.subscribe((k) => seen.push(k));
    d.start("continuum");
    expect(d.isOpen()).toBe(true);
    expect(d.current()).toBe("continuum");
    expect(d.complete()).toBe("continuum");
    expect(d.isOpen()).toBe(false);
    expect(d.complete()).toBeNull();
    expect(seen).toEqual([null, "continuum", null]);
    unsub();
  });

  it("after startDoor, a pagehide + pageshow (persisted) leaves no plane and no door flag", () => {
    const d = createDoorState();
    const detach = attachDoorReset(d);
    d.start("continuum");
    expect(d.isOpen()).toBe(true);
    window.dispatchEvent(new Event("pagehide"));
    expect(d.isOpen()).toBe(false);
    d.start("continuum"); // even if something re-armed it in between…
    const show = new Event("pageshow") as Event & { persisted?: boolean };
    Object.defineProperty(show, "persisted", { value: true });
    window.dispatchEvent(show);
    expect(d.isOpen()).toBe(false); // …a shown page has no half-open door
    expect(d.current()).toBeNull();
    detach();
  });

  it("visibilitychange to visible resets; hidden does not fire the reset by itself; detach stops listening", () => {
    const d = createDoorState();
    const doc = { visibilityState: "hidden", listeners: new Map<string, () => void>(), addEventListener(t: string, l: () => void) { this.listeners.set(t, l); }, removeEventListener(t: string) { this.listeners.delete(t); } };
    const detach = attachDoorReset(d, window, doc as unknown as Document);
    d.start("chronarch");
    doc.listeners.get("visibilitychange")!();
    expect(d.isOpen()).toBe(true); // hidden: the page is going away; pagehide handles that
    doc.visibilityState = "visible";
    doc.listeners.get("visibilitychange")!();
    expect(d.isOpen()).toBe(false);
    detach();
    d.start("chronarch");
    window.dispatchEvent(new Event("pagehide"));
    expect(d.isOpen()).toBe(true); // detached
    const spy = vi.fn();
    d.subscribe(spy);
    expect(spy).toHaveBeenCalledWith("chronarch");
  });
});

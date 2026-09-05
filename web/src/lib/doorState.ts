/** Door state with a lifecycle: a door opens (the tween runs), completes, or
 *  is reset by the document going away and coming back — pagehide, pageshow
 *  (including a BFCache restore, event.persisted), visibilitychange to
 *  visible. Whatever happens to the tab, the campus never keeps a half-open
 *  door: the plane is gone and the flag is clear. Pure TypeScript; the page
 *  subscribes and React state follows. */
export type DoorKey = string;

export interface DoorState {
  start(key: DoorKey): void;
  complete(): DoorKey | null;
  reset(): void;
  current(): DoorKey | null;
  isOpen(): boolean;
  subscribe(listener: (key: DoorKey | null) => void): () => void;
}

export function createDoorState(): DoorState {
  let cur: DoorKey | null = null;
  const listeners = new Set<(key: DoorKey | null) => void>();
  const notify = () => { for (const l of listeners) l(cur); };
  return {
    start(key) { if (cur === key) return; cur = key; notify(); },
    complete() { const k = cur; if (k === null) return null; cur = null; notify(); return k; },
    reset() { if (cur === null) return; cur = null; notify(); },
    current: () => cur,
    isOpen: () => cur !== null,
    subscribe(l) { listeners.add(l); l(cur); return () => { listeners.delete(l); }; },
  };
}

/** The document events that must clear a door. Returns the detach function. */
export function attachDoorReset(door: DoorState, target: Window = window, doc: Document = document): () => void {
  const onHide = () => door.reset();
  const onShow = () => door.reset(); // persisted or not: a shown page has no half-open door
  const onVisible = () => { if (doc.visibilityState === "visible") door.reset(); };
  target.addEventListener("pagehide", onHide);
  target.addEventListener("pageshow", onShow);
  doc.addEventListener("visibilitychange", onVisible);
  return () => {
    target.removeEventListener("pagehide", onHide);
    target.removeEventListener("pageshow", onShow);
    doc.removeEventListener("visibilitychange", onVisible);
  };
}

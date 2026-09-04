/** Render policy: one ledger of "reasons to draw frames".
 *
 * frameloop is "always" while anything holds the ledger — a pointer down, a
 * pointer moving in the well, the camera focus tween, a record-switch settle,
 * the iris, a bloom spike — and goes back to "demand" (plus one final
 * invalidate) 200 ms after the last hold is released. Holds are the only way
 * the loop wakes; nothing here ticks on its own, so an idle well draws nothing.
 *
 * Pure TypeScript with no React or three imports, so the HUD (outside the
 * canvas) and the scene (inside it) share the same ledger, and it is unit
 * tested with fake timers.
 */
export const IDLE_MS = 200;
export const TOUCH_MS = 120;

export type Release = () => void;
type Listener = (awake: boolean) => void;

const holds = new Map<symbol, string>();
const listeners = new Set<Listener>();
let awake = false;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
const touches = new Map<string, ReturnType<typeof setTimeout>>();
const touchReleases = new Map<string, Release>();

function notify(next: boolean): void {
  if (awake === next) return;
  awake = next;
  for (const l of listeners) l(next);
}

/** Hold the loop awake for `reason`. Returns an idempotent release. */
export function hold(reason: string): Release {
  const key = Symbol(reason);
  holds.set(key, reason);
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  notify(true);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds.delete(key);
    if (holds.size === 0 && idleTimer === null) {
      idleTimer = setTimeout(() => {
        idleTimer = null;
        if (holds.size === 0) notify(false);
      }, IDLE_MS);
    }
  };
}

/** A short hold that re-arms on every call — for a stream of pointer moves.
 *  It releases itself TOUCH_MS after the last call; IDLE_MS follows. */
export function touch(reason: string, ms: number = TOUCH_MS): void {
  if (!touchReleases.has(reason)) touchReleases.set(reason, hold(reason));
  const prev = touches.get(reason);
  if (prev) clearTimeout(prev);
  touches.set(
    reason,
    setTimeout(() => {
      touches.delete(reason);
      touchReleases.get(reason)?.();
      touchReleases.delete(reason);
    }, ms),
  );
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener(awake);
  return () => {
    listeners.delete(listener);
  };
}

export function isAwake(): boolean {
  return awake;
}

export function activeReasons(): string[] {
  return [...holds.values()];
}

/** Test hook: drop every hold and timer. */
export function _resetRenderPolicy(): void {
  holds.clear();
  for (const t of touches.values()) clearTimeout(t);
  touches.clear();
  touchReleases.clear();
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = null;
  awake = false;
}


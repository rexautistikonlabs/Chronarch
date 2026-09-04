/** Motion law: events are one-shot, then the scene is still.
 *
 * `prefersReducedMotion()` never throws (jsdom has no matchMedia). Under
 * reduced motion there is no motion at all: every event jumps to its final
 * pose. No timeline here or anywhere in web/ repeats.
 */
import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia(QUERY).matches;
  } catch {
    return false;
  }
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => prefersReducedMotion());
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia(QUERY);
    } catch {
      return;
    }
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

/** Every GSAP timeline in the app is created through this: repeat is pinned
 *  to zero and yoyo is off, so a loop cannot be written by accident. */
export const ONE_SHOT = { repeat: 0, yoyo: false } as const;

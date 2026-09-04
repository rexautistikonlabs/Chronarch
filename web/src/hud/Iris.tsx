/** One-shot iris on a bench choice: a phosphor ring opens from the centre and
 *  fades. Once. Under reduced motion it is not drawn at all. */
import gsap from "gsap";
import { useEffect, useRef } from "react";

import { ONE_SHOT, usePrefersReducedMotion } from "../lib/motion";
import { useWell } from "../state/WellContext";

export function Iris() {
  const { eventId, eventKind } = useWell();
  const reduced = usePrefersReducedMotion();
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ring.current;
    if (!el || reduced || eventKind !== "bench" || eventId === 0) return;
    const tl = gsap.timeline({ ...ONE_SHOT });
    tl.fromTo(el, { opacity: 0.9, scale: 0.12 }, { opacity: 0, scale: 3.4, duration: 0.7, ease: "power2.out" });
    return () => {
      tl.kill();
      gsap.set(el, { opacity: 0 });
    };
  }, [eventId, eventKind, reduced]);

  return (
    <div className="iris pointer-events-none fixed inset-0 flex items-center justify-center" aria-hidden>
      <div ref={ring} className="iris-ring" style={{ opacity: 0 }} data-testid="iris" />
    </div>
  );
}

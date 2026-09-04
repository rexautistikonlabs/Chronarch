/** One-shot iris on a bench choice: a phosphor ring opens from the centre and
 *  fades. Once. It holds the render loop for its duration and invalidates on
 *  every tick so the well underneath keeps painting while it runs. Under
 *  reduced motion it is not drawn at all. */
import { invalidate } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useRef } from "react";

import { ONE_SHOT, usePrefersReducedMotion } from "../lib/motion";
import { hold } from "../scene/renderPolicy";
import { useWell } from "../state/WellContext";

export function Iris() {
  const { eventId, eventKind } = useWell();
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || eventKind !== "bench" || eventId === 0) return;
    const release = hold("iris");
    const tl = gsap.timeline({ ...ONE_SHOT, onUpdate: invalidate, onComplete: release });
    tl.fromTo(el, { opacity: 0.9, scale: 0.12 }, { opacity: 0, scale: 3.4, duration: 0.7, ease: "power2.out" });
    return () => {
      tl.kill();
      release();
      gsap.set(el, { opacity: 0 });
    };
  }, [eventId, eventKind, reduced]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[25] flex items-center justify-center" aria-hidden>
      <div ref={ref} className="iris-ring" style={{ opacity: 0 }} data-testid="iris" />
    </div>
  );
}

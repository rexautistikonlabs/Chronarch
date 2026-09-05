/** The door: one GSAP one-shot (≤ 800 ms) that reads as a door — an ivory
 *  plane rises from the volume while the camera eases at it — then the route
 *  changes. It holds the render ledger and invalidates on every tick so the
 *  campus keeps painting while the camera moves; onDone fires once. */
import { invalidate } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useRef } from "react";

import { ONE_SHOT } from "../lib/motion";
import { hold } from "../scene/renderPolicy";

export const DOOR_MS = 700;

export function DoorIris({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const release = hold("door");
    const tl = gsap.timeline({
      ...ONE_SHOT,
      onUpdate: () => {
        invalidate();
      },
      onComplete: () => {
        release();
        onDone();
      },
    });
    tl.fromTo(el, { opacity: 0, scaleY: 0.02 }, { opacity: 1, scaleY: 1, duration: DOOR_MS / 1000, ease: "power2.inOut" });
    return () => {
      tl.kill();
      release();
    };
  }, [onDone]);
  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center" aria-hidden data-testid="door-iris">
      <div ref={ref} className="h-[70vh] w-[38vw] max-w-lg border hair" style={{ opacity: 0, background: "#e8e4d8", transformOrigin: "bottom" }} />
    </div>
  );
}

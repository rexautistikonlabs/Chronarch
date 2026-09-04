/** Event energy: bloom and grain spike when something happens — a record
 *  switch, a bench choice — and decay to rest in one shot. At rest bloom
 *  sits at a faint phosphor base and grain is zero; nothing here is driven
 *  by a clock, and with no event no frame is drawn. Under reduced motion
 *  there is no spike at all. */
import { Bloom, EffectComposer, Noise } from "@react-three/postprocessing";
import { invalidate } from "@react-three/fiber";
import gsap from "gsap";
import { BlendFunction } from "postprocessing";
import { useEffect, useRef } from "react";

import { ONE_SHOT } from "../lib/motion";

export const BLOOM_REST = 0.18;

export function Energy({ eventId, reduced }: { eventId: number; reduced: boolean }) {
  const bloom = useRef<{ intensity: number } | null>(null);
  const noise = useRef<{ blendMode: { opacity: { value: number } } } | null>(null);

  useEffect(() => {
    const b = bloom.current;
    const n = noise.current;
    if (!b || !n) return;
    if (eventId === 0 || reduced) {
      b.intensity = BLOOM_REST;
      n.blendMode.opacity.value = 0;
      invalidate();
      return;
    }
    const tl = gsap.timeline({ ...ONE_SHOT, onUpdate: invalidate, onComplete: invalidate });
    tl.fromTo(b, { intensity: 1.9 }, { intensity: BLOOM_REST, duration: 1.2, ease: "power2.out" }, 0);
    tl.fromTo(n.blendMode.opacity, { value: 0.5 }, { value: 0, duration: 0.9, ease: "power2.out" }, 0);
    return () => {
      tl.kill();
    };
  }, [eventId, reduced]);

  return (
    <EffectComposer multisampling={0}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Bloom ref={bloom as any} intensity={BLOOM_REST} luminanceThreshold={0.55} luminanceSmoothing={0.2} mipmapBlur />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Noise ref={noise as any} premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0} />
    </EffectComposer>
  );
}

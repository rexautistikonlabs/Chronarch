/** Event energy: bloom and grain spike when something happens — a record
 *  switch, a bench choice — and decay to rest in one shot. The compositor is
 *  cheap: EffectComposer is mounted only while a spike is running; at rest the
 *  scene renders plainly and no frame is drawn at all. Every tick invalidates
 *  and the spike holds the loop, so the decay paints every frame. Under
 *  reduced motion there is no spike and no composer. */
import { Bloom, EffectComposer, Noise } from "@react-three/postprocessing";
import { invalidate } from "@react-three/fiber";
import gsap from "gsap";
import { BlendFunction } from "postprocessing";
import { useEffect, useRef, useState } from "react";

import { ONE_SHOT } from "../lib/motion";
import { hold } from "./renderPolicy";

export const SPIKE_MS = 1200;

export function Energy({ eventId, reduced }: { eventId: number; reduced: boolean }) {
  const [spiking, setSpiking] = useState(false);
  const bloom = useRef<{ intensity: number } | null>(null);
  const noise = useRef<{ blendMode: { opacity: { value: number } } } | null>(null);

  useEffect(() => {
    if (eventId === 0 || reduced) return;
    setSpiking(true);
  }, [eventId, reduced]);

  useEffect(() => {
    if (!spiking) return;
    const b = bloom.current;
    const n = noise.current;
    if (!b || !n) {
      setSpiking(false);
      return;
    }
    const release = hold("bloom");
    const tl = gsap.timeline({
      ...ONE_SHOT,
      onUpdate: invalidate,
      onComplete: () => {
        release();
        setSpiking(false); // unmount the composer; the next frame is a plain render
        invalidate();
      },
    });
    tl.fromTo(b, { intensity: 1.9 }, { intensity: 0, duration: SPIKE_MS / 1000, ease: "power2.out" }, 0);
    tl.fromTo(n.blendMode.opacity, { value: 0.5 }, { value: 0, duration: 0.9, ease: "power2.out" }, 0);
    return () => {
      tl.kill();
      release();
    };
  }, [spiking]);

  if (!spiking) return null;
  return (
    <EffectComposer multisampling={0}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Bloom ref={bloom as any} intensity={1.9} luminanceThreshold={0.55} luminanceSmoothing={0.2} mipmapBlur />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Noise ref={noise as any} premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.5} />
    </EffectComposer>
  );
}

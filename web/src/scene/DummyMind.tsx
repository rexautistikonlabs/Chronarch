import { invalidate } from "@react-three/fiber";
import gsap from "gsap";
import { useLayoutEffect, useRef } from "react";
import type { Group } from "three";

import { ONE_SHOT } from "../lib/motion";
import { hold } from "./renderPolicy";
import type { Pose } from "../lib/pose";

/** DummyMind: a sealed box. When a session carries an attested compute
 *  receipt the lid opens and closes once — the replay was checked — and the
 *  box is sealed again. It never idles open and never breathes. */
export function DummyMind({ pose, palette, position, reduced }: { pose: Pose; palette: { box: string; ivory: string }; position: readonly [number, number, number]; reduced: boolean }) {
  const lid = useRef<Group>(null);

  useLayoutEffect(() => {
    const g = lid.current;
    if (!g) return;
    g.rotation.x = 0;
    invalidate();
    if (reduced || !pose.mind.attested) return;
    const release = hold("lid");
    const tl = gsap.timeline({ ...ONE_SHOT, onUpdate: invalidate, onComplete: () => { release(); invalidate(); } });
    tl.to(g.rotation, { x: -0.7, duration: 0.5, ease: "power2.out" }, 0.4);
    tl.to(g.rotation, { x: 0, duration: 0.45, ease: "power2.in" }, 1.3);
    return () => {
      tl.kill();
      release();
    };
  }, [pose.seed, pose.mind.attested, reduced]);

  return (
    <group position={[position[0], position[1], position[2]]} rotation={[0, pose.mind.yaw, 0]}>
      <mesh>
        <boxGeometry args={[0.72, 0.5, 0.72]} />
        <meshStandardMaterial color={palette.box} metalness={0.2} roughness={0.75} />
      </mesh>
      <group ref={lid} position={[0, 0.25, -0.36]}>
        <mesh position={[0, 0.03, 0.36]}>
          <boxGeometry args={[0.74, 0.06, 0.74]} />
          <meshStandardMaterial color={palette.box} metalness={0.2} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.065, 0.36]}>
          <boxGeometry args={[0.5, 0.008, 0.5]} />
          <meshStandardMaterial color={palette.ivory} roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

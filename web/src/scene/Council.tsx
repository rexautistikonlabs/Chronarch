import { invalidate } from "@react-three/fiber";
import gsap from "gsap";
import { useLayoutEffect, useRef } from "react";
import type { Mesh } from "three";

import { ONE_SHOT } from "../lib/motion";
import { hold } from "./renderPolicy";
import type { Pose } from "../lib/pose";

/** Council: seats in an arc, and the proposal — a hex prism that docks at the
 *  centre ONLY when the ballot is approved and ratified. Otherwise it is parked
 *  off to the side, still. Docking is a one-shot when a ratified session loads. */
export function Council({ pose, palette, position, reduced }: { pose: Pose; palette: { seat: string; docked: string; parked: string }; position: readonly [number, number, number]; reduced: boolean }) {
  const ref = useRef<Mesh>(null);
  const { seatCount, seatYaw, docked, parkOffset } = pose.council;
  const dock: [number, number, number] = [0, 0.2, 0];
  const park: [number, number, number] = [parkOffset[0], parkOffset[1], 0.6];

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const goal = docked ? dock : park;
    if (reduced || !docked) {
      m.position.set(goal[0], goal[1], goal[2]);
      invalidate();
      return;
    }
    m.position.set(park[0], park[1], park[2]);
    const release = hold("dock");
    const tl = gsap.timeline({ ...ONE_SHOT, onUpdate: invalidate, onComplete: () => { release(); invalidate(); } });
    tl.to(m.position, { x: dock[0], y: dock[1] + 0.35, z: dock[2], duration: 0.6, ease: "power2.inOut" });
    tl.to(m.position, { y: dock[1], duration: 0.35, ease: "power3.in" });
    return () => {
      tl.kill();
      release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pose.seed, docked, reduced]);

  const arc = Math.PI * 0.9;
  return (
    <group position={[position[0], position[1], position[2]]} rotation={[0, seatYaw, 0]}>
      {Array.from({ length: seatCount }, (_, i) => {
        const a = seatCount === 1 ? Math.PI / 2 : Math.PI / 2 - arc / 2 + (i / (seatCount - 1)) * arc;
        const r = 1.15;
        return (
          <mesh key={i} position={[Math.cos(a) * r, 0.12, Math.sin(a) * r]} rotation={[0, -a + Math.PI / 2, 0]}>
            <boxGeometry args={[0.42, 0.24, 0.3]} />
            <meshStandardMaterial color={palette.seat} roughness={0.8} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.32, 6]} />
        <meshStandardMaterial color={docked ? palette.docked : "#2a323c"} roughness={0.9} />
      </mesh>
      <mesh ref={ref} position={park}>
        <cylinderGeometry args={[0.24, 0.24, 0.14, 6]} />
        <meshStandardMaterial color={docked ? palette.docked : palette.parked} metalness={0.35} roughness={0.5} />
      </mesh>
    </group>
  );
}

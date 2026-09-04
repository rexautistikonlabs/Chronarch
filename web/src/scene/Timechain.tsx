import { invalidate } from "@react-three/fiber";
import gsap from "gsap";
import { useLayoutEffect, useRef } from "react";
import type { Group } from "three";

import { ONE_SHOT } from "../lib/motion";
import type { Pose } from "../lib/pose";

/** The Timechain as stacked rings. Ring 0 (genesis) is the thick base ring;
 *  a scar is a sealed amber lesion on a ring's rim — it never goes away.
 *  On a new head_hash the rings settle once (a one-shot), then hold still. */
export function Timechain({ pose, palette, reduced }: { pose: Pose; palette: { ring: string; genesis: string; amber: string }; reduced: boolean }) {
  const refs = useRef<(Group | null)[]>([]);

  useLayoutEffect(() => {
    const groups = refs.current.filter((g): g is Group => !!g);
    if (reduced || groups.length === 0) {
      groups.forEach((g) => g.scale.setScalar(1));
      invalidate();
      return;
    }
    groups.forEach((g) => g.scale.setScalar(0.001));
    const tl = gsap.timeline({ ...ONE_SHOT, onUpdate: invalidate, onComplete: invalidate });
    groups.forEach((g, i) => {
      tl.to(g.scale, { x: 1, y: 1, z: 1, duration: 0.45, ease: "power2.out" }, i * 0.05);
    });
    return () => {
      tl.kill();
    };
  }, [pose.seed, reduced]);

  return (
    <group rotation={[pose.stackTilt[0], pose.stackYaw, pose.stackTilt[1]]}>
      {pose.rings.map((r, i) => (
        <group key={`${pose.seed}-${i}`} ref={(el) => { refs.current[i] = el; }} position={[0, r.y, 0]} rotation={[r.tilt[0], r.azimuth, r.tilt[1]]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r.radius, r.tube, 14, 72]} />
            <meshStandardMaterial color={i === 0 ? palette.genesis : palette.ring} metalness={0.55} roughness={0.42} />
          </mesh>
          {r.scarAt !== null && (
            <mesh position={[Math.cos(r.scarAt) * r.radius, 0, Math.sin(r.scarAt) * r.radius]} rotation={[0, -r.scarAt, 0]}>
              <boxGeometry args={[0.13, 0.085, 0.1]} />
              <meshStandardMaterial color={palette.amber} emissive={palette.amber} emissiveIntensity={0.25} roughness={0.7} />
            </mesh>
          )}
        </group>
      ))}
      {/* the axis the rings stack on: a still, thin spine */}
      <mesh position={[0, Math.max(0, (pose.rings.length - 1) * 0.13), 0]}>
        <cylinderGeometry args={[0.012, 0.012, Math.max(0.3, pose.rings.length * 0.26), 8]} />
        <meshStandardMaterial color="#2a323c" roughness={0.9} />
      </mesh>
    </group>
  );
}

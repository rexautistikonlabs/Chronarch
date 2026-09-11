/** The operator: one adult in a white coat, 1.72 m in a 12 m room. Idle is
 *  still — no breathing, no sway, no coat sim. A click on a piece is a walk:
 *  one GSAP one-shot along the baked path (a short turn, the leg, a short
 *  turn to face the piece), legs and arms swinging with distance walked, not
 *  with time; it holds the render ledger and invalidates on every tick, and
 *  on arrival calls back once so the page can open the door or the drawer.
 *  No per-frame hook lives here; no clock is read. The head is a small
 *  capsule with no face; the shoes are closed. */
import { invalidate } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useRef } from "react";
import * as THREE from "three";

import { ONE_SHOT } from "../lib/motion";
import { hold } from "../scene/renderPolicy";
import { FIGURE, headingOf, pathLength, propByKey, samplePath, turnTo, walkDuration, walkPath, type PropKey, type WalkRequest } from "./labLayout";
import { MAT } from "./materials";

const HIP = 0.92;
const SHOULDER = 1.42;

export function Figure({ walk, onArrive }: { walk: WalkRequest | null; onArrive: (k: PropKey) => void }) {
  const root = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const pose = useRef({ x: FIGURE.home[0], z: FIGURE.home[1], yaw: FIGURE.homeFace, stride: 0 });

  const place = () => {
    const g = root.current;
    if (!g) return;
    const p = pose.current;
    g.position.set(p.x, 0, p.z);
    g.rotation.y = p.yaw;
    if (legL.current) legL.current.rotation.x = p.stride;
    if (legR.current) legR.current.rotation.x = -p.stride;
    if (armL.current) armL.current.rotation.x = -p.stride * 0.6;
    if (armR.current) armR.current.rotation.x = p.stride * 0.6;
  };

  // Stand exactly on the first frame.
  useEffect(() => {
    place();
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One walk per request: turn, walk the leg, turn to the piece, arrive.
  useEffect(() => {
    if (!walk) return;
    const target = propByKey(walk.key);
    const path = walkPath([pose.current.x, pose.current.z], walk.key);
    const len = pathLength(path);
    const heading = len > 1e-3 ? headingOf(path[0]!, path[path.length - 1]!) : target.face;
    const s = { d: 0, yaw: pose.current.yaw };
    const release = hold("walk");
    const tl = gsap.timeline({
      ...ONE_SHOT,
      onUpdate: () => {
        const [x, z] = samplePath(path, s.d);
        const envelope = len > 1e-3 ? Math.min(1, s.d / 0.4, (len - s.d) / 0.4) : 0;
        pose.current = { x, z, yaw: s.yaw, stride: Math.sin((s.d / FIGURE.strideM) * Math.PI * 2) * FIGURE.swing * Math.max(0, envelope) };
        place();
        invalidate();
      },
      onComplete: () => {
        pose.current = { x: target.standAt[0], z: target.standAt[1], yaw: target.face, stride: 0 };
        place();
        invalidate();
        release();
        onArrive(walk.key);
      },
    });
    tl.to(s, { yaw: turnTo(s.yaw, heading), duration: FIGURE.turnS, ease: "power1.inOut" });
    if (len > 1e-3) tl.to(s, { d: len, duration: walkDuration(len), ease: "none" });
    tl.to(s, { yaw: turnTo(heading, target.face), duration: FIGURE.turnS, ease: "power1.inOut" });
    return () => {
      tl.kill();
      release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walk]);

  return (
    <group ref={root}>
      {/* legs pivot at the hip; closed shoes */}
      <group ref={legL} position={[-0.1, HIP, 0]}>
        <mesh position={[0, -0.41, 0]} material={MAT.trousers}><boxGeometry args={[0.14, 0.82, 0.16]} /></mesh>
        <mesh position={[0, -0.88, 0.04]} material={MAT.shoes}><boxGeometry args={[0.14, 0.08, 0.27]} /></mesh>
      </group>
      <group ref={legR} position={[0.1, HIP, 0]}>
        <mesh position={[0, -0.41, 0]} material={MAT.trousers}><boxGeometry args={[0.14, 0.82, 0.16]} /></mesh>
        <mesh position={[0, -0.88, 0.04]} material={MAT.shoes}><boxGeometry args={[0.14, 0.08, 0.27]} /></mesh>
      </group>
      {/* the coat: over the torso to the knee */}
      <mesh position={[0, 1.02, 0]} material={MAT.coat}><boxGeometry args={[0.42, 0.9, 0.27]} /></mesh>
      <mesh position={[0, 1.5, 0]} material={MAT.trousers}><boxGeometry args={[0.16, 0.08, 0.14]} /></mesh>
      {/* arms pivot at the shoulder, in the coat's sleeves; hands bare */}
      <group ref={armL} position={[-0.26, SHOULDER, 0]}>
        <mesh position={[0, -0.28, 0]} material={MAT.coat}><boxGeometry args={[0.1, 0.56, 0.11]} /></mesh>
        <mesh position={[0, -0.6, 0]} material={MAT.skin}><boxGeometry args={[0.08, 0.1, 0.08]} /></mesh>
      </group>
      <group ref={armR} position={[0.26, SHOULDER, 0]}>
        <mesh position={[0, -0.28, 0]} material={MAT.coat}><boxGeometry args={[0.1, 0.56, 0.11]} /></mesh>
        <mesh position={[0, -0.6, 0]} material={MAT.skin}><boxGeometry args={[0.08, 0.1, 0.08]} /></mesh>
      </group>
      {/* the head: a small capsule, no face */}
      <mesh position={[0, 1.62, 0]} material={MAT.skin}><capsuleGeometry args={[0.095, 0.07, 4, 12]} /></mesh>
    </group>
  );
}

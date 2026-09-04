import { DoubleSide } from "three";

import type { Pose } from "../lib/pose";

/** The pin lane: rods standing in a well. All rods seated = PINS_OK. A real
 *  I3 fault (withheld or tampered pin) lifts one rod out and turns it amber;
 *  nothing else in the scene is ever amber. Still — no motion. */
export function PinsWell({ pose, palette, position }: { pose: Pose; palette: { rod: string; fault: string }; position: readonly [number, number, number] }) {
  return (
    <group position={[position[0], position[1], position[2]]}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.78, 0.78, 0.5, 40, 1, true]} />
        <meshStandardMaterial color="#1a2129" roughness={0.95} side={DoubleSide} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.78, 40]} />
        <meshStandardMaterial color="#0f141a" roughness={1} />
      </mesh>
      {pose.rods.map((rod, i) => {
        const lift = rod.raised ? 0.4 : 0;
        return (
          <mesh key={i} position={[rod.x, rod.height / 2 + lift, rod.z]} rotation={[0, 0, rod.raised ? 0.08 : 0]}>
            <cylinderGeometry args={[0.035, 0.035, rod.height, 10]} />
            <meshStandardMaterial color={rod.raised ? palette.fault : palette.rod} metalness={0.4} roughness={0.5} emissive={rod.raised ? palette.fault : "#000000"} emissiveIntensity={rod.raised ? 0.3 : 0} />
          </mesh>
        );
      })}
    </group>
  );
}

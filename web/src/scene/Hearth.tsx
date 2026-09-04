import { Line } from "@react-three/drei";

import type { Pose } from "../lib/pose";

/** The Hearth as a tensegrity: two compression legs held apart by tension
 *  cables meeting at the lock (the self-bond). Prestressed = cables taut and
 *  the lock high; an unbonded home stands slack. The Hearth clamp is not
 *  rendered as a dial — it is the geometry: legs never touch. */
export function Hearth({ pose, position }: { pose: Pose; position: readonly [number, number, number] }) {
  const { legLean, legSpread, lockHeight, prestressed, cableTension } = pose.hearth;
  const legLen = 1.45;
  const baseL: [number, number, number] = [-legSpread, 0, 0];
  const baseR: [number, number, number] = [legSpread, 0, 0];
  const topL: [number, number, number] = [-legSpread - Math.sin(legLean) * legLen, Math.cos(legLean) * legLen, 0];
  const topR: [number, number, number] = [legSpread + Math.sin(legLean) * legLen, Math.cos(legLean) * legLen, 0];
  const lock: [number, number, number] = [0, lockHeight, 0];
  const cable = prestressed ? "#c9d1d9" : "#3e4852";
  const width = 1 + cableTension;

  return (
    <group position={[position[0], position[1], position[2]]}>
      {[{ base: baseL, lean: legLean }, { base: baseR, lean: -legLean }].map((leg, i) => (
        <mesh key={i} position={[leg.base[0] - Math.sin(leg.lean) * (legLen / 2), Math.cos(leg.lean) * (legLen / 2), 0]} rotation={[0, 0, leg.lean]}>
          <cylinderGeometry args={[0.045, 0.06, legLen, 10]} />
          <meshStandardMaterial color="#6f7a85" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      <Line points={[topL, lock]} color={cable} lineWidth={width} />
      <Line points={[topR, lock]} color={cable} lineWidth={width} />
      <Line points={[baseL, lock]} color={cable} lineWidth={width} />
      <Line points={[baseR, lock]} color={cable} lineWidth={width} />
      <Line points={[topL, baseR]} color={cable} lineWidth={width * 0.6} transparent opacity={0.6} />
      <Line points={[topR, baseL]} color={cable} lineWidth={width * 0.6} transparent opacity={0.6} />
      <mesh position={lock}>
        <sphereGeometry args={[prestressed ? 0.11 : 0.08, 20, 16]} />
        <meshStandardMaterial color={prestressed ? "#e8e4da" : "#5c6670"} metalness={0.3} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[legSpread + 0.15, legSpread + 0.17, 48]} />
        <meshStandardMaterial color="#2a323c" roughness={1} />
      </mesh>
    </group>
  );
}

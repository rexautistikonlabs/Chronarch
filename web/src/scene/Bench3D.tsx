/** A bench in the well: a subsystem you can hover and click. Hover = a
 *  phosphor edge box and a label; unhover = edge off. Click = select (the
 *  floor opens its card and the camera eases once). Pointer events need no
 *  frames; a hover change asks for exactly one. */
import { Edges, Html } from "@react-three/drei";
import { invalidate } from "@react-three/fiber";
import type { ReactNode } from "react";

import type { BenchKey } from "../lib/human";
import { PHOSPHOR } from "./palette";

export function Bench3D({ bench, label, size, center, hovered, onHover, onSelect, children }: {
  bench: BenchKey;
  label: string;
  size: [number, number, number];
  center: [number, number, number];
  hovered: boolean;
  onHover: (b: BenchKey | null) => void;
  onSelect: (b: BenchKey) => void;
  children: ReactNode;
}) {
  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(bench);
        document.body.style.cursor = "pointer";
        invalidate();
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = "";
        invalidate();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(bench);
      }}
    >
      {children}
      {hovered && (
        <>
          <mesh position={center}>
            <boxGeometry args={size} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            <Edges color={PHOSPHOR} scale={1.02} />
          </mesh>
          <Html position={[center[0], center[1] + size[1] / 2 + 0.35, center[2]]} center zIndexRange={[20, 10]}>
            <div className="hud-label">{label}</div>
          </Html>
        </>
      )}
    </group>
  );
}

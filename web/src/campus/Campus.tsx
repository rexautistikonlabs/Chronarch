/** The RexMetrix campus: one canvas on /, drawn on demand. A poured pad in a
 *  fence with one gate, three volumes — a lit lab block (Chronarch, running),
 *  a dark shed (Continuum, forthcoming), a windowless block (Face mapping,
 *  forthcoming, not a diagnostic). Click or hover a building: an edge and a
 *  plate light up and the docked panel opens. The camera orbits slowly under
 *  the hand and is still otherwise. No physics, no vehicle, no idle motion,
 *  no shadows, no post-processing, no texture, no environment map. This file
 *  never imports the Chronarch well. */
import { Edges, Html } from "@react-three/drei";
import { Canvas, invalidate } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { ErrorBoundary } from "../components/ErrorBoundary";
import { sphericalToPosition } from "../scene/focus";
import { subscribe } from "../scene/renderPolicy";
import { BUILDINGS, CAMPUS, campusGoal, GATE, PLATE, SIGN_LINES, type Building, type BuildingKey } from "./campusLayout";
import { CampusRig } from "./CampusRig";

// Shared materials: a handful for the whole plate.
const MAT = {
  metal: new THREE.MeshStandardMaterial({ color: CAMPUS.metal, roughness: 0.85, metalness: 0.25 }),
  metalDark: new THREE.MeshStandardMaterial({ color: CAMPUS.metalDark, roughness: 0.95, metalness: 0.15 }),
  pad: new THREE.MeshStandardMaterial({ color: CAMPUS.pad, roughness: 1 }),
  fence: new THREE.MeshStandardMaterial({ color: CAMPUS.hairline, roughness: 0.9, metalness: 0.4 }),
  window: new THREE.MeshBasicMaterial({ color: CAMPUS.phosphor }),
  ivory: new THREE.MeshStandardMaterial({ color: CAMPUS.ivory, roughness: 0.6 }),
};

/** Lit windows as one instanced mesh: two rows along the long faces. */
function Windows({ b }: { b: Building }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const [w, h, d] = b.size;
  const cols = Math.max(2, Math.floor(w / 0.9));
  const rows = 2;
  const count = cols * rows * 2;
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    let i = 0;
    for (const side of [-1, 1]) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = b.center[0] - w / 2 + (c + 0.5) * (w / cols);
          const y = 0.9 + r * (h / (rows + 0.6));
          const z = b.center[2] + side * (d / 2 + 0.01);
          o.position.set(x, y, z);
          o.rotation.set(0, side < 0 ? Math.PI : 0, 0);
          o.updateMatrix();
          m.setMatrixAt(i++, o.matrix);
        }
      }
    }
    m.instanceMatrix.needsUpdate = true;
    invalidate();
  }, [b, w, h, d, cols]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} material={MAT.window}>
      <planeGeometry args={[0.42, 0.55]} />
    </instancedMesh>
  );
}

function Volume({ b, hot, onHover, onSelect }: { b: Building; hot: boolean; onHover: (k: BuildingKey | null) => void; onSelect: (k: BuildingKey) => void }) {
  const [w, h, d] = b.size;
  const center: [number, number, number] = [b.center[0], h / 2, b.center[2]];
  return (
    <group
      onPointerOver={(e) => { e.stopPropagation(); onHover(b.key); document.body.style.cursor = "pointer"; invalidate(); }}
      onPointerOut={() => { onHover(null); document.body.style.cursor = ""; invalidate(); }}
      onClick={(e) => { e.stopPropagation(); onSelect(b.key); }}
    >
      <mesh position={center} material={b.shade === "lab" ? MAT.metal : MAT.metalDark}>
        <boxGeometry args={[w, h, d]} />
        <Edges color={hot ? CAMPUS.phosphor : CAMPUS.hairline} scale={1.001} />
      </mesh>
      {/* roof plant: one low box on the lab and the shed, none on the blank block */}
      {b.shade !== "blank" && (
        <mesh position={[b.center[0] + w * 0.25, h + 0.3, b.center[2] - d * 0.2]} material={MAT.metalDark}>
          <boxGeometry args={[w * 0.28, 0.6, d * 0.4]} />
          <Edges color={CAMPUS.hairline} />
        </mesh>
      )}
      {/* the door plate: only a running product has a door */}
      {b.route && (
        <mesh position={[b.center[0], 1.05, b.center[2] + d / 2 + 0.02]} material={MAT.ivory}>
          <planeGeometry args={[1.1, 2.1]} />
        </mesh>
      )}
      {b.windows && <Windows b={b} />}
      <Html position={[b.center[0], h + 0.95, b.center[2]]} center zIndexRange={[15, 5]}>
        <button type="button" onClick={() => onSelect(b.key)} className={`hud-label whitespace-nowrap ${hot ? "" : "opacity-80"}`} style={{ cursor: "pointer" }} data-testid={`sign-${b.key}`}>{SIGN_LINES[b.key]}</button>
      </Html>
    </group>
  );
}

function Fence() {
  const H = PLATE.half;
  const posts = useMemo(() => {
    const out: [number, number][] = [];
    for (let t = -H; t <= H; t += PLATE.postEvery) {
      out.push([t, -H], [t, H], [-H, t], [H, t]);
    }
    return out.filter(([x, z]) => !(Math.abs(z - H) < 0.01 && Math.abs(x) < GATE.width / 2 + 0.3));
  }, [H]);
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    posts.forEach(([x, z], i) => {
      o.position.set(x, PLATE.fenceHeight / 2, z);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    invalidate();
  }, [posts]);
  const rail = (args: [number, number, number], pos: [number, number, number]) => (
    <mesh position={pos} material={MAT.fence}>
      <boxGeometry args={args} />
    </mesh>
  );
  const gateGap = GATE.width / 2;
  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, posts.length]} material={MAT.fence}>
        <boxGeometry args={[0.08, PLATE.fenceHeight, 0.08]} />
      </instancedMesh>
      {rail([2 * H, 0.03, 0.03], [0, PLATE.fenceHeight, -H])}
      {rail([0.03, 0.03, 2 * H], [-H, PLATE.fenceHeight, 0])}
      {rail([0.03, 0.03, 2 * H], [H, PLATE.fenceHeight, 0])}
      {rail([H - gateGap, 0.03, 0.03], [-(H + gateGap) / 2, PLATE.fenceHeight, H])}
      {rail([H - gateGap, 0.03, 0.03], [(H + gateGap) / 2, PLATE.fenceHeight, H])}
      {/* the gate: two posts, a lintel, one plate */}
      <mesh position={[-gateGap, GATE.height / 2, H]} material={MAT.metal}><boxGeometry args={[0.25, GATE.height, 0.25]} /></mesh>
      <mesh position={[gateGap, GATE.height / 2, H]} material={MAT.metal}><boxGeometry args={[0.25, GATE.height, 0.25]} /></mesh>
      <mesh position={[0, GATE.height, H]} material={MAT.metal}><boxGeometry args={[GATE.width + 0.5, 0.3, 0.3]} /></mesh>
      <Html position={[0, GATE.height + 0.55, H]} center zIndexRange={[15, 5]}>
        <div className="hud-label whitespace-nowrap" data-testid="gate-label">{GATE.label}</div>
      </Html>
    </group>
  );
}

export function webglAvailable(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function Campus({ selected, onSelect }: { selected: BuildingKey | null; onSelect: (k: BuildingKey | null) => void }) {
  const [hovered, setHovered] = useState<BuildingKey | null>(null);
  const initialCamera = useRef({ position: sphericalToPosition(campusGoal(null)), fov: 32, near: 0.1, far: 120 });
  // The loop mode IS the Canvas prop and follows the ledger (see Well.tsx).
  const [loop, setLoop] = useState<"always" | "demand">("demand");
  useEffect(
    () =>
      subscribe((awake) => {
        setLoop(awake ? "always" : "demand");
        if (!awake) invalidate();
      }),
    [],
  );
  useEffect(() => () => { document.body.style.cursor = ""; }, []);

  return (
    <div className="fixed inset-0 bg-void" data-testid="campus-viewport" data-loop={loop} data-selected={selected ?? ""}>
      <ErrorBoundary name="campus" className="absolute inset-0 flex items-center justify-center">
        <Canvas frameloop={loop} dpr={[1, 1.5]} shadows={false} camera={initialCamera.current} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }} onPointerMissed={() => onSelect(null)}>
          <color attach="background" args={[CAMPUS.background]} />
          <fog attach="fog" args={[CAMPUS.background, 22, 70]} />
          <ambientLight intensity={0.5} />
          <hemisphereLight args={["#3a4a3f", CAMPUS.background, 0.55]} />
          <directionalLight position={[10, 14, 6]} intensity={1.3} />
          <directionalLight position={[-8, 6, -6]} intensity={0.3} color={CAMPUS.phosphor} />
          {/* the pad and its grid */}
          <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={MAT.pad}>
            <planeGeometry args={[PLATE.half * 2 + 2, PLATE.half * 2 + 2]} />
          </mesh>
          <gridHelper args={[PLATE.half * 2, PLATE.half * 2, CAMPUS.grid, CAMPUS.grid]} position={[0, 0.002, 0]} />
          <Fence />
          {BUILDINGS.map((b) => (
            <Volume key={b.key} b={b} hot={hovered === b.key || selected === b.key} onHover={setHovered} onSelect={(k) => onSelect(k)} />
          ))}
          <CampusRig selected={selected} />
        </Canvas>
      </ErrorBoundary>
    </div>
  );
}

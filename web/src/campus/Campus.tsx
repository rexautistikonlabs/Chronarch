/** The RexMetrix campus: one fixed canvas behind the story, drawn on demand.
 *  A poured pad in a fence with one gate, three volumes — a lit lab block
 *  (Chronarch, running), a dark shed (Continuum, forthcoming), a windowless
 *  block (Face mapping, forthcoming, not a diagnostic). Scroll drives the
 *  camera (see CampusRig); a building lights its edge on hover; clicking
 *  Chronarch is a door, clicking the others scrolls to their chapter. Lit for
 *  a screenshot: hemisphere plus a dim key, lifted faces, emissive windows —
 *  no bloom composer, no neon. No physics, no idle motion, no shadows, no
 *  texture, no environment map. This file never imports the Chronarch well. */
import { Edges, Html } from "@react-three/drei";
import { Canvas, invalidate } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";

import { ErrorBoundary } from "../components/ErrorBoundary";
import { sphericalToPosition } from "../scene/focus";
import { subscribe } from "../scene/renderPolicy";
import { BUILDINGS, GATE, PLATE, SIGN_LINES, storyGoal, type Building, type BuildingKey } from "./campusLayout";
import { CampusRig } from "./CampusRig";
import { CAMPUS, MAT } from "./materials";

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
          o.position.set(b.center[0] - w / 2 + (c + 0.5) * (w / cols), 0.9 + r * (h / (rows + 0.6)), b.center[2] + side * (d / 2 + 0.01));
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

function Volume({ b, hot, onHover, onPick }: { b: Building; hot: boolean; onHover: (k: BuildingKey | null) => void; onPick: (k: BuildingKey) => void }) {
  const [w, h, d] = b.size;
  const center: [number, number, number] = [b.center[0], h / 2, b.center[2]];
  const edge = b.route ? (hot ? CAMPUS.phosphorEdge : CAMPUS.phosphor) : hot ? CAMPUS.phosphor : CAMPUS.hairlineLit;
  return (
    <group
      onPointerOver={(e) => { e.stopPropagation(); onHover(b.key); document.body.style.cursor = "pointer"; invalidate(); }}
      onPointerOut={() => { onHover(null); document.body.style.cursor = ""; invalidate(); }}
      onClick={(e) => { e.stopPropagation(); onPick(b.key); }}
    >
      <mesh position={center} material={MAT[b.shade]}>
        <boxGeometry args={[w, h, d]} />
        <Edges color={edge} scale={1.001} />
      </mesh>
      {b.shade !== "blank" && (
        <mesh position={[b.center[0] + w * 0.25, h + 0.3, b.center[2] - d * 0.2]} material={MAT.plant}>
          <boxGeometry args={[w * 0.28, 0.6, d * 0.4]} />
          <Edges color={CAMPUS.hairlineLit} />
        </mesh>
      )}
      {b.route && (
        <mesh position={[b.center[0], 1.05, b.center[2] + d / 2 + 0.02]} material={MAT.door}>
          <planeGeometry args={[1.1, 2.1]} />
        </mesh>
      )}
      {b.windows && <Windows b={b} />}
      <Html position={[b.center[0], h + 0.95, b.center[2]]} center zIndexRange={[15, 5]}>
        <button type="button" onClick={() => onPick(b.key)} className={`hud-label whitespace-nowrap ${hot ? "" : "opacity-80"}`} style={{ cursor: "pointer" }} data-testid={`sign-${b.key}`}>{SIGN_LINES[b.key]}</button>
      </Html>
    </group>
  );
}

function Fence() {
  const H = PLATE.half;
  const posts = useMemo(() => {
    const out: [number, number][] = [];
    for (let t = -H; t <= H; t += PLATE.postEvery) out.push([t, -H], [t, H], [-H, t], [H, t]);
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
    <mesh position={pos} material={MAT.fence}><boxGeometry args={args} /></mesh>
  );
  const g = GATE.width / 2;
  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, posts.length]} material={MAT.fence}>
        <boxGeometry args={[0.08, PLATE.fenceHeight, 0.08]} />
      </instancedMesh>
      {rail([2 * H, 0.03, 0.03], [0, PLATE.fenceHeight, -H])}
      {rail([0.03, 0.03, 2 * H], [-H, PLATE.fenceHeight, 0])}
      {rail([0.03, 0.03, 2 * H], [H, PLATE.fenceHeight, 0])}
      {rail([H - g, 0.03, 0.03], [-(H + g) / 2, PLATE.fenceHeight, H])}
      {rail([H - g, 0.03, 0.03], [(H + g) / 2, PLATE.fenceHeight, H])}
      <mesh position={[-g, GATE.height / 2, H]} material={MAT.plant}><boxGeometry args={[0.25, GATE.height, 0.25]} /></mesh>
      <mesh position={[g, GATE.height / 2, H]} material={MAT.plant}><boxGeometry args={[0.25, GATE.height, 0.25]} /></mesh>
      <mesh position={[0, GATE.height, H]} material={MAT.plant}><boxGeometry args={[GATE.width + 0.5, 0.3, 0.3]} /></mesh>
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

export function Campus({ progress, onPick }: { progress: RefObject<number>; onPick: (k: BuildingKey) => void }) {
  const [hovered, setHovered] = useState<BuildingKey | null>(null);
  const initialCamera = useRef({ position: sphericalToPosition(storyGoal(0)), fov: 30, near: 0.1, far: 120 });
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
    <div className="fixed inset-0 bg-void" data-testid="campus-viewport" data-loop={loop}>
      <ErrorBoundary name="campus" className="absolute inset-0 flex items-center justify-center">
        <Canvas frameloop={loop} dpr={[1, 1.5]} shadows={false} camera={initialCamera.current} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}>
          <color attach="background" args={[CAMPUS.background]} />
          <fog attach="fog" args={[CAMPUS.background, 30, 80]} />
          {/* hemisphere + a dim ivory key from the hero camera's side + a faint phosphor fill: faces and edges read on #0b0d0c without a composer */}
          <hemisphereLight args={["#8a9a8f", "#161a18", 1.7]} />
          <directionalLight position={[9, 14, 20]} intensity={1.45} color="#e8e4d8" />
          <directionalLight position={[-16, 7, 6]} intensity={0.55} color={CAMPUS.phosphor} />
          <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={MAT.pad}>
            <planeGeometry args={[PLATE.half * 2 + 2, PLATE.half * 2 + 2]} />
          </mesh>
          <gridHelper args={[PLATE.half * 2, PLATE.half * 2, CAMPUS.grid, CAMPUS.grid]} position={[0, 0.002, 0]} />
          <Fence />
          {BUILDINGS.map((b) => (
            <Volume key={b.key} b={b} hot={hovered === b.key} onHover={setHovered} onPick={onPick} />
          ))}
          <CampusRig progress={progress} />
        </Canvas>
      </ErrorBoundary>
    </div>
  );
}

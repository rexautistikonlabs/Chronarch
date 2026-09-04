import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";

import { ErrorBoundary } from "../components/ErrorBoundary";
import { usePrefersReducedMotion } from "../lib/motion";
import { derivePose, posePalette } from "../lib/pose";
import type { SceneState } from "../lib/session";
import { CameraRig } from "./CameraRig";
import { Council } from "./Council";
import { DummyMind } from "./DummyMind";
import { cameraGoal, LAYOUT, type FocusKey } from "./focus";
import { Hearth } from "./Hearth";
import { PinsWell } from "./PinsWell";
import { Timechain } from "./Timechain";

export function webglAvailable(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** The instrument's viewport. frameloop="demand": a frame is drawn only when
 *  something changed (a one-shot event, a hand orbit, a resize). Idle = still. */
export function Viewport({ state, focus = "overview", className = "" }: { state: SceneState; focus?: FocusKey; className?: string }) {
  const reduced = usePrefersReducedMotion();
  const pose = useMemo(() => derivePose(state), [state]);
  const palette = useMemo(() => posePalette(state), [state]);
  const ok = useMemo(() => webglAvailable(), []);
  const start = cameraGoal(focus, pose);

  if (!ok) {
    return (
      <div className={`relative flex items-center justify-center border hair bg-ink ${className}`} data-testid="viewport-fallback" data-focus={focus} role="img" aria-label="Scene unavailable: WebGL is not available in this browser">
        <div className="max-w-sm p-6 text-sm text-mute">
          <p className="readout text-xs uppercase tracking-wider text-dim">viewport</p>
          <p className="mt-2">WebGL is not available here, so the instrument draws nothing. Its readouts are still true; the scene would show <span className="readout text-ivory">{pose.rings.length}</span> stacked rings with <span className="readout text-ivory">{state.scar_count}</span> scar{state.scar_count === 1 ? "" : "s"} and {state.pins_ok ? "every rod seated" : "one rod raised"}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative border hair bg-void ${className}`} data-testid="viewport" data-seed={pose.seed} data-focus={focus} data-reduced-motion={reduced ? "true" : "false"}>
      <ErrorBoundary name="scene" className="absolute inset-0 flex items-center justify-center">
      <Canvas frameloop="demand" dpr={[1, 2]} camera={{ position: start.position, fov: 34, near: 0.1, far: 100 }} gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={["#07090C"]} />
        <fog attach="fog" args={["#07090C", 14, 26]} />
        <ambientLight intensity={0.5} />
        <hemisphereLight args={["#3a4658", "#07090C", 0.55]} />
        <directionalLight position={[4, 7, 3]} intensity={1.5} />
        <directionalLight position={[-5, 3, -4]} intensity={0.35} />
        <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[7.5, 72]} />
          <meshStandardMaterial color="#0b0f14" roughness={1} />
        </mesh>
        <gridHelper args={[16, 32, "#141b23", "#0f141a"]} position={[0, -0.015, 0]} />

        <Timechain pose={pose} palette={palette} reduced={reduced} />
        <PinsWell pose={pose} palette={palette} position={LAYOUT.farm} />
        <Hearth pose={pose} position={LAYOUT.hearth} />
        <Council pose={pose} palette={palette} position={LAYOUT.council} reduced={reduced} />
        <DummyMind pose={pose} palette={palette} position={LAYOUT.mind} reduced={reduced} />

        <OrbitControls makeDefault enableDamping={false} enablePan={false} minDistance={2.5} maxDistance={18} maxPolarAngle={Math.PI / 2 - 0.05} target={start.target} />
        <CameraRig focus={focus} pose={pose} reduced={reduced} />
      </Canvas>
      </ErrorBoundary>
      <div className="pointer-events-none absolute bottom-2 left-3 readout text-[10px] uppercase tracking-wider text-dim">
        seed {pose.seed.slice(0, 8)} · {reduced ? "motion off (reduced)" : "one-shot events · still at rest"}
      </div>
    </div>
  );
}

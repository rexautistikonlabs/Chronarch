/** The well: one fixed, full-viewport canvas behind everything. The scene
 *  is the same instrument as before (rings, scars, rods, tensegrity, seats,
 *  sealed box); what changed is how it is met — hover a bench for its edge
 *  and label, click to select — and that the camera is pointer-live.
 *  frameloop="demand": with no pointer and no event, no frame is drawn. */
import { Canvas, invalidate } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";

import { ErrorBoundary } from "../components/ErrorBoundary";
import { BENCHES } from "../lib/human";
import { usePrefersReducedMotion } from "../lib/motion";
import { derivePose, posePalette } from "../lib/pose";
import { useSession } from "../state/SessionContext";
import { useWell } from "../state/WellContext";
import { Bench3D } from "./Bench3D";
import { Council } from "./Council";
import { DummyMind } from "./DummyMind";
import { Energy } from "./Energy";
import { cameraGoal, LAYOUT } from "./focus";
import { Hearth } from "./Hearth";
import { VOID } from "./palette";
import { PinsWell } from "./PinsWell";
import { PointerRig } from "./PointerRig";
import { subscribe } from "./renderPolicy";
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

const title = (key: string) => BENCHES.find((b) => b.key === key)?.title ?? key;

export function Well() {
  const { session } = useSession();
  const { focus, hovered, setHovered, selectBench, eventId } = useWell();
  const state = session.state;
  const reduced = usePrefersReducedMotion();
  const pose = useMemo(() => derivePose(state), [state]);
  const palette = useMemo(() => posePalette(state), [state]);
  const ok = useMemo(() => webglAvailable(), []);
  // The camera prop is applied by R3F whenever it changes; keep it stable so a
  // HUD re-render (hover, card open) never snaps the camera or touches the gl.
  const initialCamera = useRef({ position: cameraGoal(focus, pose).position, fov: 34, near: 0.1, far: 100 });
  // The loop mode IS the Canvas prop. R3F re-applies `frameloop` on every
  // render, so a runtime setFrameloop() would be undone by the next HUD
  // re-render; letting the prop follow the ledger keeps prop and store agreed.
  // Awake → "always" (GSAP ticks and damping paint every frame); asleep →
  // "demand" plus one final invalidate so the last state is painted.
  const [loop, setLoop] = useState<"always" | "demand">("demand");
  useEffect(
    () =>
      subscribe((awake) => {
        setLoop(awake ? "always" : "demand");
        if (!awake) invalidate();
      }),
    [],
  );
  const ringsH = Math.max(0.6, pose.rings.length * 0.26);

  if (!ok) {
    return (
      <div className="fixed inset-0 bg-void" data-testid="viewport-fallback" data-focus={focus} role="img" aria-label="Scene unavailable: WebGL is not available in this browser">
        <div className="absolute bottom-24 left-6 max-w-sm text-sm text-mute">
          <p className="hud-label inline-block">well · no webgl</p>
          <p className="mt-2">The well cannot draw here. Its readouts are still true; it would show <span className="readout text-ivory">{pose.rings.length}</span> stacked rings with <span className="readout text-ivory">{state.scar_count}</span> scar{state.scar_count === 1 ? "" : "s"} and {state.pins_ok ? "every rod seated" : "one rod raised"}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-void" data-testid="viewport" data-seed={pose.seed} data-focus={focus} data-loop={loop} data-reduced-motion={reduced ? "true" : "false"}>
      <ErrorBoundary name="scene" className="absolute inset-0 flex items-center justify-center">
        <Canvas frameloop={loop} dpr={[1, 1.5]} shadows={false} camera={initialCamera.current} gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}>
          <color attach="background" args={[VOID]} />
          <fog attach="fog" args={[VOID, 13, 27]} />
          <ambientLight intensity={0.45} />
          <hemisphereLight args={["#2f4a3f", VOID, 0.6]} />
          <directionalLight position={[4, 7, 3]} intensity={1.5} />
          <directionalLight position={[-5, 3, -4]} intensity={0.35} color="#9ef0b4" />
          <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[7.5, 72]} />
            <meshStandardMaterial color="#0b0f14" roughness={1} />
          </mesh>
          <gridHelper args={[16, 32, "#12211a", "#0d1511"]} position={[0, -0.015, 0]} />

          <Bench3D bench="memory" label={title("memory")} size={[2.8, ringsH + 0.3, 2.8]} center={[0, ringsH / 2, 0]} hovered={hovered === "memory"} onHover={setHovered} onSelect={selectBench}>
            <Timechain pose={pose} palette={palette} reduced={reduced} />
          </Bench3D>
          <Bench3D bench="body" label={title("body")} size={[1.9, 1.3, 1.9]} center={[LAYOUT.farm[0], 0.55, LAYOUT.farm[2]]} hovered={hovered === "body"} onHover={setHovered} onSelect={selectBench}>
            <PinsWell pose={pose} palette={palette} position={LAYOUT.farm} />
          </Bench3D>
          <Bench3D bench="vote" label={title("vote")} size={[3.0, 0.9, 2.6]} center={[LAYOUT.council[0], 0.35, LAYOUT.council[2]]} hovered={hovered === "vote"} onHover={setHovered} onSelect={selectBench}>
            <Council pose={pose} palette={palette} position={LAYOUT.council} reduced={reduced} />
          </Bench3D>
          <Bench3D bench="pulse" label={title("pulse")} size={[1.1, 0.9, 1.1]} center={[LAYOUT.mind[0], LAYOUT.mind[1] + 0.05, LAYOUT.mind[2]]} hovered={hovered === "pulse"} onHover={setHovered} onSelect={selectBench}>
            <DummyMind pose={pose} palette={palette} position={LAYOUT.mind} reduced={reduced} />
          </Bench3D>
          {/* the Hearth belongs to the Body bench too: hovering either shows the body edge */}
          <Bench3D bench="body" label={title("body")} size={[3.2, 1.9, 1.4]} center={[LAYOUT.hearth[0], 0.85, LAYOUT.hearth[2]]} hovered={false} onHover={setHovered} onSelect={selectBench}>
            <Hearth pose={pose} position={LAYOUT.hearth} />
          </Bench3D>

          <Energy eventId={eventId} reduced={reduced} />
          <PointerRig focus={focus} pose={pose} reduced={reduced} />
        </Canvas>
      </ErrorBoundary>
      <div className="scanlines pointer-events-none absolute inset-0" aria-hidden />
    </div>
  );
}

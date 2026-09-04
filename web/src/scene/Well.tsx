/** The well: one fixed, full-viewport canvas behind everything. A visitor
 *  sees the catalogue graph — fields, bridges, the loaded programme's subgraph,
 *  the synthesis child. A technician sees the substrate's instrument — rings,
 *  scars, rods, tensegrity, seats, sealed box. Same canvas, never remounted;
 *  frameloop follows the render policy: with no pointer and no event, no frame
 *  is drawn. */
import { Canvas, invalidate } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";

import { ErrorBoundary } from "../components/ErrorBoundary";
import { usePrefersReducedMotion } from "../lib/motion";
import { derivePose, posePalette } from "../lib/pose";
import { useProgramme } from "../state/ProgrammeContext";
import { useSession } from "../state/SessionContext";
import { useWell } from "../state/WellContext";
import { Catalogue3D } from "./Catalogue3D";
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

export function Well() {
  const { session } = useSession();
  const { catalogue, programme, child, childVerdict, counts } = useProgramme();
  const { focus, hovered, setHovered, selectBench, eventId, isTech } = useWell();
  const state = session.state;
  const reduced = usePrefersReducedMotion();
  const pose = useMemo(() => derivePose(state), [state]);
  const palette = useMemo(() => posePalette(state), [state]);
  const ok = useMemo(() => webglAvailable(), []);
  // The camera prop is applied by R3F whenever it changes; keep it stable so a
  // HUD re-render (hover, card open) never snaps the camera or touches the gl.
  const initialCamera = useRef({ position: cameraGoal(focus, pose).position, fov: 34, near: 0.1, far: 100 });
  // The loop mode IS the Canvas prop (R3F re-applies `frameloop` on every
  // render, so the prop must follow the ledger). Awake → "always"; asleep →
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

  if (!ok) {
    return (
      <div className="fixed inset-0 bg-void" data-testid="viewport-fallback" data-focus={focus} data-programme={programme.id} role="img" aria-label="Scene unavailable: WebGL is not available in this browser">
        <div className="absolute bottom-24 left-6 max-w-sm text-sm text-mute">
          <p className="hud-label inline-block">well · no webgl</p>
          <p className="mt-2">
            The well cannot draw here. Its readouts are still true; it would show <span className="readout text-ivory">{counts.field_count}</span> fields and <span className="readout text-ivory">{counts.bridge_count}</span> bridge{counts.bridge_count === 1 ? "" : "s"} of the loaded programme on a ring, with the synthesis child above.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-void" data-testid="viewport" data-seed={pose.seed} data-focus={focus} data-loop={loop} data-programme={programme.id} data-reduced-motion={reduced ? "true" : "false"}>
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

          {isTech ? (
            <>
              <Timechain pose={pose} palette={palette} reduced={reduced} />
              <PinsWell pose={pose} palette={palette} position={LAYOUT.farm} />
              <Council pose={pose} palette={palette} position={LAYOUT.council} reduced={reduced} />
              <DummyMind pose={pose} palette={palette} position={LAYOUT.mind} reduced={reduced} />
              <Hearth pose={pose} position={LAYOUT.hearth} />
            </>
          ) : (
            <Catalogue3D cat={catalogue} programme={programme} child={child} childOk={childVerdict.ok} hovered={hovered} onHover={setHovered} onSelect={selectBench} reduced={reduced} />
          )}

          <Energy eventId={eventId} reduced={reduced} />
          <PointerRig focus={focus} pose={pose} reduced={reduced} />
        </Canvas>
      </ErrorBoundary>
      <div className="scanlines pointer-events-none absolute inset-0" aria-hidden />
    </div>
  );
}

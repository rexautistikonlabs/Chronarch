/** The RexMetrix instrument lab: one indoor room behind the first screen,
 *  drawn on demand. Dark resin floor with tape zones, three walls and a
 *  glass front the camera stands outside, a cable tray, two luminaires. On
 *  the floor: the Chronarch bench with its large display (a baked still —
 *  never a live iframe), the Continuum console with a sectional schematic on
 *  glass (baked), the Laterion kinematics bench under its cover with the
 *  isolator off, the spec board on the wall, the lab book and pack on a side
 *  bench, and one operator. Every piece is a hotspot with a sentence and a
 *  job; a piece lights its edge on hover; a click makes the operator walk
 *  there, and the page opens the door or the drawer when she arrives. No
 *  physics, no idle motion, no shadows, no environment map, no image file,
 *  no glassware. This file never imports the Chronarch well. */
import { Edges, Html } from "@react-three/drei";
import { Canvas, invalidate } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";

import { ErrorBoundary } from "../components/ErrorBoundary";
import { sphericalToPosition } from "../scene/focus";
import { subscribe } from "../scene/renderPolicy";
import { bake, drawChronarchDisplay, drawContinuumGlass, drawSpecBoard, drawTag, type Draw } from "./baked";
import { Figure } from "./Figure";
import { HERO_FOV, HERO_VIEW, HOTSPOT_ORDER, PROPS, propByKey, ROOM, tapeExtent, type Prop, type PropKey, type WalkRequest } from "./labLayout";
import { LabRig } from "./LabRig";
import { LAB, MAT } from "./materials";

type V3 = [number, number, number];

/** A plane carrying a baked still; a flat material where no 2D context exists. */
function Baked({ draw, px, size, position, glow, transparent = false }: { draw: Draw; px: [number, number]; size: [number, number]; position: V3; glow: number; transparent?: boolean }) {
  const [pw, ph] = px;
  const tex = useMemo(() => bake(pw, ph, draw), [draw, pw, ph]);
  useEffect(() => {
    invalidate();
    return () => { tex?.dispose(); };
  }, [tex]);
  if (!tex) {
    return (
      <mesh position={position} material={glow > 0.3 ? MAT.screen : MAT.paper}>
        <planeGeometry args={size} />
      </mesh>
    );
  }
  return (
    <mesh position={position}>
      <planeGeometry args={size} />
      <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={glow} color="#ffffff" roughness={0.5} transparent={transparent} />
    </mesh>
  );
}

/** An equipment tag on the piece: the id, one line. */
function Tag({ id, line, position }: { id: string; line: string; position: V3 }) {
  const draw = useMemo(() => drawTag(id, line), [id, line]);
  return <Baked draw={draw} px={[256, 88]} size={[0.32, 0.11]} position={position} glow={0.08} />;
}

/** Floor tape on three sides of a footprint: the working zone in front of a
 *  piece; the side bars run from the front line back to the wall behind. */
function Tape({ w, front, back }: { w: number; front: number; back: number }) {
  const t = 0.05;
  const len = front + back;
  const mid = (front - back) / 2;
  return (
    <group position={[0, 0.003, 0]}>
      <mesh position={[0, 0, front]} material={MAT.tape}><boxGeometry args={[w, 0.004, t]} /></mesh>
      <mesh position={[-w / 2, 0, mid]} material={MAT.tape}><boxGeometry args={[t, 0.004, len]} /></mesh>
      <mesh position={[w / 2, 0, mid]} material={MAT.tape}><boxGeometry args={[t, 0.004, len]} /></mesh>
    </group>
  );
}

function Room() {
  const { w, d, h } = ROOM;
  const seams = useMemo(() => {
    const out: { axis: "x" | "z"; at: number }[] = [];
    for (let x = -w / 2 + 2; x < w / 2 - 0.5; x += 2) out.push({ axis: "x", at: x });
    for (let z = -d / 2 + 2; z < d / 2 - 0.5; z += 2) out.push({ axis: "z", at: z });
    return out;
  }, [w, d]);
  const benches = [propByKey("chronarch").at[0], propByKey("continuum").at[0]];
  return (
    <group>
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={MAT.floor}>
        <planeGeometry args={[w + 0.4, d + 0.4]} />
      </mesh>
      {seams.map((s) => (
        <mesh key={`${s.axis}${s.at}`} position={s.axis === "x" ? [s.at, 0.001, 0] : [0, 0.001, s.at]} material={MAT.floorSeam}>
          <boxGeometry args={s.axis === "x" ? [0.02, 0.004, d] : [w, 0.004, 0.02]} />
        </mesh>
      ))}
      {/* three walls with a dado; the front is glass */}
      <mesh position={[0, h / 2, -d / 2]} material={MAT.wall}><boxGeometry args={[w + 0.12, h, 0.12]} /></mesh>
      <mesh position={[-w / 2, h / 2, 0]} material={MAT.wall}><boxGeometry args={[0.12, h, d]} /></mesh>
      <mesh position={[w / 2, h / 2, 0]} material={MAT.wall}><boxGeometry args={[0.12, h, d]} /></mesh>
      <mesh position={[0, 0.45, -d / 2 + 0.07]} material={MAT.dado}><boxGeometry args={[w, 0.9, 0.02]} /></mesh>
      <mesh position={[-w / 2 + 0.07, 0.45, 0]} material={MAT.dado}><boxGeometry args={[0.02, 0.9, d]} /></mesh>
      <mesh position={[w / 2 - 0.07, 0.45, 0]} material={MAT.dado}><boxGeometry args={[0.02, 0.9, d]} /></mesh>
      {/* the cable tray along the back wall, with a drop to each bench */}
      <mesh position={[0, 2.5, -d / 2 + 0.2]} material={MAT.frame}><boxGeometry args={[w - 0.6, 0.08, 0.22]} /></mesh>
      {benches.map((x) => (
        <mesh key={x} position={[x, 1.7, -d / 2 + 0.1]} material={MAT.frame}><boxGeometry args={[0.04, 1.6, 0.04]} /></mesh>
      ))}
      {/* two luminaires on rods over the benches: task light, switched on */}
      {benches.map((x) => (
        <group key={x} position={[x, 0, -2.75]}>
          <mesh position={[0, 2.64, 0]} material={MAT.frame}><boxGeometry args={[2.6, 0.06, 0.2]} /></mesh>
          <mesh position={[0, 2.605, 0]} material={MAT.luminaire}><boxGeometry args={[2.5, 0.02, 0.14]} /></mesh>
          {[-1.0, 1.0].map((r) => (
            <mesh key={r} position={[r, (2.67 + h) / 2, 0]} material={MAT.frame}><boxGeometry args={[0.02, h - 2.67, 0.02]} /></mesh>
          ))}
        </group>
      ))}
      {/* the shop window: two corner posts and a sill, one faint pane that takes no pointer; no head beam across the view */}
      <mesh position={[0, h / 2, d / 2]} material={MAT.glass} raycast={() => null}><planeGeometry args={[w, h]} /></mesh>
      {[-w / 2, w / 2].map((x) => (
        <mesh key={x} position={[x, h / 2, d / 2]} material={MAT.frame}><boxGeometry args={[0.06, h, 0.06]} /></mesh>
      ))}
      <mesh position={[0, 0.03, d / 2]} material={MAT.frame}><boxGeometry args={[w + 0.06, 0.06, 0.08]} /></mesh>
    </group>
  );
}

/** The Chronarch bench: a laminate top on two pedestals, the large display on
 *  its arm, a keyboard, a bench meter; the display is a baked still. */
function ChronarchBench({ edge }: { edge: string }) {
  return (
    <>
      <mesh position={[0, 0.9, 0]} material={MAT.benchTop}><boxGeometry args={[3.0, 0.06, 0.8]} /><Edges color={edge} scale={1.002} /></mesh>
      <mesh position={[0, 0.82, 0]} material={MAT.benchFront}><boxGeometry args={[3.0, 0.1, 0.76]} /></mesh>
      {[-1.1, 1.1].map((x) => (
        <mesh key={x} position={[x, 0.42, -0.02]} material={MAT.benchFront}><boxGeometry args={[0.6, 0.76, 0.7]} /></mesh>
      ))}
      <mesh position={[0.2, 1.1, -0.3]} material={MAT.frame}><boxGeometry args={[0.1, 0.34, 0.08]} /></mesh>
      <mesh position={[0.2, 1.6, -0.3]} material={MAT.bezel}><boxGeometry args={[1.72, 1.02, 0.05]} /></mesh>
      <Baked draw={drawChronarchDisplay} px={[1024, 600]} size={[1.62, 0.92]} position={[0.2, 1.6, -0.272]} glow={0.9} />
      <mesh position={[0.2, 0.945, 0.12]} material={MAT.bezel}><boxGeometry args={[0.5, 0.02, 0.17]} /></mesh>
      <mesh position={[-1.1, 1.06, -0.12]} material={MAT.frame}><boxGeometry args={[0.5, 0.26, 0.38]} /></mesh>
      <mesh position={[-1.1, 1.1, 0.075]} material={MAT.screen}><planeGeometry args={[0.28, 0.1]} /></mesh>
      <Tag id="RX-01" line="CHRONARCH BENCH" position={[1.25, 0.7, 0.335]} />
    </>
  );
}

/** The Continuum console: a standing console with a sloped top and keypad;
 *  the sectional schematic sits on a glass pane in a thin frame. */
function ContinuumConsole({ edge }: { edge: string }) {
  return (
    <>
      <mesh position={[0, 0.42, -0.02]} material={MAT.benchFront}><boxGeometry args={[2.0, 0.84, 0.7]} /><Edges color={edge} scale={1.002} /></mesh>
      <mesh position={[0, 0.9, 0.07]} rotation={[-0.22, 0, 0]} material={MAT.benchTop}><boxGeometry args={[2.0, 0.05, 0.56]} /></mesh>
      <mesh position={[0, 0.965, 0.12]} rotation={[-0.22, 0, 0]} material={MAT.bezel}><boxGeometry args={[0.7, 0.02, 0.22]} /></mesh>
      {[-0.62, 0.62].map((x) => (
        <mesh key={x} position={[x, 1.0, -0.3]} material={MAT.frame}><boxGeometry args={[0.04, 0.3, 0.04]} /></mesh>
      ))}
      <mesh position={[0, 2.09, -0.3]} material={MAT.frame}><boxGeometry args={[1.52, 0.05, 0.04]} /></mesh>
      <mesh position={[0, 1.13, -0.3]} material={MAT.frame}><boxGeometry args={[1.52, 0.05, 0.04]} /></mesh>
      {[-0.735, 0.735].map((x) => (
        <mesh key={x} position={[x, 1.61, -0.3]} material={MAT.frame}><boxGeometry args={[0.05, 1.0, 0.04]} /></mesh>
      ))}
      <Baked draw={drawContinuumGlass} px={[1024, 600]} size={[1.42, 0.86]} position={[0, 1.61, -0.3]} glow={0.7} transparent />
      <Tag id="RX-02" line="CONTINUUM CONSOLE" position={[0.75, 0.62, 0.34]} />
    </>
  );
}

/** The Laterion bench: trestle legs and a stretcher under a dust cover that
 *  hides the rail and whatever sits on it; the isolator is off and unlit.
 *  No camera, no optics, nothing that looks usable. */
function LaterionBench({ edge }: { edge: string }) {
  return (
    <>
      {[-1.15, 1.15].map((x) => (
        <mesh key={x} position={[x, 0.3, 0]} material={MAT.frame}><boxGeometry args={[0.1, 0.6, 0.7]} /></mesh>
      ))}
      <mesh position={[0, 0.06, 0]} material={MAT.frame}><boxGeometry args={[2.5, 0.04, 0.08]} /></mesh>
      <mesh position={[0, 1.02, 0]} material={MAT.shroud}><boxGeometry args={[2.9, 0.86, 0.96]} /><Edges color={edge} scale={1.002} /></mesh>
      <mesh position={[0, 1.47, 0]} material={MAT.shroud}><boxGeometry args={[2.5, 0.06, 0.7]} /></mesh>
      <mesh position={[1.2, 0.72, 0.49]} material={MAT.bezel}><boxGeometry args={[0.22, 0.14, 0.03]} /></mesh>
      <mesh position={[1.2, 0.72, 0.51]} material={MAT.dead}><boxGeometry args={[0.05, 0.05, 0.01]} /></mesh>
      <Tag id="RX-03" line="COVERED · NOT IN SERVICE" position={[-0.95, 0.85, 0.49]} />
    </>
  );
}

/** The spec board on the back wall, between the benches: the legal text on an ivory sheet in a frame. */
function SpecBoard({ edge }: { edge: string }) {
  return (
    <>
      <mesh position={[0, 1.65, 0]} material={MAT.frame}><boxGeometry args={[1.66, 1.16, 0.04]} /><Edges color={edge} scale={1.002} /></mesh>
      <Baked draw={drawSpecBoard} px={[1024, 700]} size={[1.56, 1.06]} position={[0, 1.65, 0.025]} glow={0.1} />
      <Tag id="RX-04" line="SPEC BOARD" position={[0.6, 0.98, -0.03]} />
    </>
  );
}

/** The side bench with the lab book, closed, and the pack box. */
function LabBook({ edge }: { edge: string }) {
  return (
    <>
      <mesh position={[0, 0.86, 0]} material={MAT.benchTop}><boxGeometry args={[1.3, 0.05, 0.6]} /><Edges color={edge} scale={1.002} /></mesh>
      {[-0.58, 0.58].map((x) => (
        <mesh key={x} position={[x, 0.42, 0]} material={MAT.frame}><boxGeometry args={[0.05, 0.84, 0.55]} /></mesh>
      ))}
      <mesh position={[0, 0.7, 0]} material={MAT.benchFront}><boxGeometry args={[1.2, 0.03, 0.5]} /></mesh>
      <group position={[-0.25, 0.905, 0.05]} rotation={[0, 0.12, 0]}>
        <mesh material={MAT.bezel}><boxGeometry args={[0.3, 0.036, 0.22]} /></mesh>
        <mesh position={[0.012, 0, 0]} material={MAT.paper}><boxGeometry args={[0.29, 0.03, 0.21]} /></mesh>
      </group>
      <mesh position={[0.3, 1.0, -0.05]} material={MAT.frame}><boxGeometry args={[0.36, 0.28, 0.3]} /></mesh>
      <mesh position={[0.3, 1.02, 0.101]} material={MAT.paper}><planeGeometry args={[0.2, 0.12]} /></mesh>
      <Tag id="RX-05" line="LAB BOOK · PACK" position={[0.58, 0.55, 0.28]} />
    </>
  );
}

const PIECES: Record<PropKey, (edge: string) => ReactNode> = {
  chronarch: (edge) => <ChronarchBench edge={edge} />,
  continuum: (edge) => <ContinuumConsole edge={edge} />,
  laterion: (edge) => <LaterionBench edge={edge} />,
  specboard: (edge) => <SpecBoard edge={edge} />,
  labbook: (edge) => <LabBook edge={edge} />,
};
const SIGN_Y: Record<PropKey, number> = { chronarch: 2.3, continuum: 2.35, laterion: 1.9, specboard: 2.45, labbook: 1.5 };

/** A piece on the floor: its geometry in local metres (front = local +z),
 *  its tape zone, its HTML hotspot; edges light on hover. */
function Piece({ p, hot, onHover, onPick }: { p: Prop; hot: boolean; onHover: (k: PropKey | null) => void; onPick: (k: PropKey) => void }) {
  const edge = p.door ? (hot ? LAB.phosphorEdge : LAB.phosphor) : hot ? LAB.phosphor : LAB.hairlineLit;
  return (
    <group
      position={[p.at[0], 0, p.at[1]]}
      rotation={[0, p.yaw, 0]}
      onPointerOver={(e) => { e.stopPropagation(); onHover(p.key); }}
      onPointerOut={() => onHover(null)}
      onClick={(e) => { e.stopPropagation(); onPick(p.key); }}
    >
      {PIECES[p.key](edge)}
      {p.kind !== "board" && <Tape {...tapeExtent(p)} />}
      <Html position={[0, SIGN_Y[p.key], 0]} center zIndexRange={[15, 5]}>
        <button type="button" onClick={() => onPick(p.key)} className={`hud-label whitespace-nowrap ${hot ? "" : "opacity-80"}`} style={{ cursor: "pointer" }} data-testid={`sign-${p.key}`}>{p.sign}</button>
      </Html>
    </group>
  );
}

/** Whether this browser can draw the lab. Probed once per page — a probe
 *  context is created, its answer kept, and the context released at once —
 *  never once per render: live WebGL contexts are a scarce browser resource,
 *  and leaking one per re-render would eventually lose the lab's own. */
let webgl: boolean | null = null;
export function webglAvailable(): boolean {
  if (webgl !== null) return webgl;
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") ?? c.getContext("webgl")) as WebGLRenderingContext | null;
    webgl = gl !== null;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl = false;
  }
  return webgl;
}

export function Lab({ walk, door, onPick, onHover, onArrive }: { walk: WalkRequest | null; door: RefObject<PropKey | null>; onPick: (k: PropKey) => void; onHover: (k: PropKey | null) => void; onArrive: (k: PropKey) => void }) {
  const [hovered, setHovered] = useState<PropKey | null>(null);
  const initialCamera = useRef({ position: sphericalToPosition(HERO_VIEW), fov: HERO_FOV, near: 0.1, far: 80 });
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
  const hover = useCallback((k: PropKey | null) => {
    setHovered(k);
    onHover(k);
    document.body.style.cursor = k ? "pointer" : "";
    invalidate();
  }, [onHover]);
  useEffect(() => () => { document.body.style.cursor = ""; }, []);

  return (
    <div className="absolute inset-0 bg-void" data-testid="lab-viewport" data-loop={loop}>
      <ErrorBoundary name="lab" className="absolute inset-0 flex items-center justify-center">
        <Canvas frameloop={loop} dpr={[1, 1.5]} shadows={false} camera={initialCamera.current} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}>
          <color attach="background" args={[LAB.background]} />
          {/* the room's light: a soft sky, a key through the window, a faint cool fill, and the two luminaires over the benches */}
          <hemisphereLight args={["#a3ada6", "#141816", 1.9]} />
          <directionalLight position={[2, 9, 10]} intensity={1.15} color="#e8e4d8" />
          <directionalLight position={[-8, 4, 3]} intensity={0.35} color={LAB.phosphor} />
          {[propByKey("chronarch").at[0], propByKey("continuum").at[0]].map((x) => (
            <pointLight key={x} position={[x, 2.5, -2.75]} intensity={9} distance={7} decay={2} color="#e8e4d8" />
          ))}
          <Room />
          {HOTSPOT_ORDER.map((k) => {
            const p = PROPS.find((x) => x.key === k)!;
            return <Piece key={k} p={p} hot={hovered === k} onHover={hover} onPick={onPick} />;
          })}
          <Figure walk={walk} onArrive={onArrive} />
          <LabRig door={door} />
        </Canvas>
      </ErrorBoundary>
    </div>
  );
}

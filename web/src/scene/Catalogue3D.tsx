/** The visitor's well: the catalogue as a graph. Field nodes stand on a ring
 *  of discs; a bridge is a phosphor line between exactly two nodes — a bridge
 *  outside the loaded programme is dim, one inside it is bright; the synthesis
 *  child is a small prism above the centre with lines down to its parents along
 *  its declared path. Where a node sits on the ring is seeded from the
 *  programme id through the same hash PRNG; nothing here moves on its own.
 *  Switching programmes settles the highlighted subgraph once, then still. */
import { Line } from "@react-three/drei";
import { invalidate } from "@react-three/fiber";
import gsap from "gsap";
import { useLayoutEffect, useMemo, useRef } from "react";
import type { Group } from "three";

import type { BenchKey } from "../lib/human";
import { ONE_SHOT } from "../lib/motion";
import type { Catalogue, ChildPin, ProgrammeFile } from "../lib/programme";
import { rngFromSeed } from "../lib/prng";
import { Bench3D } from "./Bench3D";
import { GRAPH } from "./focus";
import { PHOSPHOR, PHOSPHOR_DIM, STEEL, STEEL_BRIGHT } from "./palette";
import { hold } from "./renderPolicy";

export interface GraphLayout {
  nodes: Map<string, [number, number, number]>;
  order: string[];
}

/** Node positions: every catalogue field on the ring, the order seeded. */
export function layoutCatalogue(cat: Catalogue, seed: string): GraphLayout {
  const ids = [...cat.fields.keys()].sort();
  const rng = rngFromSeed(`graph:${seed}`);
  const start = rng.range(0, Math.PI * 2);
  // seeded rotation of the ring, not a shuffle: the same field keeps the same neighbours
  const nodes = new Map<string, [number, number, number]>();
  ids.forEach((id, i) => {
    const a = start + (i / ids.length) * Math.PI * 2;
    nodes.set(id, [Math.cos(a) * GRAPH.radius, 0, Math.sin(a) * GRAPH.radius]);
  });
  return { nodes, order: ids };
}

export function Catalogue3D({ cat, programme, child, childOk, hovered, onHover, onSelect, reduced }: {
  cat: Catalogue;
  programme: ProgrammeFile;
  child: ChildPin;
  childOk: boolean;
  hovered: BenchKey | null;
  onHover: (b: BenchKey | null) => void;
  onSelect: (b: BenchKey) => void;
  reduced: boolean;
}) {
  const layout = useMemo(() => layoutCatalogue(cat, programme.id), [cat, programme.id]);
  const used = useMemo(() => ({ fields: new Set(programme.programme.fields_used), bridges: new Set(programme.programme.bridges_used) }), [programme]);
  const highlight = useRef<Group>(null);

  // Programme switch: the highlighted subgraph settles once (scale in), then still.
  useLayoutEffect(() => {
    const g = highlight.current;
    if (!g) return;
    if (reduced) {
      g.scale.setScalar(1);
      invalidate();
      return;
    }
    g.scale.setScalar(0.001);
    const release = hold("programme");
    const tl = gsap.timeline({ ...ONE_SHOT, onUpdate: invalidate, onComplete: () => { release(); invalidate(); } });
    tl.to(g.scale, { x: 1, y: 1, z: 1, duration: 0.55, ease: "power2.out" });
    return () => {
      tl.kill();
      release();
    };
  }, [programme.id, reduced]);

  const pos = (id: string) => layout.nodes.get(id) ?? [0, 0, 0];
  const childPos: [number, number, number] = [0, GRAPH.childHeight, 0];
  const childBridges = new Set(child.path ?? child.clique ?? []);

  return (
    <group>
      {/* the ring the fields stand on */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[GRAPH.radius - 0.02, GRAPH.radius + 0.02, 96]} />
        <meshStandardMaterial color="#1a2430" roughness={1} />
      </mesh>

      {/* Fields: every catalogue field is a disc; the programme's are bright */}
      <Bench3D bench="fields" label="Fields" size={[GRAPH.radius * 2 + 1.2, 0.8, GRAPH.radius * 2 + 1.2]} center={[0, 0.3, 0]} hovered={hovered === "fields"} onHover={onHover} onSelect={onSelect}>
        {layout.order.map((id) => {
          const inProg = used.fields.has(id);
          const f = cat.fields.get(id)!;
          const [x, , z] = pos(id);
          return (
            <group key={id} position={[x, 0, z]}>
              <mesh position={[0, 0.06, 0]}>
                <cylinderGeometry args={[0.42, 0.46, 0.12, 40]} />
                <meshStandardMaterial color={inProg ? STEEL_BRIGHT : "#3a4450"} metalness={0.5} roughness={0.45} />
              </mesh>
              {f.license_required && (
                <mesh position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.3, 0.34, 48]} />
                  <meshStandardMaterial color={PHOSPHOR_DIM} roughness={1} />
                </mesh>
              )}
            </group>
          );
        })}
      </Bench3D>

      {/* Bridges: exactly two ends each; the programme's are phosphor, the rest dim */}
      <Bench3D bench="bridges" label="Bridges" size={[GRAPH.radius * 1.6, 0.5, GRAPH.radius * 1.6]} center={[0, 0.25, 0]} hovered={hovered === "bridges"} onHover={onHover} onSelect={onSelect}>
        {[...cat.bridges.values()].map((b) => {
          const inProg = used.bridges.has(b.id);
          const a = pos(b.left);
          const c = pos(b.right);
          return (
            <Line
              key={b.id}
              points={[[a[0], 0.14, a[2]], [c[0], 0.14, c[2]]]}
              color={b.status !== "live" ? "#3a3030" : inProg ? PHOSPHOR : PHOSPHOR_DIM}
              lineWidth={inProg ? 2.2 : 1}
              dashed={b.status !== "live"}
              transparent
              opacity={inProg ? 0.95 : 0.55}
            />
          );
        })}
      </Bench3D>

      {/* Programmes: the highlighted subgraph, as a low phosphor plinth under its fields */}
      <group ref={highlight}>
        <Bench3D bench="programmes" label="Programmes" size={[GRAPH.radius * 2 + 0.4, 0.3, GRAPH.radius * 2 + 0.4]} center={[0, 0.02, 0]} hovered={hovered === "programmes"} onHover={onHover} onSelect={onSelect}>
          {[...used.fields].map((id) => {
            const [x, , z] = pos(id);
            return (
              <mesh key={id} position={[x, 0.002, z]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.55, 0.6, 48]} />
                <meshStandardMaterial color={PHOSPHOR} emissive={PHOSPHOR} emissiveIntensity={0.35} roughness={0.9} />
              </mesh>
            );
          })}
        </Bench3D>
      </group>

      {/* Synthesis: the child above the centre, lines down to its parents along the path */}
      <Bench3D bench="synthesis" label="Synthesis" size={[1.2, 1.0, 1.2]} center={[0, GRAPH.childHeight, 0]} hovered={hovered === "synthesis"} onHover={onHover} onSelect={onSelect}>
        <mesh position={childPos}>
          <cylinderGeometry args={[0.22, 0.22, 0.14, 6]} />
          <meshStandardMaterial color={childOk ? "#7fb3a6" : "#4a5560"} metalness={0.35} roughness={0.5} />
        </mesh>
        <mesh position={[0, GRAPH.childHeight / 2, 0]}>
          <cylinderGeometry args={[0.01, 0.01, GRAPH.childHeight, 6]} />
          <meshStandardMaterial color="#2a323c" roughness={1} />
        </mesh>
        {childOk &&
          child.parents.map((p) => {
            const a = pos(p.field);
            return <Line key={p.pin} points={[childPos, [a[0], 0.14, a[2]]]} color="#7fb3a6" lineWidth={1.2} transparent opacity={0.8} />;
          })}
        {childOk &&
          [...cat.bridges.values()]
            .filter((b) => childBridges.has(b.id))
            .map((b) => {
              const a = pos(b.left);
              const c = pos(b.right);
              return <Line key={`path-${b.id}`} points={[[a[0], 0.2, a[2]], [c[0], 0.2, c[2]]]} color="#7fb3a6" lineWidth={1.4} transparent opacity={0.6} />;
            })}
      </Bench3D>
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.001, 3]} />
        <meshBasicMaterial color={STEEL} visible={false} />
      </mesh>
    </group>
  );
}

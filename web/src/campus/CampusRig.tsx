/** The campus rig: the same law as the well's pointer rig, on a simpler goal.
 *
 *  The camera damps toward the selected building's rest pose plus what the hand
 *  adds — a slow orbit while dragging on the ground plane, a zoom on wheel. No
 *  hover parallax, no vehicle, no physics. Frames come from the render policy:
 *  the rig holds the loop while the pointer is down, touches it per move, holds
 *  it for the selection tween, and holds it while damping converges; then the
 *  loop sleeps and the campus is still. `useFrame` reads `delta` only. */
import { invalidate, useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useRef } from "react";

import { ONE_SHOT } from "../lib/motion";
import { damp, sphericalToPosition, type Spherical } from "../scene/focus";
import { hold, touch, type Release } from "../scene/renderPolicy";
import { campusGoal, type BuildingKey } from "./campusLayout";

const CONVERGE_EPS = 0.003;
const SETTLE_CAP_S = 1.6; // summed frame deltas, not a clock

export function CampusRig({ selected }: { selected: BuildingKey | null }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const base = useRef<Spherical>(campusGoal(selected));
  const offset = useRef({ az: 0, el: 0, zoom: 1 });
  const cur = useRef<Spherical>({ ...base.current });
  const dampHold = useRef<Release | null>(null);
  const settle = useRef({ since: 0, key: "" });

  const apply = (s: Spherical) => {
    const p = sphericalToPosition(s);
    camera.position.set(p[0], p[1], p[2]);
    camera.lookAt(s.target[0], s.target[1], s.target[2]);
  };
  const goal = (): Spherical => {
    const b = base.current;
    const o = offset.current;
    return { az: b.az + o.az, el: Math.min(1.2, Math.max(0.12, b.el + o.el)), dist: Math.min(48, Math.max(8, b.dist * o.zoom)), target: b.target };
  };
  const gap = (g: Spherical, c: Spherical) =>
    Math.max(Math.abs(g.az - c.az), Math.abs(g.el - c.el), Math.abs(g.dist - c.dist) / 10, Math.abs(g.target[0] - c.target[0]), Math.abs(g.target[1] - c.target[1]), Math.abs(g.target[2] - c.target[2]));

  useEffect(() => {
    cur.current = goal();
    apply(cur.current);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Selection change: one-shot tween of the base goal, held for its duration.
  useEffect(() => {
    const next = campusGoal(selected);
    const release = hold("focus");
    const from = { ...base.current, tx: base.current.target[0], ty: base.current.target[1], tz: base.current.target[2] };
    const tl = gsap.timeline({
      ...ONE_SHOT,
      onUpdate: () => {
        base.current = { az: from.az, el: from.el, dist: from.dist, target: [from.tx, from.ty, from.tz] };
        invalidate();
      },
      onComplete: () => {
        base.current = next;
        release();
      },
    });
    tl.to(from, { az: next.az, el: next.el, dist: next.dist, tx: next.target[0], ty: next.target[1], tz: next.target[2], duration: 1.1, ease: "power2.inOut" });
    return () => {
      tl.kill();
      release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Pointer on the canvas: drag = slow orbit on the ground plane; wheel = zoom.
  useEffect(() => {
    const el = gl.domElement;
    let dragging = false;
    let dragHold: Release | null = null;
    let lastX = 0;
    let lastY = 0;
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      offset.current.az += (e.clientX - lastX) * 0.0045;
      offset.current.el += (e.clientY - lastY) * 0.003;
      offset.current.el = Math.min(0.5, Math.max(-0.2, offset.current.el));
      lastX = e.clientX;
      lastY = e.clientY;
      touch("pointer-move");
    };
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      dragHold ??= hold("pointer-down");
    };
    const onUp = () => {
      dragging = false;
      dragHold?.();
      dragHold = null;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      offset.current.zoom = Math.min(1.8, Math.max(0.5, offset.current.zoom * (1 + e.deltaY * 0.001)));
      touch("pointer-move");
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("pointerleave", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerleave", onUp);
      el.removeEventListener("wheel", onWheel);
      dragHold?.();
      dampHold.current?.();
      dampHold.current = null;
    };
  }, [gl]);

  // One damping step per drawn frame; delta in, clock never. Holds the loop
  // while closing the gap, lands exactly, releases: the last frame is rest.
  useFrame((_state, delta) => {
    const g = goal();
    const c = cur.current;
    const key = `${g.az.toFixed(4)}|${g.el.toFixed(4)}|${g.dist.toFixed(3)}|${g.target.join(",")}`;
    if (key !== settle.current.key) settle.current = { since: 0, key };
    else settle.current.since += delta;
    if (gap(g, c) < CONVERGE_EPS || settle.current.since > SETTLE_CAP_S) {
      if (dampHold.current) {
        cur.current = g;
        apply(g);
        dampHold.current();
        dampHold.current = null;
      }
      return;
    }
    dampHold.current ??= hold("damping");
    const dt = Math.min(delta, 0.1);
    cur.current = {
      az: damp(c.az, g.az, dt, 6),
      el: damp(c.el, g.el, dt, 6),
      dist: damp(c.dist, g.dist, dt, 6),
      target: [damp(c.target[0], g.target[0], dt, 6), damp(c.target[1], g.target[1], dt, 6), damp(c.target[2], g.target[2], dt, 6)],
    };
    apply(cur.current);
  });

  return null;
}

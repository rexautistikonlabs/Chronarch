/** The lab rig: the shop-window camera, with the hand allowed to turn it.
 *
 *  The goal is HERO_VIEW plus an azimuth / elevation offset from dragging on
 *  the canvas, clamped so the view never leaves the room or goes through
 *  the floor; while a door opens the goal is the piece (doorView). The
 *  camera damps toward it. Frames come from the render policy: the rig holds
 *  the ledger while the pointer is down and while damping converges; when
 *  the hand is still the loop sleeps and the frame is byte-identical. No
 *  scroll, no wheel zoom, no follow, no idle turn. `useFrame` reads `delta`
 *  only. */
import { invalidate, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

import { damp, sphericalToPosition, type Spherical } from "../scene/focus";
import { hold, touch, type Release } from "../scene/renderPolicy";
import { doorView, HERO_VIEW, ORBIT, type PropKey } from "./labLayout";

const CONVERGE_EPS = 0.003;
const SETTLE_CAP_S = 1.6; // summed frame deltas, not a clock

export function LabRig({ door }: { door: RefObject<PropKey | null> }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const offset = useRef({ az: 0, el: 0 });
  const cur = useRef<Spherical>(HERO_VIEW);
  const dampHold = useRef<Release | null>(null);
  const settle = useRef({ since: 0, key: "" });

  const apply = (s: Spherical) => {
    const p = sphericalToPosition(s);
    camera.position.set(p[0], p[1], p[2]);
    camera.lookAt(s.target[0], s.target[1], s.target[2]);
  };
  const goal = (): Spherical => {
    const o = door.current ? { az: 0, el: 0 } : offset.current; // a door frames the piece; the hand's turn does not move it behind a wall
    const b = door.current ? doorView(door.current, HERO_VIEW) : HERO_VIEW;
    return { az: b.az + o.az, el: Math.min(1.0, Math.max(0.16, b.el + o.el)), dist: b.dist, target: b.target };
  };
  const gap = (g: Spherical, c: Spherical) =>
    Math.max(Math.abs(g.az - c.az), Math.abs(g.el - c.el), Math.abs(g.dist - c.dist) / 10, Math.abs(g.target[0] - c.target[0]), Math.abs(g.target[1] - c.target[1]), Math.abs(g.target[2] - c.target[2]));

  // Land exactly on the first frame: applied in the commit that asks for it.
  useLayoutEffect(() => {
    cur.current = goal();
    apply(cur.current);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drag on the canvas: a slow turn of the view, within ORBIT. No wheel.
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
      offset.current.el = Math.min(ORBIT.elUp, Math.max(-ORBIT.elDown, offset.current.el));
      offset.current.az = Math.min(ORBIT.az, Math.max(-ORBIT.az, offset.current.az));
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
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("pointerleave", onUp);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerleave", onUp);
      dragHold?.();
      dampHold.current?.();
      dampHold.current = null;
    };
  }, [gl]);

  // One damping step per drawn frame; delta in, clock never.
  useFrame((_state, delta) => {
    const g = goal();
    const c = cur.current;
    const key = `${g.az.toFixed(4)}|${g.el.toFixed(4)}|${g.dist.toFixed(3)}|${g.target.map((v) => v.toFixed(3)).join(",")}`;
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
      az: damp(c.az, g.az, dt, 7),
      el: damp(c.el, g.el, dt, 7),
      dist: damp(c.dist, g.dist, dt, 7),
      target: [damp(c.target[0], g.target[0], dt, 7), damp(c.target[1], g.target[1], dt, 7), damp(c.target[2], g.target[2], dt, 7)],
    };
    apply(cur.current);
  });

  return null;
}

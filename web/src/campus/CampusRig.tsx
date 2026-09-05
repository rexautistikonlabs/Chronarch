/** The campus rig: scroll drives the camera; the hand may add a slow orbit.
 *
 *  The goal is `storyGoal(progress)` — the scroll position of the page, read
 *  from a ref the page updates — plus an azimuth offset from dragging on the
 *  canvas. The camera damps toward it. Frames come from the render policy:
 *  the page touches the ledger on every scroll event, the rig holds it while
 *  the pointer is down and while damping converges; when the hand and the
 *  page are still, the loop sleeps and the frame is byte-identical. No
 *  physics, no vehicle, no zoom on wheel (the wheel scrolls the story). No
 *  idle spin. `useFrame` reads `delta` only. */
import { useFrame, useThree, invalidate } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";

import { damp, sphericalToPosition, type Spherical } from "../scene/focus";
import { hold, touch, type Release } from "../scene/renderPolicy";
import { doorGoal, storyGoal, type BuildingKey } from "./campusLayout";

const CONVERGE_EPS = 0.003;
const SETTLE_CAP_S = 1.6; // summed frame deltas, not a clock

export function CampusRig({ progress, door }: { progress: RefObject<number>; door: RefObject<BuildingKey | null> }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const offset = useRef({ az: 0, el: 0 });
  const cur = useRef<Spherical>(storyGoal(progress.current ?? 0));
  const dampHold = useRef<Release | null>(null);
  const settle = useRef({ since: 0, key: "" });

  const apply = (s: Spherical) => {
    const p = sphericalToPosition(s);
    camera.position.set(p[0], p[1], p[2]);
    camera.lookAt(s.target[0], s.target[1], s.target[2]);
  };
  const goal = (): Spherical => {
    const s = storyGoal(progress.current ?? 0);
    const o = offset.current;
    const b = door.current ? doorGoal(door.current, s) : s; // a door opening: ease at the volume
    return { az: b.az + o.az, el: Math.min(1.1, Math.max(0.14, b.el + o.el)), dist: b.dist, target: b.target };
  };
  const gap = (g: Spherical, c: Spherical) =>
    Math.max(Math.abs(g.az - c.az), Math.abs(g.el - c.el), Math.abs(g.dist - c.dist) / 10, Math.abs(g.target[0] - c.target[0]), Math.abs(g.target[1] - c.target[1]), Math.abs(g.target[2] - c.target[2]));

  // Land exactly on the first frame.
  useEffect(() => {
    cur.current = goal();
    apply(cur.current);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drag on the canvas: a slow orbit added to the story's goal. Wheel is left
  // to the page — it scrolls the story, which is the camera's driver.
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
      offset.current.el = Math.min(0.4, Math.max(-0.15, offset.current.el));
      offset.current.az = Math.min(0.9, Math.max(-0.9, offset.current.az));
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

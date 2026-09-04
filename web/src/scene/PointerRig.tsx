/** The pointer rig: fluid, pointer-live, clock-dead.
 *
 * The camera damps toward a goal: the focus's seeded rest pose, plus what the
 * pointer is doing — a small parallax while hovering the well, an orbit while
 * dragging, a zoom on wheel. Frames come from the render policy: the rig holds
 * the loop while the pointer is down, touches it on every move, holds it for
 * the focus tween, and holds it while the damping is still converging. When
 * every hold is released the loop sleeps (see renderPolicy.ts) and the rig
 * lands on its goal in the final frame.
 *
 * `useFrame` reads `delta` only — never the clock. Under prefers-reduced-motion
 * the pointer does nothing to the camera and a focus change is an instant cut.
 */
import { invalidate, useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useRef } from "react";

import { ONE_SHOT } from "../lib/motion";
import type { Pose } from "../lib/pose";
import { cameraSpherical, damp, sphericalToPosition, type FocusKey, type Spherical } from "./focus";
import { hold, touch, type Release } from "./renderPolicy";

const CONVERGE_EPS = 0.003; // ~0.17° — below what a frame can show
const SETTLE_CAP_S = 1.4; // damping may hold the loop at most this long after the goal last moved (summed frame deltas, not a clock)

export function PointerRig({ focus, pose, reduced }: { focus: FocusKey; pose: Pose; reduced: boolean }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);

  const base = useRef<Spherical>(cameraSpherical(focus, pose)); // tweened on focus change
  const offset = useRef({ az: 0, el: 0, zoom: 1 }); // what the pointer adds
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
    return { az: b.az + o.az, el: Math.min(1.35, Math.max(0.08, b.el + o.el)), dist: b.dist * o.zoom, target: b.target };
  };
  const gap = (g: Spherical, c: Spherical) =>
    Math.max(Math.abs(g.az - c.az), Math.abs(g.el - c.el), Math.abs(g.dist - c.dist) / 10, Math.abs(g.target[0] - c.target[0]), Math.abs(g.target[1] - c.target[1]), Math.abs(g.target[2] - c.target[2]));

  // Land exactly on the first frame; no tween, no hold.
  useEffect(() => {
    cur.current = goal();
    apply(cur.current);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus / pose change: one-shot tween of the base goal, held for its duration.
  useEffect(() => {
    const next = cameraSpherical(focus, pose);
    if (reduced) {
      base.current = next;
      cur.current = goal();
      apply(cur.current);
      invalidate();
      return;
    }
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
    tl.to(from, { az: next.az, el: next.el, dist: next.dist, tx: next.target[0], ty: next.target[1], tz: next.target[2], duration: 0.9, ease: "power2.inOut" });
    return () => {
      tl.kill();
      release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, pose, reduced]);

  // Pointer: hover parallax, drag orbit, wheel zoom — on the canvas only.
  useEffect(() => {
    const el = gl.domElement;
    if (reduced) return; // no camera follow under reduced motion
    let dragging = false;
    let dragHold: Release | null = null;
    let lastX = 0;
    let lastY = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (dragging) {
        offset.current.az += (e.clientX - lastX) * 0.006;
        offset.current.el += (e.clientY - lastY) * 0.004;
        offset.current.el = Math.min(0.6, Math.max(-0.35, offset.current.el));
      } else {
        offset.current.az = -nx * 0.14; // parallax: the well leans toward the hand
        offset.current.el = ny * 0.06;
      }
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
    const onLeave = () => {
      dragging = false;
      dragHold?.();
      dragHold = null;
      offset.current.az = 0;
      offset.current.el = 0;
      touch("pointer-move");
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      offset.current.zoom = Math.min(2.2, Math.max(0.55, offset.current.zoom * (1 + e.deltaY * 0.0012)));
      touch("pointer-move");
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("wheel", onWheel);
      dragHold?.();
      dampHold.current?.();
      dampHold.current = null;
    };
  }, [gl, reduced]);

  // One damping step per drawn frame. Reads `delta`, never the clock. While
  // the camera is still closing the gap it holds the loop; at the goal it
  // releases and lands exactly — so the last frame is the rest pose.
  useFrame((_state, delta) => {
    const g = goal();
    const c = cur.current;
    const key = `${g.az.toFixed(4)}|${g.el.toFixed(4)}|${g.dist.toFixed(3)}|${g.target.join(",")}`;
    if (key !== settle.current.key) settle.current = { since: 0, key }; // the goal moved: start settling again
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
      az: damp(c.az, g.az, dt),
      el: damp(c.el, g.el, dt),
      dist: damp(c.dist, g.dist, dt),
      target: [damp(c.target[0], g.target[0], dt), damp(c.target[1], g.target[1], dt), damp(c.target[2], g.target[2], dt)],
    };
    apply(cur.current);
  });

  return null;
}

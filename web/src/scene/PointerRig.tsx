/** The pointer rig: fluid, pointer-live, clock-dead.
 *
 * The camera damps toward a goal. The goal is the focus's seeded rest pose
 * (a bench choice or the route), plus what the pointer is doing right now:
 * a small parallax while hovering the well, an orbit while dragging, a zoom
 * on wheel. Frames are drawn only while there is something to draw:
 *
 *   frameloop = "demand" at rest
 *             = "always" while the pointer is moving the rig or a focus tween
 *               runs; back to "demand" 300 ms after the pointer stops (held a
 *               little longer only until the damping has converged, capped)
 *
 * `useFrame` here reads `delta` only — never the clock. Nothing loops: with no
 * pointer and no event, no frame is drawn. Under prefers-reduced-motion the
 * pointer does nothing to the camera and a focus change is an instant cut.
 */
import { invalidate, useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useRef } from "react";

import { ONE_SHOT } from "../lib/motion";
import type { Pose } from "../lib/pose";
import { cameraSpherical, damp, sphericalToPosition, type FocusKey, type Spherical } from "./focus";

export const POINTER_STOP_MS = 300;
const CONVERGE_EPS = 0.002;
const MAX_HOLD_CHECKS = 6; // 6 × 300 ms: the longest the rig stays awake after the pointer stops

export function PointerRig({ focus, pose, reduced }: { focus: FocusKey; pose: Pose; reduced: boolean }) {
  const camera = useThree((s) => s.camera);
  const setFrameloop = useThree((s) => s.setFrameloop);
  const gl = useThree((s) => s.gl);

  const base = useRef<Spherical>(cameraSpherical(focus, pose)); // tweened on focus change
  const offset = useRef({ az: 0, el: 0, zoom: 1 }); // what the pointer adds
  const cur = useRef<Spherical>({ ...base.current });
  const awake = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdChecks = useRef(0);

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
  const converged = () => {
    const g = goal();
    const c = cur.current;
    return Math.abs(g.az - c.az) < CONVERGE_EPS && Math.abs(g.el - c.el) < CONVERGE_EPS && Math.abs(g.dist - c.dist) < CONVERGE_EPS * 10;
  };
  const sleep = () => {
    awake.current = false;
    setFrameloop("demand");
    cur.current = goal(); // land exactly; one last frame
    apply(cur.current);
    invalidate();
  };
  const scheduleSleep = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      holdChecks.current += 1;
      if (converged() || holdChecks.current >= MAX_HOLD_CHECKS) sleep();
      else scheduleSleep();
    }, POINTER_STOP_MS);
  };
  const wake = () => {
    holdChecks.current = 0;
    if (!awake.current) {
      awake.current = true;
      setFrameloop("always");
    }
    scheduleSleep();
  };

  // Focus / pose change: one-shot tween of the base goal, then still.
  useEffect(() => {
    const next = cameraSpherical(focus, pose);
    if (reduced) {
      base.current = next;
      cur.current = goal();
      apply(cur.current);
      invalidate();
      return;
    }
    const from = { ...base.current, tx: base.current.target[0], ty: base.current.target[1], tz: base.current.target[2] };
    const tl = gsap.timeline({
      ...ONE_SHOT,
      onUpdate: () => {
        base.current = { az: from.az, el: from.el, dist: from.dist, target: [from.tx, from.ty, from.tz] };
        wake();
      },
      onComplete: () => {
        base.current = next;
        scheduleSleep();
      },
    });
    tl.to(from, { az: next.az, el: next.el, dist: next.dist, tx: next.target[0], ty: next.target[1], tz: next.target[2], duration: 0.9, ease: "power2.inOut" });
    return () => {
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, pose, reduced]);

  // Pointer: hover parallax, drag orbit, wheel zoom — on the canvas only.
  useEffect(() => {
    const el = gl.domElement;
    if (reduced) return; // no camera follow under reduced motion
    let dragging = false;
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
      wake();
    };
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      wake();
    };
    const onUp = () => {
      dragging = false;
      wake();
    };
    const onLeave = () => {
      dragging = false;
      offset.current.az = 0;
      offset.current.el = 0;
      wake();
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      offset.current.zoom = Math.min(2.2, Math.max(0.55, offset.current.zoom * (1 + e.deltaY * 0.0012)));
      wake();
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
      if (timer.current) clearTimeout(timer.current);
    };
  }, [gl, reduced]);

  // One damping step per drawn frame. Reads `delta`, never the clock.
  useFrame((_state, delta) => {
    const g = goal();
    const c = cur.current;
    const dt = Math.min(delta, 0.05);
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

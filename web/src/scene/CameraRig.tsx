import { invalidate, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { ONE_SHOT } from "../lib/motion";
import type { Pose } from "../lib/pose";
import { cameraGoal, type FocusKey } from "./focus";

/** Moves the camera ONCE when the focus or the pose changes, then stops.
 *  The user may orbit by hand afterwards; nothing orbits by itself. */
export function CameraRig({ focus, pose, reduced }: { focus: FocusKey; pose: Pose; reduced: boolean }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;

  useEffect(() => {
    const goal = cameraGoal(focus, pose);
    const target = controls?.target;
    const apply = () => {
      controls?.update();
      invalidate();
    };
    if (reduced) {
      camera.position.set(...goal.position);
      target?.set(...goal.target);
      apply();
      return;
    }
    const tl = gsap.timeline({ ...ONE_SHOT, onUpdate: apply, onComplete: apply });
    tl.to(camera.position, { x: goal.position[0], y: goal.position[1], z: goal.position[2], duration: 0.9, ease: "power2.inOut" }, 0);
    if (target) tl.to(target, { x: goal.target[0], y: goal.target[1], z: goal.target[2], duration: 0.9, ease: "power2.inOut" }, 0);
    return () => {
      tl.kill();
    };
  }, [focus, pose, reduced, camera, controls]);

  return null;
}

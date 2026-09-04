import { usePrefersReducedMotion } from "../lib/motion";

export function MotionBadge() {
  const reduced = usePrefersReducedMotion();
  return (
    <span className="readout text-[11px] uppercase tracking-wider text-dim" data-testid="motion-badge">
      motion: {reduced ? "off (prefers-reduced-motion)" : "one-shot events, then still"}
    </span>
  );
}

/** The title beat: one line, once, after the gate. It holds ~1.2 s and fades
 *  over the campus in one GSAP one-shot; when the tween completes it unmounts
 *  itself and nothing repeats. It is DOM only — the canvas beneath draws on
 *  demand and needs no frames for this. Under reduced motion the page does
 *  not mount it at all. */
import gsap from "gsap";
import { useEffect, useRef } from "react";

import { TITLE_LINE } from "../lib/gate";
import { ONE_SHOT } from "../lib/motion";

export function TitleBeat({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tl = gsap.timeline({ ...ONE_SHOT, onComplete: onDone });
    tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power1.out" });
    tl.to(el, { opacity: 1, duration: 1.2 }); // the hold
    tl.to(el, { opacity: 0, duration: 0.6, ease: "power2.in" });
    return () => {
      tl.kill();
    };
  }, [onDone]);
  return (
    <div ref={ref} className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-void" style={{ opacity: 0 }} data-testid="title-beat" aria-live="polite">
      <p className="text-3xl font-semibold tracking-tight text-ivory sm:text-5xl" data-testid="title-line">{TITLE_LINE}</p>
    </div>
  );
}

/** The lab, stubbed for jsdom (no WebGL): the same five hotspots as HTML
 *  buttons in the same DOM order, one canvas element, and a walk that
 *  arrives at once — the real operator walks a one-shot path first. */
import { useEffect } from "react";

import { PROPS, type PropKey, type WalkRequest } from "../src/lab/labLayout";

export const webglAvailable = () => true;
const ORDER: readonly PropKey[] = ["continuum", "chronarch", "specboard", "labbook", "laterion"];

export function Lab({ walk, onPick, onArrive }: { walk: WalkRequest | null; onPick: (k: PropKey) => void; onArrive: (k: PropKey) => void }) {
  useEffect(() => {
    if (walk) onArrive(walk.key);
  }, [walk, onArrive]);
  return (
    <div data-testid="lab-viewport" data-loop="demand">
      <canvas data-testid="lab-canvas" />
      {ORDER.map((k) => {
        const p = PROPS.find((x) => x.key === k)!;
        return <button key={k} type="button" data-testid={`sign-${k}`} onClick={() => onPick(k)}>{p.sign}</button>;
      })}
    </div>
  );
}

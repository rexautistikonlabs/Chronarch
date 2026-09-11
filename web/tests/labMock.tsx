/** The lab, stubbed for jsdom (no WebGL): the same five hotspots as HTML
 *  buttons in the scene's DOM order, one canvas element, and a walk that
 *  arrives at once — the real operator walks a one-shot path first. A test
 *  may set `mockControl.manual` to hold the arrival and release it with the
 *  `mock-arrive` button, to exercise what happens mid-walk. */
import { useEffect } from "react";

import { HOTSPOT_ORDER, PROPS, type PropKey, type WalkRequest } from "../src/lab/labLayout";

export const webglAvailable = () => true;
export const mockControl = { manual: false };

export function Lab({ walk, onPick, onArrive }: { walk: WalkRequest | null; onPick: (k: PropKey) => void; onArrive: (k: PropKey) => void }) {
  useEffect(() => {
    if (walk && !mockControl.manual) onArrive(walk.key);
  }, [walk, onArrive]);
  return (
    <div data-testid="lab-viewport" data-loop={walk ? "always" : "demand"} data-walk={walk ? `${walk.key}:${walk.n}` : ""}>
      <canvas data-testid="lab-canvas" />
      {HOTSPOT_ORDER.map((k) => {
        const p = PROPS.find((x) => x.key === k)!;
        return <button key={k} type="button" data-testid={`sign-${k}`} onClick={() => onPick(k)}>{p.sign}</button>;
      })}
      {walk && mockControl.manual && <button type="button" data-testid="mock-arrive" onClick={() => onArrive(walk.key)}>arrive</button>}
    </div>
  );
}

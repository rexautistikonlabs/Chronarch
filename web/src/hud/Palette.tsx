/** ⌘K. Benches, records, rooms. Navigates or opens a card; never fetches,
 *  never spawns anything. */
import { Command } from "cmdk";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { BENCHES, FIXTURE_CHIPS } from "../lib/human";
import { useSession, type FixtureName } from "../state/SessionContext";
import { useWell } from "../state/WellContext";

export function Palette() {
  const { paletteOpen, setPaletteOpen, selectBench } = useWell();
  const { loadFixture } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(!paletteOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, setPaletteOpen]);

  const run = (fn: () => void) => () => {
    fn();
    setPaletteOpen(false);
  };

  return (
    <Command.Dialog open={paletteOpen} onOpenChange={setPaletteOpen} label="Command palette" className="palette" overlayClassName="palette-overlay" contentClassName="palette-content" data-testid="palette">
      <Command.Input placeholder="Pulse · Memory · Vote · Paste session …" className="palette-input" autoFocus data-testid="palette-input" />
      <Command.List className="palette-list">
        <Command.Empty className="palette-empty">Nothing on that bench.</Command.Empty>
        <Command.Group heading="Benches">
          {BENCHES.map((b) => (
            <Command.Item key={b.key} value={`bench ${b.title}`} onSelect={run(() => { navigate("/"); selectBench(b.key); })} className="palette-item" data-testid={`palette-${b.key}`}>
              <span>{b.title}</span>
              <span className="palette-hint">{b.tagline}</span>
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Records">
          {FIXTURE_CHIPS.map((c) => (
            <Command.Item key={c.fixture} value={`record ${c.label}`} onSelect={run(() => loadFixture(c.fixture as FixtureName))} className="palette-item">
              <span>{c.label}</span>
              <span className="palette-hint">{c.blurb}</span>
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Rooms">
          <Command.Item value="paste session technician" onSelect={run(() => navigate("/tech"))} className="palette-item" data-testid="palette-paste">
            <span>Paste session</span>
            <span className="palette-hint">the technician room: paste JSON, fixtures by file, hashes</span>
          </Command.Item>
          <Command.Item value="lab floor" onSelect={run(() => navigate("/"))} className="palette-item">
            <span>Lab floor</span>
            <span className="palette-hint">back to the well</span>
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}

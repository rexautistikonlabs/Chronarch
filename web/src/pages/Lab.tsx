import { useState } from "react";
import { Button, Label, TextArea, TextField } from "react-aria-components";

import { ErrorBoundary } from "../components/ErrorBoundary";
import JsonViewer from "../components/JsonViewer";
import { Legend } from "../components/Legend";
import { MotionBadge } from "../components/MotionBadge";
import { PageHeader, Section } from "../components/Page";
import { SessionMeta } from "../components/SessionMeta";
import { StatBar } from "../components/StatBar";
import { Viewport } from "../scene/Scene";
import { FIXTURES, useSession, type FixtureName } from "../state/SessionContext";

const EXAMPLE = `{"ok": true, "result": {"identity": "chronarch-pulse", "height": 3, "head_hash": "<64 hex>", "ring_count": 4, "scar_count": 0, "pins_ok": true, "i3": null, "credits_by_reason": {"space": 1}}}`;

export function Lab() {
  const { session, error, loadFixture, loadText } = useSession();
  const [text, setText] = useState("");
  const [applied, setApplied] = useState<string | null>(null);

  const apply = () => {
    const ok = loadText(text);
    setApplied(ok ? "applied" : "refused");
  };

  return (
    <div>
      <PageHeader eyebrow="lab console" title="Paste a session. Drive the scene." lede={<>Paste the JSON that <code className="readout text-ivory">chronarch memory</code>, <code className="readout text-ivory">pulse</code>, <code className="readout text-ivory">net status</code> or a captured session envelope printed, and the instrument redraws from it. The console never runs a node, never reads your disk, and refuses anything that is not a well-formed lab output. The loaded session is shown as plain text: an instrument, not an IDE.</>} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="readout text-[11px] uppercase tracking-wider text-dim">fixtures</span>
            {(Object.keys(FIXTURES) as FixtureName[]).map((name) => (
              <Button key={name} onPress={() => { loadFixture(name); setApplied(null); }} className="readout border hair bg-panel px-2.5 py-1 text-xs text-ivory hover:bg-line pressed:bg-line" data-testid={`load-${name}`}>
                {name}
              </Button>
            ))}
          </div>
          <TextField className="flex flex-col gap-1" aria-label="Session JSON">
            <Label className="readout text-[11px] uppercase tracking-wider text-dim">session json</Label>
            <TextArea value={text} onChange={(e) => setText(e.target.value)} placeholder={EXAMPLE} rows={12} spellCheck={false} className="readout w-full resize-y border hair bg-ink p-3 text-xs text-ivory placeholder:text-dim" data-testid="json-input" />
          </TextField>
          <div className="flex items-center gap-3">
            <Button onPress={apply} isDisabled={!text.trim()} className="border hair bg-panel px-3 py-1.5 text-sm text-ivory hover:bg-line disabled:opacity-40" data-testid="apply-json">Apply pasted JSON</Button>
            <Button onPress={() => { setText(""); setApplied(null); }} className="px-2 py-1.5 text-sm text-mute hover:text-ivory">Clear</Button>
            {applied === "applied" && <span className="readout text-xs text-verdigris" data-testid="apply-result">applied</span>}
            {applied === "refused" && <span className="readout text-xs text-ivory" data-testid="apply-result">refused — {error}</span>}
          </div>
          <div className="flex items-center justify-between gap-4">
            <SessionMeta />
            <MotionBadge />
          </div>
        </div>
        <Viewport state={session.state} focus="overview" className="aspect-[4/3] w-full lg:aspect-auto lg:h-[520px]" />
      </div>

      <div className="mt-6">
        <StatBar state={session.state} />
      </div>

      <Section title="loaded session (read-only)">
        <ErrorBoundary name="viewer">
          <JsonViewer value={JSON.stringify(session.steps.length ? { label: session.label, focus_home: session.focus_home, steps: session.steps } : session.state, null, 2)} />
        </ErrorBoundary>
      </Section>

      <Section title="legend">
        <Legend />
      </Section>
    </div>
  );
}

import type { ReactNode } from "react";

export function Readout({ label, value, testId, tone = "ivory", hint }: { label: string; value: ReactNode; testId?: string; tone?: "ivory" | "amber" | "mute" | "verdigris"; hint?: string }) {
  const color = { ivory: "text-ivory", amber: "text-amber", mute: "text-mute", verdigris: "text-verdigris" }[tone];
  return (
    <div className="min-w-0 border hair bg-panel px-3 py-2" title={hint}>
      <div className="readout text-[10px] uppercase tracking-wider text-dim">{label}</div>
      <div className={`readout mt-0.5 truncate text-lg ${color}`} data-testid={testId}>{value}</div>
    </div>
  );
}

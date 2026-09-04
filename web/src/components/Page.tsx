import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, lede }: { eyebrow: string; title: string; lede: ReactNode }) {
  return (
    <header className="mb-6 max-w-3xl">
      <p className="readout text-[11px] uppercase tracking-wider text-dim">{eyebrow}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-mute">{lede}</p>
    </header>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="readout text-[11px] uppercase tracking-wider text-dim">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-mute">{children}</div>
    </section>
  );
}

export function NotList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-2 grid gap-1 text-sm text-mute sm:grid-cols-2">
      {items.map((it) => (
        <li key={it} className="flex gap-2">
          <span className="readout text-dim">not</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

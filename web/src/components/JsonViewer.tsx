/** Read-only JSON, as text. The lab is an instrument, not an IDE: a `<pre>`
 *  has no workers, no lazy chunk and nothing that can throw, so the console
 *  cannot go dark because of its viewer. */
export default function JsonViewer({ value, maxHeight = 420 }: { value: string; maxHeight?: number }) {
  return (
    <pre className="readout overflow-auto border hair bg-ink p-3 text-[11px] leading-snug text-mute" style={{ maxHeight }} data-testid="json-viewer" tabIndex={0} aria-label="Loaded session JSON, read-only">
      {value}
    </pre>
  );
}

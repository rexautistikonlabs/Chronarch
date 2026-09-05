import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="max-w-md">
      <p className="readout text-[11px] uppercase tracking-wider text-dim">404</p>
      <h1 className="mt-1 text-2xl font-semibold">No such page.</h1>
      <p className="mt-2 text-sm text-mute">Chronarch has three rooms under /chronarch; RexMetrix lands at /. <Link to="/" className="text-ivory underline underline-offset-2">Back to the landing.</Link></p>
    </div>
  );
}

import { Component, type ErrorInfo, type ReactNode } from "react";

/** Fail-closed rendering. A crash inside `children` is caught here and shown
 *  as a still ivory panel; it never unmounts the chrome (status banner, nav),
 *  the readouts or the scene around it. No amber: a viewer failure is not a
 *  scar or an I3. */
interface Props {
  name: string;
  children: ReactNode;
  className?: string;
  fallback?: (error: Error) => ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface it for the operator's console; nothing else reacts to it.
    console.warn(`[chronarch web] ${this.props.name} failed closed:`, error.message, info.componentStack ?? "");
  }

  render(): ReactNode {
    const { error } = this.state;
    if (error === null) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error);
    return (
      <div className={`border hair bg-ink p-4 text-sm text-mute ${this.props.className ?? ""}`} role="alert" data-testid={`${this.props.name}-error`}>
        <p className="readout text-[10px] uppercase tracking-wider text-dim">{this.props.name} · failed closed</p>
        <p className="readout mt-1 text-xs text-ivory">{error.message || String(error)}</p>
        <p className="mt-2 text-xs">The rest of the instrument is unaffected. Reload to retry.</p>
      </div>
    );
  }
}

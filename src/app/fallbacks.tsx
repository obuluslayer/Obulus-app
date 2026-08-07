import { Component, type ReactNode } from "react";

/// Full-page fatal screens rendered straight from main.tsx with ZERO providers mounted
/// (no wagmi, no router, no query client) — they must never depend on app state.

function FatalShell({ title, children, cta }: { title: string; children: ReactNode; cta?: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-obulus-bg px-5 text-obulus-ink">
      <div className="w-full max-w-lg rounded-2xl border border-obulus-border bg-white p-8 text-center">
        <h1 style={{ fontWeight: 700, fontSize: 24, lineHeight: 1.2 }}>{title}</h1>
        <div className="mt-3 text-[14px] text-obulus-muted">{children}</div>
        {cta && <div className="mt-6">{cta}</div>}
      </div>
    </div>
  );
}

export function ConfigErrorScreen({ errors }: { errors: readonly string[] }) {
  return (
    <FatalShell title="Configuration error">
      <p>This deployment is missing or has invalid settings, so on-chain actions cannot run safely.</p>
      <ul className="mt-4 space-y-2 text-left font-mono text-[12.5px] text-obulus-ink">
        {errors.map((e) => (
          <li key={e} className="rounded-lg border border-obulus-border bg-obulus-bg px-3 py-2">{e}</li>
        ))}
      </ul>
    </FatalShell>
  );
}

interface BoundaryState { error: Error | null }

/// React 18 error boundaries are class-only — this is the single class component in the app.
export class AppErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error("Unhandled render error:", error);
  }

  render(): ReactNode {
    if (this.state.error === null) return this.props.children;
    return (
      <FatalShell
        title="Something went wrong"
        cta={
          <button
            onClick={() => window.location.reload()}
            className="rounded-full bg-obulus-lime px-5 py-2.5 text-[14px] font-semibold text-obulus-ink transition-transform hover:scale-[1.02]"
          >
            Reload the app
          </button>
        }
      >
        <p>The cockpit hit an unexpected error. Reloading usually fixes it.</p>
        <p className="mt-2 font-mono text-[12px]">{this.state.error.message}</p>
      </FatalShell>
    );
  }
}

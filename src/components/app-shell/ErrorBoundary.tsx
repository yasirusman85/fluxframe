import React from "react";
import { Compass, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "../ui/Button";
import { secondaryLinkButton } from "./shell-tokens";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

const FatalErrorScreen: React.FC<{ error: Error }> = ({ error }) => {
  const home = import.meta.env.BASE_URL || "/";
  return (
    <div data-testid="app-error" className="flex h-full items-center justify-center overflow-y-auto bg-surface-0 p-6 text-zinc-100">
      <div role="alert" className="w-full max-w-lg space-y-5 rounded-2xl border border-zinc-800/80 bg-surface-1 p-6 shadow-panel md:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300">
          <TriangleAlert className="h-6 w-6" aria-hidden />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-extrabold tracking-tight text-white">Something went wrong</h1>
          <p className="text-sm leading-relaxed text-zinc-400">
            Higgsfield Studio hit an unexpected error while rendering. Your projects and settings are stored locally and will still be here after a reload.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button leftIcon={<RefreshCw className="h-4 w-4" aria-hidden />} onClick={() => window.location.reload()}>
            Reload
          </Button>
          <a href={home} className={secondaryLinkButton}>
            <Compass aria-hidden />
            Go to Explore
          </a>
        </div>
        <details className="rounded-xl border border-zinc-800 bg-surface-2 p-3 text-xs text-zinc-400">
          <summary className="cursor-pointer font-semibold text-zinc-300">Error details</summary>
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
            {error.message || "Unknown error"}
            {error.stack ? `\n\n${error.stack}` : ""}
          </pre>
        </details>
      </div>
    </div>
  );
};

/**
 * Last line of defence above the router: any uncaught render error shows a
 * friendly full-page fallback instead of a blank screen.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[fluxframe] Unhandled render error", error, info.componentStack);
  }

  render(): React.ReactNode {
    if (this.state.error) return <FatalErrorScreen error={this.state.error} />;
    return this.props.children;
  }
}

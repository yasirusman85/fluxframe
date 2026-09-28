import React, { useEffect } from "react";
import { Link, isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";
import { Compass, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "../ui/Button";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { secondaryLinkButton } from "./shell-tokens";

interface ErrorSummary {
  status?: number;
  title: string;
  message: string;
  stack?: string;
}

function summarize(error: unknown): ErrorSummary {
  if (isRouteErrorResponse(error)) {
    const data = typeof error.data === "string" ? error.data : "";
    return {
      status: error.status,
      title: error.status === 404 ? "Page not found" : `Error ${error.status}`,
      message: data || error.statusText || "The page could not be loaded.",
    };
  }
  if (error instanceof Error) {
    return { title: "Something went wrong", message: error.message || "Unexpected error", stack: error.stack };
  }
  return { title: "Something went wrong", message: typeof error === "string" ? error : "An unexpected error occurred while rendering this page." };
}

/** Route-level error UI (react-router `errorElement`). Rendered inside the shell for page errors. */
export const RouteError: React.FC = () => {
  const error = useRouteError();
  const navigate = useNavigate();
  const { status, title, message, stack } = summarize(error);
  useDocumentTitle(title);

  useEffect(() => {
    console.error("[fluxframe] Route error", error);
  }, [error]);

  return (
    <section data-testid="route-error" className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-5 py-10 text-center animate-fade-in">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300">
        <TriangleAlert className="h-7 w-7" aria-hidden />
      </div>
      <div role="alert" className="space-y-2">
        {status !== undefined && <p className="font-mono text-xs font-semibold uppercase tracking-widest text-zinc-400">HTTP {status}</p>}
        <h1 className="text-2xl font-extrabold tracking-tight text-white">{title}</h1>
        <p className="text-sm leading-relaxed text-zinc-400">Your projects are saved locally and are not affected. Retry the page or head back to Explore.</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button leftIcon={<RefreshCw className="h-4 w-4" aria-hidden />} onClick={() => navigate(0)}>
          Try again
        </Button>
        <Link to="/" className={secondaryLinkButton}>
          <Compass aria-hidden />
          Explore
        </Link>
      </div>
      <details className="w-full rounded-xl border border-zinc-800 bg-surface-1 p-3 text-left text-xs text-zinc-400">
        <summary className="cursor-pointer font-semibold text-zinc-300">Error details</summary>
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
          {message}
          {stack ? `\n\n${stack}` : ""}
        </pre>
      </details>
    </section>
  );
};

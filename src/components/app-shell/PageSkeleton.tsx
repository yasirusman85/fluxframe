import React from "react";
import { Skeleton } from "../ui/Skeleton";

/** Suspense fallback while a lazily loaded page chunk downloads. */
export const PageSkeleton: React.FC = () => (
  <div role="status" aria-live="polite" aria-busy="true" aria-label="Loading page" data-testid="page-skeleton" className="animate-fade-in space-y-6">
    <div className="space-y-2.5">
      <Skeleton className="h-7 w-52 max-w-full" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
    <span className="sr-only">Loading…</span>
  </div>
);

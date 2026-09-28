import React from "react";
import { RouterProvider } from "react-router-dom";
import { ErrorBoundary } from "../components/app-shell/ErrorBoundary";
import { router } from "./router";

/**
 * Everything that wraps the router. The class error boundary sits *above*
 * `RouterProvider` so a crash in the shell itself still renders a usable
 * screen (route-level errors are handled by each route's `errorElement`).
 *
 * Stores are Zustand singletons, so no context providers are needed.
 */
export const AppProviders: React.FC = () => (
  <ErrorBoundary>
    <RouterProvider router={router} />
  </ErrorBoundary>
);

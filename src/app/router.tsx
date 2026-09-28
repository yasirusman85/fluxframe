/**
 * Route table. Every page is a separate chunk (`React.lazy`) so the initial
 * bundle only carries the shell; `PageSkeleton` covers the download.
 *
 * The route *metadata* (titles, icons, nav groups) lives in `./routes.ts` —
 * this file only maps paths to components.
 */
import React, { Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { Layout } from "../components/app-shell/Layout";
import { PageSkeleton } from "../components/app-shell/PageSkeleton";
import { RouteError } from "../components/app-shell/RouteError";

const ExplorePage = React.lazy(() => import("../features/explore/ExplorePage").then((m) => ({ default: m.ExplorePage })));
const ImageStudioPage = React.lazy(() => import("../features/image-studio/ImageStudioPage").then((m) => ({ default: m.ImageStudioPage })));
const VideoStudioPage = React.lazy(() => import("../features/video-studio/VideoStudioPage").then((m) => ({ default: m.VideoStudioPage })));
const CinemaStudioPage = React.lazy(() => import("../features/cinema-studio/CinemaStudioPage").then((m) => ({ default: m.CinemaStudioPage })));
const LipSyncStudioPage = React.lazy(() => import("../features/lipsync-studio/LipSyncStudioPage").then((m) => ({ default: m.LipSyncStudioPage })));
const MarketingStudioPage = React.lazy(() => import("../features/marketing-studio/MarketingStudioPage").then((m) => ({ default: m.MarketingStudioPage })));
const CanvasPage = React.lazy(() => import("../features/canvas/CanvasPage").then((m) => ({ default: m.CanvasPage })));
const AppsPage = React.lazy(() => import("../features/apps/AppsPage").then((m) => ({ default: m.AppsPage })));
const AccountPage = React.lazy(() => import("../features/account/AccountPage").then((m) => ({ default: m.AccountPage })));
const ProjectLibraryPage = React.lazy(() => import("../features/projects/ProjectLibraryPage").then((m) => ({ default: m.ProjectLibraryPage })));
const ProjectDetailPage = React.lazy(() => import("../features/projects/ProjectDetailPage").then((m) => ({ default: m.ProjectDetailPage })));
const NotFoundPage = React.lazy(() => import("../features/not-found/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));

const withSuspense = (node: React.ReactNode) => <Suspense fallback={<PageSkeleton />}>{node}</Suspense>;

/**
 * Works for "/" (Cloudflare Pages) and for sub-path deploys such as
 * "/fluxframe/" (GitHub Pages). React Router treats "" as "/".
 */
const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Layout />,
      // Fallback for errors thrown outside a child route (e.g. in the shell).
      errorElement: <RouteError />,
      children: [
        { index: true, element: withSuspense(<ExplorePage />), errorElement: <RouteError /> },
        { path: "create/image", element: withSuspense(<ImageStudioPage />), errorElement: <RouteError /> },
        { path: "create/video", element: withSuspense(<VideoStudioPage />), errorElement: <RouteError /> },
        { path: "create/cinema", element: withSuspense(<CinemaStudioPage />), errorElement: <RouteError /> },
        { path: "create/lipsync", element: withSuspense(<LipSyncStudioPage />), errorElement: <RouteError /> },
        { path: "create/marketing", element: withSuspense(<MarketingStudioPage />), errorElement: <RouteError /> },
        { path: "canvas", element: withSuspense(<CanvasPage />), errorElement: <RouteError /> },
        { path: "apps", element: withSuspense(<AppsPage />), errorElement: <RouteError /> },
        { path: "account", element: withSuspense(<AccountPage />), errorElement: <RouteError /> },
        { path: "projects", element: withSuspense(<ProjectLibraryPage />), errorElement: <RouteError /> },
        { path: "projects/:projectId", element: withSuspense(<ProjectDetailPage />), errorElement: <RouteError /> },
        { path: "*", element: withSuspense(<NotFoundPage />), errorElement: <RouteError /> },
      ],
    },
  ],
  { basename },
);

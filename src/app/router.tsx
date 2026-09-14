import { createBrowserRouter } from "react-router-dom";
import { Layout } from "../components/app-shell/Layout";
import { ExplorePage } from "../features/explore/ExplorePage";
import { ImageStudioPage } from "../features/image-studio/ImageStudioPage";
import { VideoStudioPage } from "../features/video-studio/VideoStudioPage";
import { CinemaStudioPage } from "../features/cinema-studio/CinemaStudioPage";
import { MarketingStudioPage } from "../features/marketing-studio/MarketingStudioPage";
import { LipSyncStudioPage } from "../features/lipsync-studio/LipSyncStudioPage";
import { CanvasPage } from "../features/canvas/CanvasPage";
import { AppsPage } from "../features/apps/AppsPage";
import { AccountPage } from "../features/account/AccountPage";
import { ProjectLibraryPage } from "../features/projects/ProjectLibraryPage";
import { ProjectDetailPage } from "../features/projects/ProjectDetailPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <ExplorePage />,
      },
      {
        path: "create/cinema",
        element: <CinemaStudioPage />,
      },
      {
        path: "create/image",
        element: <ImageStudioPage />,
      },
      {
        path: "create/video",
        element: <VideoStudioPage />,
      },
      {
        path: "create/marketing",
        element: <MarketingStudioPage />,
      },
      {
        path: "create/lipsync",
        element: <LipSyncStudioPage />,
      },
      {
        path: "canvas",
        element: <CanvasPage />,
      },
      {
        path: "apps",
        element: <AppsPage />,
      },
      {
        path: "account",
        element: <AccountPage />,
      },
      {
        path: "projects",
        element: <ProjectLibraryPage />,
      },
      {
        path: "projects/:projectId",
        element: <ProjectDetailPage />,
      },
      {
        path: "*",
        element: <ExplorePage />,
      },
    ],
  },
]);

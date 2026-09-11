import { createBrowserRouter } from "react-router-dom";
import { Layout } from "../components/app-shell/Layout";
import { ExplorePage } from "../features/explore/ExplorePage";
import { ImageStudioPage } from "../features/image-studio/ImageStudioPage";
import { VideoStudioPage } from "../features/video-studio/VideoStudioPage";
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
        path: "create/image",
        element: <ImageStudioPage />,
      },
      {
        path: "create/video",
        element: <VideoStudioPage />,
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

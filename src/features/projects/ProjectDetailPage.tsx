import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Star,
  Download,
  Copy,
  Trash2,
  Share2,
  RotateCcw,
  Sparkles,
  Calendar,
  Layers,
} from "lucide-react";
import { useProjectStore } from "../../store/project-store";
import { useUIStore } from "../../store/ui-store";
import { downloadMedia } from "../../lib/download";
import { generateVisualDataUrl } from "../../lib/demo-assets";
import { BeforeAfterSlider } from "../../components/media/BeforeAfterSlider";
import { VideoPlayer } from "../../components/media/VideoPlayer";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";

export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { getProject, toggleFavorite, deleteProject, duplicateProject } = useProjectStore();
  const { addToast } = useUIStore();

  const project = projectId ? getProject(projectId) : undefined;

  if (!project) {
    return (
      <div className="py-24 text-center space-y-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mx-auto">
          <Layers className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Project Not Found</h2>
        <p className="text-xs text-zinc-400">
          The requested generation project with ID &quot;{projectId}&quot; does not exist or was deleted.
        </p>
        <Button size="sm" variant="primary" onClick={() => navigate("/projects")}>
          Return to Project Library
        </Button>
      </div>
    );
  }

  const handleDownload = () => {
    if (project.outputUrl) {
      downloadMedia(project.outputUrl, `${project.title.toLowerCase().replace(/\s+/g, "-")}.svg`);
      addToast("Started media download", "success");
    }
  };

  const handleUseSettings = () => {
    navigate(
      `/create/${project.type}?prompt=${encodeURIComponent(project.prompt)}&model=${project.model}&ratio=${project.aspectRatio}`
    );
    addToast("Loaded project settings into Studio", "info");
  };

  const handleDuplicate = () => {
    const newId = duplicateProject(project.id);
    addToast("Duplicated project settings", "success");
    navigate(`/projects/${newId}`);
  };

  const handleDelete = () => {
    if (window.confirm(`Delete project "${project.title}" permanently?`)) {
      deleteProject(project.id);
      addToast("Project deleted", "error");
      navigate("/projects");
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    addToast("Copied shareable project URL to clipboard", "success");
  };

  // Generate a comparison draft before image for Before/After view if image
  const draftUrl = generateVisualDataUrl(project.title, project.type, project.aspectRatio, 99);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <button
          onClick={() => navigate("/projects")}
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Library
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => toggleFavorite(project.id)}
            leftIcon={<Star className={`w-4 h-4 ${project.favorite ? "fill-amber-400 text-amber-400" : ""}`} />}
          >
            {project.favorite ? "Favorited" : "Favorite"}
          </Button>

          <Button size="sm" variant="secondary" onClick={handleShare} leftIcon={<Share2 className="w-4 h-4" />}>
            Share Link
          </Button>

          <Button size="sm" variant="secondary" onClick={handleUseSettings} leftIcon={<RotateCcw className="w-4 h-4" />}>
            Use Settings Again
          </Button>

          <Button size="sm" variant="primary" onClick={handleDownload} leftIcon={<Download className="w-4 h-4" />}>
            Download Media
          </Button>

          <Button
            size="sm"
            variant="danger"
            onClick={handleDelete}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Main Grid: Media Viewer & Metadata Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Media Preview */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={project.type === "video" ? "rose" : "violet"}>
                  {project.type.toUpperCase()}
                </Badge>
                {project.providerSource && (
                  <Badge variant={project.providerSource === "pollinations-ai" ? "emerald" : "amber"}>
                    {project.providerSource === "pollinations-ai" ? "Pollinations AI" : "Procedural Fallback"}
                  </Badge>
                )}
              </div>
            </div>

            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800">
              {project.type === "video" ? (
                <VideoPlayer
                  src={project.outputUrl!}
                  title={project.title}
                  duration={project.duration || 5}
                />
              ) : (
                <BeforeAfterSlider
                  beforeUrl={draftUrl}
                  afterUrl={project.outputUrl!}
                  beforeLabel="Diffusion Step 5 (Draft)"
                  afterLabel="Final Render (Completed)"
                />
              )}
            </div>

            <p className="text-xs text-zinc-400 italic">
              * Tip: Drag the central slider left/right to compare latent diffusion steps.
            </p>
          </div>
        </div>

        {/* Right Column: Complete Metadata Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-5">
            <h3 className="font-bold text-base text-zinc-100 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Sparkles className="w-4 h-4 text-violet-400" /> Generation Details
            </h3>

            {/* Prompt details */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">Full Prompt</label>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 leading-relaxed font-mono select-all">
                {project.prompt}
              </div>
            </div>

            {project.negativePrompt && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Negative Prompt</label>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-red-300 leading-relaxed font-mono select-all">
                  {project.negativePrompt}
                </div>
              </div>
            )}

            {/* Model & Spec Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Model Engine</span>
                <span className="text-xs font-bold text-zinc-200">{project.model}</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Canvas Ratio</span>
                <span className="text-xs font-bold text-zinc-200">{project.aspectRatio}</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Quality Preset</span>
                <span className="text-xs font-bold text-zinc-200 capitalize">{project.quality}</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Seed</span>
                <span className="text-xs font-bold text-zinc-200 font-mono">{project.seed || "Random"}</span>
              </div>
            </div>

            {/* Timestamps & ID */}
            <div className="pt-3 border-t border-zinc-800 space-y-2 text-xs text-zinc-500">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Created Date
                </span>
                <span className="font-medium text-zinc-300">
                  {new Date(project.createdAt).toLocaleDateString()} {new Date(project.createdAt).toLocaleTimeString()}
                </span>
              </div>

              <div className="flex items-center justify-between font-mono text-[11px]">
                <span>Project ID</span>
                <span className="text-zinc-400 truncate max-w-[150px]">{project.id}</span>
              </div>
            </div>

            {/* Duplicate Settings Button */}
            <Button
              size="md"
              variant="secondary"
              onClick={handleDuplicate}
              leftIcon={<Copy className="w-4 h-4" />}
              className="w-full text-xs font-semibold"
            >
              Duplicate Project Copy
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

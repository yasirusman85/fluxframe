import React from "react";
import { useNavigate } from "react-router-dom";
import { Star, Download, Copy, Trash2, Video as VideoIcon, Image as ImageIcon, Play } from "lucide-react";
import type { GenerationProject } from "../../types/project";
import { useProjectStore } from "../../store/project-store";
import { useUIStore } from "../../store/ui-store";
import { downloadMedia } from "../../lib/download";
import { Badge } from "../ui/Badge";
import { cn } from "../../lib/cn";

export interface MediaCardProps {
  project: GenerationProject;
}

export const MediaCard: React.FC<MediaCardProps> = ({ project }) => {
  const navigate = useNavigate();
  const { toggleFavorite, deleteProject, duplicateProject } = useProjectStore();
  const { addToast } = useUIStore();

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (project.outputUrl) {
      downloadMedia(project.outputUrl, `${project.title.toLowerCase().replace(/\s+/g, "-")}.svg`);
      addToast("Started media download", "success");
    }
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(project.id);
    addToast(project.favorite ? "Removed from favorites" : "Added to favorites", "info");
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = duplicateProject(project.id);
    addToast("Duplicated generation project", "success");
    navigate(`/projects/${newId}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${project.title}"?`)) {
      deleteProject(project.id);
      addToast("Project deleted", "error");
    }
  };

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}`)}
      className="group relative flex flex-col rounded-2xl bg-zinc-900/70 border border-zinc-800/80 overflow-hidden hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-950/20 transition-all duration-200 cursor-pointer"
    >
      {/* Media Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
        {project.thumbnailUrl || project.outputUrl ? (
          <img
            src={project.thumbnailUrl || project.outputUrl}
            alt={project.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-950">
            {project.type === "video" ? <VideoIcon className="w-8 h-8" /> : <ImageIcon className="w-8 h-8" />}
          </div>
        )}

        {/* Top Badges overlay */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
          <Badge variant={project.type === "video" ? "rose" : "violet"} size="sm">
            {project.type === "video" ? <VideoIcon className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
            {project.type.toUpperCase()}
          </Badge>

          <button
            onClick={handleFavorite}
            className={cn(
              "p-1.5 rounded-lg backdrop-blur-md transition-colors",
              project.favorite
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                : "bg-black/50 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100"
            )}
            title={project.favorite ? "Unfavorite" : "Favorite"}
          >
            <Star className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>

        {/* Video Play Icon overlay */}
        {project.type === "video" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
          </div>
        )}

        {/* Hover Quick Action Buttons overlay */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
          <button
            onClick={handleDuplicate}
            className="p-1.5 rounded-lg bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700/60 shadow"
            title="Duplicate Settings"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500 border border-violet-400/40 shadow"
            title="Download Media"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg bg-red-950/80 text-red-400 hover:text-red-200 border border-red-800/60 shadow"
            title="Delete Project"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Card Info Footer */}
      <div className="p-3.5 flex flex-col gap-1.5">
        <h4 className="font-bold text-sm text-zinc-100 line-clamp-1 group-hover:text-violet-300 transition-colors">
          {project.title}
        </h4>
        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
          {project.prompt}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-500">
          <span>{project.model}</span>
          <span>{project.aspectRatio}</span>
        </div>
      </div>
    </div>
  );
};

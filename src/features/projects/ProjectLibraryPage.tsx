import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  FolderKanban,
  Search,
  Filter,
  Star,
  Image as ImageIcon,
  Video as VideoIcon,
  Plus,
  ArrowUpDown,
  Trash2,
} from "lucide-react";
import { useProjectStore } from "../../store/project-store";
import { useUIStore } from "../../store/ui-store";
import { MediaCard } from "../../components/media/MediaCard";
import { Button } from "../../components/ui/Button";

export const ProjectLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { projects, clearAllProjects } = useProjectStore();
  const { addToast } = useUIStore();

  const [searchQuery, setSearchQuery] = useState("");
  const initialFilter = searchParams.get("filter") || "all";
  const [activeFilter, setActiveFilter] = useState<string>(initialFilter);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const filteredProjects = projects
    .filter((p) => {
      if (activeFilter === "image") return p.type === "image";
      if (activeFilter === "video") return p.type === "video";
      if (activeFilter === "favorites") return p.favorite;
      return true;
    })
    .filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.prompt.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const tA = new Date(a.createdAt).getTime();
      const tB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? tB - tA : tA - tB;
    });

  const handleFilterChange = (filterKey: string) => {
    setActiveFilter(filterKey);
    setSearchParams(filterKey === "all" ? {} : { filter: filterKey });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <FolderKanban className="w-6 h-6 text-violet-400" /> Project Library
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage, filter, duplicate, and download your visual AI generations ({projects.length} total)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => navigate("/create/image")}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Generation
          </Button>

          {projects.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (window.confirm("Clear all generation projects from library?")) {
                  clearAllProjects();
                  addToast("Cleared library history", "info");
                }
              }}
              leftIcon={<Trash2 className="w-3.5 h-3.5 text-red-400" />}
              className="text-xs text-red-400 hover:bg-red-950/30"
            >
              Clear History
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Type Filters */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800 w-full md:w-auto overflow-x-auto">
          {[
            { id: "all", label: "All Items", icon: Filter },
            { id: "image", label: "Images", icon: ImageIcon },
            { id: "video", label: "Videos", icon: VideoIcon },
            { id: "favorites", label: "Favorites", icon: Star },
          ].map((f) => {
            const isSelected = activeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => handleFilterChange(f.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  isSelected
                    ? "bg-violet-600 text-white shadow-md glow-accent"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <f.icon className="w-3.5 h-3.5" />
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, prompt, model..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <button
            onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors shrink-0"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-violet-400" />
            <span className="capitalize">{sortOrder}</span>
          </button>
        </div>
      </div>

      {/* Grid Display */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredProjects.map((project) => (
            <MediaCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="py-20 text-center space-y-4 rounded-3xl bg-zinc-900/40 border border-zinc-800 border-dashed max-w-lg mx-auto my-12">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mx-auto">
            <FolderKanban className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-white">No Projects Found</h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              {searchQuery || activeFilter !== "all"
                ? "No generations match your current search or filter criteria."
                : "You haven't generated any visual projects yet."}
            </p>
          </div>
          <div className="pt-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate("/create/image")}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Start Generating
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

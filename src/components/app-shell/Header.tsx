import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, Menu, Command, Loader2, Plus, Cpu } from "lucide-react";
import { useUIStore } from "../../store/ui-store";
import { useProjectStore } from "../../store/project-store";
import { Button } from "../ui/Button";

export const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleSidebar, setCommandPaletteOpen } = useUIStore();
  const { projects, activeProcessingId } = useProjectStore();

  const activeProject = activeProcessingId
    ? projects.find((p) => p.id === activeProcessingId)
    : undefined;

  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === "/") return "Explore";
    if (path.startsWith("/create/image")) return "Image Studio";
    if (path.startsWith("/create/video")) return "Video Studio";
    if (path.startsWith("/projects/")) return "Project Detail";
    if (path === "/projects") return "Projects Library";
    return "Studio";
  };

  return (
    <header className="h-16 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-4 md:px-6 flex items-center justify-between z-20 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
          aria-label="Toggle Navigation Drawer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm text-zinc-400 font-medium">
          <span className="hidden sm:inline text-zinc-500">Higgsfield Clone</span>
          <span className="hidden sm:inline text-zinc-600">/</span>
          <span className="text-zinc-100 font-semibold">{getBreadcrumbs()}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Active Generation Queue Status Banner */}
        {activeProject && (
          <div
            onClick={() => navigate(`/projects/${activeProject.id}`)}
            className="cursor-pointer flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-violet-950/70 border border-violet-800/60 text-violet-300 text-xs font-semibold hover:bg-violet-900/80 transition-colors animate-pulse"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
            <span>
              Generating ({activeProject.progress}%)...
            </span>
          </div>
        )}

        {/* AI Image Generation Status Badge */}
        <div
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-[11px] text-emerald-300 font-medium"
          title="AI image generation powered by a public Pollinations endpoint, with procedural fallback"
        >
          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          <span>AI Image Generation</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        </div>

        {/* Command Palette Trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all shadow-inner"
        >
          <Search className="w-3.5 h-3.5 text-zinc-400" />
          <span className="hidden md:inline">Quick Search...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono border border-zinc-700">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </button>

        {/* Quick Create Action */}
        <Button
          size="sm"
          variant="primary"
          onClick={() => navigate("/create/image")}
          leftIcon={<Plus className="w-4 h-4" />}
          className="hidden sm:flex"
        >
          Create
        </Button>

        {/* Account Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-amber-500 p-0.5 cursor-pointer hover:scale-105 transition-transform">
            <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center font-bold text-xs text-violet-300">
              FX
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

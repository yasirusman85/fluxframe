import React from "react";
import { NavLink } from "react-router-dom";
import {
  Compass,
  Clapperboard,
  Image as ImageIcon,
  Video as VideoIcon,
  Store,
  Mic,
  LayoutGrid,
  Grid,
  FolderKanban,
  Star,
  User,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";
import { useUIStore } from "../../store/ui-store";
import { cn } from "../../lib/cn";
import { Badge } from "../ui/Badge";

export const Sidebar: React.FC = () => {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  const navGroups = [
    {
      label: "Discover",
      items: [
        { name: "Explore Studio", path: "/", icon: Compass, badge: "New" },
      ],
    },
    {
      label: "Studios & Creators",
      items: [
        { name: "Cinema Studio", path: "/create/cinema", icon: Clapperboard, badge: "V4" },
        { name: "Image Studio", path: "/create/image", icon: ImageIcon },
        { name: "Video Studio", path: "/create/video", icon: VideoIcon, badge: "V2" },
        { name: "Marketing Studio", path: "/create/marketing", icon: Store, badge: "Ads" },
        { name: "LipSync Studio", path: "/create/lipsync", icon: Mic, badge: "Avatar" },
      ],
    },
    {
      label: "Workspaces",
      items: [
        { name: "Node Canvas", path: "/canvas", icon: LayoutGrid, badge: "Beta" },
        { name: "Creative Apps", path: "/apps", icon: Grid },
      ],
    },
    {
      label: "Library & Account",
      items: [
        { name: "All Projects", path: "/projects", icon: FolderKanban },
        { name: "Favorites", path: "/projects?filter=favorites", icon: Star },
        { name: "Account & Billing", path: "/account", icon: User },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        "relative flex flex-col bg-zinc-950 border-r border-zinc-800/80 transition-all duration-300 z-30 shrink-0 select-none",
        sidebarOpen ? "w-64" : "w-20"
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-zinc-800/60">
        <NavLink to="/" className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-950/60 shrink-0">
            <Layers className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                Higgsfield <span className="text-violet-400 font-normal text-xs uppercase px-1.5 py-0.5 rounded bg-violet-950 border border-violet-800/50">Clone</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">AI Visual Creative Suite</span>
            </div>
          )}
        </NavLink>

        <button
          onClick={toggleSidebar}
          className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/70 transition-colors"
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1.5">
            {sidebarOpen && (
              <h4 className="px-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                {group.label}
              </h4>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 group",
                    isActive
                      ? "bg-violet-600/15 text-violet-300 font-semibold border border-violet-500/30"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/90 border border-transparent"
                  )
                }
                title={!sidebarOpen ? item.name : undefined}
              >
                <item.icon className="w-5 h-5 shrink-0 transition-transform group-hover:scale-105 text-current" />
                {sidebarOpen && (
                  <span className="flex-1 truncate flex items-center justify-between">
                    {item.name}
                    {item.badge && (
                      <Badge variant="violet" size="sm">
                        {item.badge}
                      </Badge>
                    )}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {/* Prototype Status Footer */}
      <div className="p-3 border-t border-zinc-800/60 bg-zinc-900/40">
        {sidebarOpen ? (
          <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" /> Prototype Mode
              </span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/50">Unlimited</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-tight">
              Full client-side features enabled with zero credit limits.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center p-2 text-violet-400" title="Prototype Mode (Unlimited)">
            <Sparkles className="w-5 h-5" />
          </div>
        )}
      </div>
    </aside>
  );
};

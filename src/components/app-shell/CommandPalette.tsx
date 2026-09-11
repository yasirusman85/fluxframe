import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Compass, Image as ImageIcon, Video as VideoIcon, FolderKanban, Sparkles, Command } from "lucide-react";
import { useUIStore } from "../../store/ui-store";
import { IMAGE_MODELS, VIDEO_MODELS, PRESET_PROMPTS } from "../../lib/demo-assets";
import { Modal } from "../ui/Modal";

export const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const navigateTo = (path: string) => {
    navigate(path);
    setCommandPaletteOpen(false);
    setQuery("");
  };

  const pages = [
    { title: "Explore Studio", category: "Navigation", path: "/", icon: Compass },
    { title: "Image Studio Workspace", category: "Navigation", path: "/create/image", icon: ImageIcon },
    { title: "Video Studio Workspace", category: "Navigation", path: "/create/video", icon: VideoIcon },
    { title: "Project Library & History", category: "Navigation", path: "/projects", icon: FolderKanban },
  ];

  const models = [...IMAGE_MODELS, ...VIDEO_MODELS].map((m) => ({
    title: `${m.name} (${m.type === "image" ? "Image" : "Video"})`,
    category: "Models",
    path: `/create/${m.type}?model=${m.id}`,
    icon: m.type === "image" ? ImageIcon : VideoIcon,
  }));

  const presets = PRESET_PROMPTS.map((p) => ({
    title: p.title,
    category: "Preset Prompts",
    path: `/create/${p.type}?prompt=${encodeURIComponent(p.prompt)}&model=${p.model}`,
    icon: Sparkles,
  }));

  const allItems = [...pages, ...models, ...presets];

  const filtered = query
    ? allItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      )
    : allItems.slice(0, 8);

  return (
    <Modal
      isOpen={commandPaletteOpen}
      onClose={() => {
        setCommandPaletteOpen(false);
        setQuery("");
      }}
      className="p-0 max-w-xl bg-zinc-950/95 backdrop-blur-xl border-zinc-800"
    >
      <div className="flex items-center px-4 py-3 border-b border-zinc-800 gap-3">
        <Search className="w-5 h-5 text-zinc-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a command, search models, or jump to page..."
          className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          autoFocus
        />
        <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono border border-zinc-700">
          ESC
        </kbd>
      </div>

      <div className="max-h-80 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            No matching tools or prompts found for &quot;{query}&quot;
          </div>
        ) : (
          filtered.map((item, index) => (
            <button
              key={`${item.path}-${index}`}
              onClick={() => navigateTo(item.path)}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-violet-950/40 hover:border-violet-800/40 border border-transparent transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-zinc-900 text-zinc-400 group-hover:text-violet-300 group-hover:bg-zinc-800">
                  <item.icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-200 group-hover:text-white">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {item.category}
                  </div>
                </div>
              </div>
              <span className="text-xs text-zinc-500 group-hover:text-violet-400 font-medium">
                Jump &rarr;
              </span>
            </button>
          ))
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/60 border-t border-zinc-800 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1">
          <Command className="w-3 h-3" /> Navigation Command Center
        </span>
        <span>Use &uarr; &darr; to navigate, Enter to select</span>
      </div>
    </Modal>
  );
};

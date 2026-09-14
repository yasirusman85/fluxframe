import React, { useState } from "react";
import {
  Layers,
  Sparkles,
  Plus,
  ZoomIn,
  ZoomOut,
  Trash2,
  Image as ImageIcon,
  Video as VideoIcon,
  Mic,
  Cpu,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { generateVisualDataUrl } from "../../lib/demo-assets";

interface Node {
  id: string;
  type: "prompt" | "image" | "video" | "lipsync" | "upscale";
  title: string;
  x: number;
  y: number;
  content?: string;
  model?: string;
  previewUrl?: string;
}

export const CanvasPage: React.FC = () => {
  const [zoom, setZoom] = useState(1);
  const [nodes, setNodes] = useState<Node[]>([
    {
      id: "node-1",
      type: "prompt",
      title: "Hero Prompt Node",
      x: 80,
      y: 120,
      content: "A cybernetic obsidian valkyrie with glowing blue neon trim, dramatic volumetric smoke, shot on 85mm lens",
    },
    {
      id: "node-2",
      type: "image",
      title: "Flux Realism v2 Engine",
      x: 420,
      y: 80,
      model: "flux-realism-v2",
      previewUrl: generateVisualDataUrl("Obsidian Valkyrie", "image", "16:9", 0),
    },
    {
      id: "node-3",
      type: "video",
      title: "Kling 3.0 Motion Node",
      x: 780,
      y: 160,
      model: "kling-3-cinema",
      previewUrl: generateVisualDataUrl("Obsidian Motion", "video", "16:9", 1),
    },
  ]);

  const [activeDragNode, setActiveDragNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleAddNode = (type: Node["type"]) => {
    const newId = `node-${Date.now()}`;
    const titles: Record<Node["type"], string> = {
      prompt: "New Prompt Node",
      image: "Image Generator Node",
      video: "Camera Motion Node",
      lipsync: "LipSync Avatar Node",
      upscale: "4K Master Upscaler",
    };

    setNodes((prev) => [
      ...prev,
      {
        id: newId,
        type,
        title: titles[type],
        x: 200 + Math.random() * 200,
        y: 200 + Math.random() * 150,
        content: type === "prompt" ? "Enter prompt details..." : undefined,
        previewUrl: type !== "prompt" ? generateVisualDataUrl(titles[type], "image", "16:9", Math.floor(Math.random() * 5)) : undefined,
      },
    ]);
  };

  const handleDeleteNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveDragNode(id);
    const node = nodes.find((n) => n.id === id);
    if (node) {
      setDragOffset({ x: e.clientX - node.x, y: e.clientY - node.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (activeDragNode) {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === activeDragNode
            ? { ...n, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y }
            : n
        )
      );
    }
  };

  const handleMouseUp = () => {
    setActiveDragNode(null);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative w-full h-[calc(100vh-6rem)] overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-800 select-none shadow-2xl"
    >
      {/* Grid Pattern Background */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, #8b5cf6 1px, transparent 1px)`,
          backgroundSize: `${30 * zoom}px ${30 * zoom}px`,
        }}
      />

      {/* Top Toolbar Header */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-2 px-4 shadow-xl backdrop-blur-md">
          <Layers className="w-5 h-5 text-violet-400" />
          <div>
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              Node Canvas <Badge variant="violet" size="sm">Beta 2.0</Badge>
            </h2>
            <p className="text-[10px] text-zinc-400">Infinite visual workflow studio</p>
          </div>
        </div>

        {/* Node Creation Palette */}
        <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-1.5 shadow-xl backdrop-blur-md">
          <Button size="sm" variant="ghost" onClick={() => handleAddNode("prompt")} leftIcon={<Plus className="w-3.5 h-3.5" />}>
            + Prompt
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleAddNode("image")} leftIcon={<ImageIcon className="w-3.5 h-3.5" />}>
            + Image Node
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleAddNode("video")} leftIcon={<VideoIcon className="w-3.5 h-3.5" />}>
            + Video Motion
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleAddNode("lipsync")} leftIcon={<Mic className="w-3.5 h-3.5" />}>
            + LipSync
          </Button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-1 shadow-xl backdrop-blur-md">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold text-zinc-300 px-2">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Connection Wires SVG Layer */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
        {nodes.map((node, i) => {
          const nextNode = nodes[i + 1];
          if (!nextNode) return null;
          return (
            <path
              key={`wire-${node.id}-${nextNode.id}`}
              d={`M ${node.x + 280} ${node.y + 80} C ${node.x + 360} ${node.y + 80}, ${nextNode.x - 80} ${nextNode.y + 80}, ${nextNode.x} ${nextNode.y + 80}`}
              stroke="#8b5cf6"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              fill="none"
              opacity="0.7"
            />
          );
        })}
      </svg>

      {/* Node Workspace Area */}
      <div
        className="w-full h-full transition-transform duration-75"
        style={{ transform: `scale(${zoom})`, transformOrigin: "0 0" }}
      >
        {nodes.map((node) => (
          <div
            key={node.id}
            onMouseDown={(e) => handleMouseDown(e, node.id)}
            style={{ left: `${node.x}px`, top: `${node.y}px` }}
            className={`absolute w-72 rounded-2xl bg-zinc-900 border p-4 space-y-3 shadow-2xl cursor-grab active:cursor-grabbing transition-shadow z-20 ${
              activeDragNode === node.id
                ? "border-violet-500 shadow-violet-950/80 ring-2 ring-violet-500/30"
                : "border-zinc-800 hover:border-zinc-700"
            }`}
          >
            {/* Node Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-950 text-violet-400 border border-violet-800/50 flex items-center justify-center">
                  {node.type === "prompt" && <Sparkles className="w-4 h-4" />}
                  {node.type === "image" && <ImageIcon className="w-4 h-4" />}
                  {node.type === "video" && <VideoIcon className="w-4 h-4" />}
                  {node.type === "lipsync" && <Mic className="w-4 h-4" />}
                  {node.type === "upscale" && <Cpu className="w-4 h-4" />}
                </div>
                <span className="font-bold text-xs text-white">{node.title}</span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNode(node.id);
                }}
                className="text-zinc-500 hover:text-rose-400 p-1 transition-colors"
                title="Delete node"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Node Content */}
            {node.type === "prompt" ? (
              <textarea
                rows={3}
                value={node.content}
                onChange={(e) => {
                  const val = e.target.value;
                  setNodes((prev) =>
                    prev.map((n) => (n.id === node.id ? { ...n, content: val } : n))
                  );
                }}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-none"
              />
            ) : (
              <div className="space-y-2">
                {node.previewUrl && (
                  <div className="aspect-video rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800">
                    <img src={node.previewUrl} alt={node.title} className="w-full h-full object-cover" />
                  </div>
                )}
                {node.model && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">Model:</span>
                    <Badge variant="violet" size="sm">{node.model}</Badge>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

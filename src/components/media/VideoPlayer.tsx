import React, { useState, useEffect } from "react";
import { Play, Pause, Maximize2, RotateCcw } from "lucide-react";
import { cn } from "../../lib/cn";

export interface VideoPlayerProps {
  src: string;
  title?: string;
  duration?: number;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  title,
  duration = 5,
  className,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) return 0;
          return prev + 100 / (duration * 10);
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  return (
    <div
      className={cn(
        "relative w-full h-full min-h-[350px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 flex items-center justify-center group select-none",
        className
      )}
    >
      {/* Video / SVG Animation display */}
      <img
        src={src}
        alt={title || "Generated motion visual"}
        className={cn(
          "w-full h-full object-contain transition-transform duration-700",
          isPlaying && "scale-[1.02]"
        )}
      />

      {/* Center Big Play overlay */}
      <button
        onClick={togglePlay}
        className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors"
      >
        <div className="w-14 h-14 rounded-full bg-violet-600/90 text-white flex items-center justify-center shadow-xl glow-accent transform group-hover:scale-110 transition-transform">
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
        </div>
      </button>

      {/* Video Control Bar */}
      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-2 z-10 opacity-90 group-hover:opacity-100 transition-opacity">
        {/* Scrubbing Bar */}
        <div
          className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = ((e.clientX - rect.left) / rect.width) * 100;
            setProgress(pos);
          }}
        >
          <div
            className="bg-gradient-to-r from-violet-500 to-indigo-400 h-full rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-300 font-semibold">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="hover:text-violet-400">
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button onClick={() => setProgress(0)} className="hover:text-violet-400">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <span>
              {Math.floor((progress / 100) * duration)}s / {duration}s
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-violet-950 text-violet-300 text-[10px] border border-violet-800/50">
              60 FPS FX
            </span>
            <button
              onClick={(e) => {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  e.currentTarget.parentElement?.parentElement?.parentElement?.requestFullscreen();
                }
              }}
              className="hover:text-violet-400"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

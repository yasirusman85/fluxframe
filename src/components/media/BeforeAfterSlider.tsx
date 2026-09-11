import React, { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "../../lib/cn";

export interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeUrl,
  afterUrl,
  beforeLabel = "Original / Draft",
  afterLabel = "AI Enhanced output",
  className,
}) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleMove = (clientPositionX: number, containerRect: DOMRect) => {
    const x = clientPositionX - containerRect.left;
    let percentage = (x / containerRect.width) * 100;
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;
    setSliderPos(percentage);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const containerRect = e.currentTarget.getBoundingClientRect();
    handleMove(e.touches[0].clientX, containerRect);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const containerRect = e.currentTarget.getBoundingClientRect();
    handleMove(e.clientX, containerRect);
  };

  return (
    <div
      className={cn(
        "relative w-full h-full min-h-[350px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 select-none cursor-ew-resize",
        className
      )}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
    >
      {/* After image (background layer) */}
      <img
        src={afterUrl}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
      />

      {/* Before image (clipped top layer) */}
      <div
        className="absolute inset-y-0 left-0 overflow-hidden pointer-events-none"
        style={{ width: `${sliderPos}%` }}
      >
        <img
          src={beforeUrl}
          alt={beforeLabel}
          className="absolute top-0 left-0 max-w-none h-full object-contain filter grayscale opacity-75"
          style={{ width: "100%", minWidth: "100%" }}
        />
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[11px] font-bold text-zinc-300 pointer-events-none border border-white/10">
        {beforeLabel}
      </div>
      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-violet-950/80 backdrop-blur-md text-[11px] font-bold text-violet-300 pointer-events-none border border-violet-500/30">
        {afterLabel}
      </div>

      {/* Slider Divider Bar */}
      <div
        className="absolute inset-y-0 w-0.5 bg-white shadow-xl pointer-events-none"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-zinc-950 border border-violet-400/60 shadow-lg flex items-center justify-center text-violet-300">
          <SlidersHorizontal className="w-4 h-4 rotate-90" />
        </div>
      </div>
    </div>
  );
};

import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import type { CameraMotionSettings } from "../../types/project";
import type { RenderLook } from "../../lib/catalog";
import type { createMotionDrawer as createMotionDrawerFn } from "../../lib/render/motion";
import { loadImageElement } from "../../lib/image-utils";
import { coverFit } from "../../lib/render/drawing";
import { usePrefersReducedMotion } from "../../hooks/useMediaQuery";
import { cn } from "../../lib/cn";
import { Skeleton } from "../ui";

export interface MotionPreviewProps {
  imageUrl: string;
  camera: CameraMotionSettings;
  /** 0..100, defaults to 50. */
  motionStrength?: number;
  look?: RenderLook;
  className?: string;
  /** Loop length in ms (default 4000). */
  durationMs?: number;
}

type CreateDrawer = typeof createMotionDrawerFn;
type Drawer = ReturnType<CreateDrawer>;
interface MotionEngine {
  createMotionDrawer: CreateDrawer;
}

/** Largest canvas buffer width; previews are lightweight by design. */
const MAX_BUFFER_WIDTH = 640;
const MAX_DPR = 2;

let enginePromise: Promise<MotionEngine> | null = null;
/** The motion engine is loaded on demand so studios that never preview motion do not download it. */
function loadEngine(): Promise<MotionEngine> {
  enginePromise ??= import("../../lib/render/motion");
  return enginePromise;
}

/** Static cover-fit frame used until the engine is ready (or if it fails to load). */
function drawStatic(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number): void {
  const rect = coverFit(image.naturalWidth || 1, image.naturalHeight || 1, width, height);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, rect.x, rect.y, rect.w, rect.h);
}

/** Small looping canvas preview of a camera move, drawn by the same engine that renders the final clip. */
export function MotionPreview({ imageUrl, camera, motionStrength, look, className, durationMs = 4000 }: MotionPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startRef = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);

  // Latest settings are read through a ref so the loop is only rebuilt when their *values* change.
  const settingsRef = useRef({ camera, motionStrength, look });
  useEffect(() => {
    settingsRef.current = { camera, motionStrength, look };
  });
  const settingsKey = JSON.stringify([camera, motionStrength ?? null, look ?? null]);

  useEffect(() => {
    let alive = true;
    setImage(null);
    setFailed(false);
    loadImageElement(imageUrl)
      .then((element) => {
        if (alive) setImage(element);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [imageUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!image || !canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let disposed = false;
    let raf = 0;
    let frame = 0;
    let create: CreateDrawer | null = null;
    let drawer: Drawer | null = null;

    /** Sizes the buffer to the container (DPR-aware, capped) and returns it. */
    const fit = () => {
      const rect = container.getBoundingClientRect();
      const cssWidth = Math.max(1, rect.width || 320);
      const cssHeight = Math.max(1, rect.height || (cssWidth * 9) / 16);
      const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
      const scale = Math.min(dpr, MAX_BUFFER_WIDTH / cssWidth);
      const width = Math.max(1, Math.round(cssWidth * scale));
      const height = Math.max(1, Math.round(cssHeight * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      return { width, height };
    };

    const build = () => {
      const { width, height } = fit();
      if (!create) return;
      const { camera: cam, motionStrength: strength, look: renderLook } = settingsRef.current;
      drawer = create({
        image: { source: image, width: image.naturalWidth, height: image.naturalHeight },
        width,
        height,
        durationMs,
        camera: cam,
        motionStrength: strength ?? 50,
        look: renderLook,
        lightweight: true,
      });
    };

    const paint = (progress: number, timeMs: number) => {
      if (drawer) drawer.draw(ctx, progress, timeMs, frame++);
      else drawStatic(ctx, image, canvas.width, canvas.height);
    };

    const paintStill = () => paint(0.5, durationMs / 2);

    const tick = (now: number) => {
      if (disposed) return;
      if (startRef.current === null) startRef.current = now;
      const elapsed = (now - startRef.current) % durationMs;
      paint(elapsed / durationMs, elapsed);
      raf = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const start = () => {
      stop();
      if (reducedMotion) {
        paintStill();
        return;
      }
      if (document.hidden) return;
      raf = requestAnimationFrame(tick);
    };

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            build();
            if (reducedMotion) paintStill();
          })
        : null;
    observer?.observe(container);

    // Paint something immediately, then swap in the real drawer once the engine is loaded.
    fit();
    paint(0, 0);
    loadEngine()
      .then((engine) => {
        if (disposed) return;
        create = engine.createMotionDrawer;
        build();
        start();
      })
      .catch(() => {
        if (!disposed) start();
      });

    return () => {
      disposed = true;
      stop();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [image, durationMs, reducedMotion, settingsKey]);

  return (
    <div ref={containerRef} data-testid="motion-preview" className={cn("relative aspect-video overflow-hidden rounded-xl bg-surface-2", className)}>
      {image ? (
        <canvas ref={canvasRef} role="img" aria-label="Camera motion preview" className="block h-full w-full" />
      ) : failed ? (
        <div className="absolute inset-0 flex items-center justify-center gap-1.5 text-xs text-zinc-400">
          <ImageOff className="h-4 w-4" aria-hidden />
          Preview unavailable
        </div>
      ) : (
        <Skeleton className="absolute inset-0 rounded-none" />
      )}
      {image && (
        <span aria-hidden className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
          {reducedMotion ? "Preview" : "Live preview"}
        </span>
      )}
    </div>
  );
}

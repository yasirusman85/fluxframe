import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import { AlertCircle, Download, Maximize, Minimize, Pause, Play, Repeat, Volume2, VolumeX } from "lucide-react";
import { cn } from "../../lib/cn";
import { formatDuration } from "../../lib/format";
import { IconButton, Spinner } from "../ui";

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  /** Autoplay implies muted (browser autoplay policy). */
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
  onDownload?: () => void;
  /** data-testid of the <video>; defaults to "output-video". */
  testId?: string;
}

const IDLE_HIDE_MS = 2000;
const SEEK_STEP_SECONDS = 2;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const noop = () => undefined;

type FullscreenVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

/** Real <video> with custom, keyboard-friendly controls. Handles blob/object URLs and MediaRecorder WebMs. */
export function VideoPlayer(props: VideoPlayerProps) {
  // Remount the internals when the source changes so every bit of playback state resets.
  return <Player key={props.src} {...props} />;
}

function Player({ src, poster, title, autoPlay = false, loop = false, className, onDownload, testId }: VideoPlayerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const idleTimer = useRef<number>(0);
  const fixingDuration = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(autoPlay);
  const [looping, setLooping] = useState(loop);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);

  useEffect(() => setLooping(loop), [loop]);
  useEffect(() => setMuted(autoPlay), [autoPlay]);
  useEffect(() => () => window.clearTimeout(idleTimer.current), []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControlsVisible(false);
    }, IDLE_HIDE_MS);
  }, []);

  const play = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    Promise.resolve(video.play()).catch(noop);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) play();
    else video.pause();
  }, [play]);

  const seekTo = useCallback(
    (seconds: number) => {
      const video = videoRef.current;
      if (!video) return;
      const max = duration || (Number.isFinite(video.duration) ? video.duration : 0);
      const next = clamp(seconds, 0, max);
      video.currentTime = next;
      setCurrentTime(next);
    },
    [duration],
  );

  const seekBy = (delta: number) => seekTo((videoRef.current?.currentTime ?? 0) + delta);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const toggleFullscreen = () => {
    const wrapper = wrapperRef.current;
    const video = videoRef.current as FullscreenVideo | null;
    if (!wrapper) return;
    if (document.fullscreenElement) {
      Promise.resolve(document.exitFullscreen?.()).catch(noop);
      return;
    }
    if (typeof wrapper.requestFullscreen === "function") {
      Promise.resolve(wrapper.requestFullscreen()).catch(noop);
      return;
    }
    video?.webkitEnterFullscreen?.(); // iOS Safari only allows the video element itself
  };

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === wrapperRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // timeupdate only fires ~4×/s; drive the scrubber with rAF while playing for a smooth thumb.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const video = videoRef.current;
      if (video && !fixingDuration.current) setCurrentTime(video.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const onLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    if (Number.isFinite(video.duration)) {
      setDuration(video.duration);
      return;
    }
    // MediaRecorder WebMs report Infinity until the tail is parsed: seek far past the end to force it.
    fixingDuration.current = true;
    video.currentTime = 1e101;
  };

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    if (fixingDuration.current) {
      fixingDuration.current = false;
      if (Number.isFinite(video.duration)) setDuration(video.duration);
      video.currentTime = 0;
      setCurrentTime(0);
      if (autoPlay) play();
      return;
    }
    setCurrentTime(video.currentTime);
  };

  const onDurationChange = () => {
    const video = videoRef.current;
    if (video && Number.isFinite(video.duration)) setDuration(video.duration);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const onWrapper = target === event.currentTarget;
    const onRange = target.tagName === "INPUT";
    switch (event.key) {
      case " ":
        if (!onWrapper) return;
        event.preventDefault();
        togglePlay();
        break;
      case "k":
      case "K":
        event.preventDefault();
        togglePlay();
        break;
      case "ArrowLeft":
        if (onRange) return;
        event.preventDefault();
        seekBy(-SEEK_STEP_SECONDS);
        break;
      case "ArrowRight":
        if (onRange) return;
        event.preventDefault();
        seekBy(SEEK_STEP_SECONDS);
        break;
      case "m":
      case "M":
        event.preventDefault();
        toggleMute();
        break;
      case "f":
      case "F":
        event.preventDefault();
        toggleFullscreen();
        break;
      default:
        return;
    }
    showControls();
  };

  const progress = duration > 0 ? clamp((currentTime / duration) * 100, 0, 100) : 0;
  const visible = controlsVisible || !playing;
  const iconClass = "h-4 w-4";

  return (
    <div
      ref={wrapperRef}
      role="group"
      aria-label={title ?? "Video player"}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseMove={showControls}
      onPointerDown={showControls}
      onFocus={showControls}
      onMouseLeave={() => {
        if (videoRef.current && !videoRef.current.paused) setControlsVisible(false);
      }}
      className={cn("relative select-none overflow-hidden rounded-xl bg-black outline-none", fullscreen && "flex items-center justify-center", className)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        autoPlay={autoPlay}
        muted={muted}
        loop={looping}
        data-testid={testId ?? "output-video"}
        className={cn("block h-full w-full object-contain", fullscreen && "max-h-full")}
        onClick={togglePlay}
        onPlay={() => {
          setPlaying(true);
          showControls();
        }}
        onPause={() => {
          setPlaying(false);
          setControlsVisible(true);
        }}
        onEnded={() => setPlaying(false)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onCanPlay={() => setBuffering(false)}
        onLoadedMetadata={onLoadedMetadata}
        onDurationChange={onDurationChange}
        onTimeUpdate={onTimeUpdate}
        onVolumeChange={() => setMuted(videoRef.current?.muted ?? muted)}
        onError={() => setError("This video could not be played.")}
      />

      {!playing && !error && (
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/20 backdrop-blur">
            <Play className="ml-0.5 h-6 w-6 fill-current" />
          </span>
        </div>
      )}
      {buffering && playing && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Spinner />
        </div>
      )}
      {error && (
        <div role="alert" className="absolute inset-0 flex items-center justify-center gap-2 bg-black/70 px-4 text-center text-sm text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          {error}
        </div>
      )}

      <div
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pb-2 pt-8 transition-opacity duration-200",
          visible ? "opacity-100" : "opacity-0 focus-within:opacity-100",
        )}
      >
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.05}
          value={Math.min(currentTime, duration || 0)}
          disabled={!duration}
          aria-label="Seek"
          aria-valuetext={`${formatDuration(currentTime)} of ${formatDuration(duration)}`}
          onChange={(event) => seekTo(Number(event.target.value))}
          style={{ "--range-progress": `${progress}%` } as CSSProperties}
          className="w-full disabled:opacity-40"
        />
        <div className="flex items-center gap-1">
          <IconButton size="sm" label={playing ? "Pause" : "Play"} icon={playing ? <Pause className={iconClass} aria-hidden /> : <Play className={iconClass} aria-hidden />} onClick={togglePlay} className="text-white hover:bg-white/10 hover:text-white" />
          <span className="ml-1 font-mono text-[11px] tabular-nums text-zinc-200">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>
          <span className="flex-1" />
          <IconButton size="sm" label={looping ? "Disable loop" : "Loop"} active={looping} icon={<Repeat className={iconClass} aria-hidden />} onClick={() => setLooping((value) => !value)} className="text-zinc-200 hover:bg-white/10 hover:text-white" />
          <IconButton size="sm" label={muted ? "Unmute" : "Mute"} icon={muted ? <VolumeX className={iconClass} aria-hidden /> : <Volume2 className={iconClass} aria-hidden />} onClick={toggleMute} className="text-zinc-200 hover:bg-white/10 hover:text-white" />
          {onDownload && <IconButton size="sm" label="Download video" icon={<Download className={iconClass} aria-hidden />} onClick={onDownload} className="text-zinc-200 hover:bg-white/10 hover:text-white" />}
          <IconButton size="sm" label={fullscreen ? "Exit fullscreen" : "Fullscreen"} icon={fullscreen ? <Minimize className={iconClass} aria-hidden /> : <Maximize className={iconClass} aria-hidden />} onClick={toggleFullscreen} className="text-zinc-200 hover:bg-white/10 hover:text-white" />
        </div>
      </div>
    </div>
  );
}

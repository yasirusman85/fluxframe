import { Aperture, Camera, Focus, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import type { Aperture as ApertureValue, CameraMotionSettings, FocalLength } from "../../types/project";
import { APERTURES, CAMERA_PRESETS, DEFAULT_CAMERA, FOCAL_LENGTHS, cameraFromPreset, describeCamera } from "../../lib/catalog";
import type { CameraPreset } from "../../lib/catalog";
import { cn } from "../../lib/cn";
import { Card, IconButton, Slider } from "../ui";
import { MotionPreview } from "./MotionPreview";

export interface CameraMotionControlProps {
  value: CameraMotionSettings;
  onChange: (value: CameraMotionSettings) => void;
  /** When given, a live canvas preview of the move is rendered above the controls. */
  previewImageUrl?: string;
  /** 0..100, forwarded to the preview. */
  motionStrength?: number;
  /** Hides the summary line and packs the sliders into three columns. */
  compact?: boolean;
}

type Axis = "pan" | "tilt" | "zoom" | "dolly" | "orbit" | "roll";

interface AxisSpec {
  axis: Axis;
  label: string;
  min: number;
  max: number;
  unit: "°" | "%";
}

const AXES: AxisSpec[] = [
  { axis: "pan", label: "Pan", min: -90, max: 90, unit: "°" },
  { axis: "tilt", label: "Tilt", min: -90, max: 90, unit: "°" },
  { axis: "zoom", label: "Zoom", min: -100, max: 100, unit: "%" },
  { axis: "dolly", label: "Dolly", min: -100, max: 100, unit: "%" },
  { axis: "orbit", label: "Orbit", min: -180, max: 180, unit: "°" },
  { axis: "roll", label: "Roll", min: -45, max: 45, unit: "°" },
];

const CATEGORIES: CameraPreset["category"][] = ["Cinematic", "Dynamic", "Specialty"];

const chipClass = (selected: boolean) =>
  cn(
    "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
    selected ? "border-brand-500/60 bg-brand-500/15 text-brand-200" : "border-zinc-800 bg-surface-2 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
  );

function GroupLabel({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 [&>svg]:h-3 [&>svg]:w-3">
      {icon}
      {children}
    </span>
  );
}

const signed = (value: number, unit: string) => `${value > 0 ? "+" : ""}${value}${unit}`;

/** Camera choreography editor: preset chips, per-axis sliders, lens optics and an optional live preview. */
export function CameraMotionControl({ value, onChange, previewImageUrl, motionStrength, compact = false }: CameraMotionControlProps) {
  const setAxis = (axis: Axis, next: number) => onChange({ ...value, [axis]: next, preset: undefined });
  const activePreset = CAMERA_PRESETS.find((preset) => preset.id === value.preset);

  const reset = () => onChange({ ...DEFAULT_CAMERA, focalLength: value.focalLength, aperture: value.aperture });

  return (
    <Card padding="sm" className="space-y-4">
      {previewImageUrl && <MotionPreview imageUrl={previewImageUrl} camera={value} motionStrength={motionStrength} className="aspect-video rounded-xl" />}

      <div className="flex items-center justify-between gap-2">
        <GroupLabel icon={<Camera aria-hidden />}>Camera motion</GroupLabel>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-400">{activePreset ? activePreset.name : "Custom move"}</span>
          <IconButton size="sm" label="Reset camera" icon={<RotateCcw className="h-3.5 w-3.5" aria-hidden />} onClick={reset} />
        </div>
      </div>

      <div role="group" aria-label="Camera presets" className="space-y-2">
        {CATEGORIES.map((category) => (
          <div key={category} className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 w-14 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{category}</span>
            {CAMERA_PRESETS.filter((preset) => preset.category === category).map((preset) => {
              const selected = preset.id === value.preset;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={selected}
                  title={preset.description}
                  data-testid={`camera-preset-${preset.id}`}
                  onClick={() => onChange(cameraFromPreset(preset, value))}
                  className={chipClass(selected)}
                >
                  {preset.name}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className={cn("grid", compact ? "grid-cols-3 gap-x-3 gap-y-2" : "grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2")}>
        {AXES.map(({ axis, label, min, max, unit }) => (
          <Slider
            key={axis}
            label={label}
            value={value[axis]}
            min={min}
            max={max}
            onChange={(next) => setAxis(axis, next)}
            formatValue={(current) => signed(current, unit)}
            testId={`camera-slider-${axis}`}
          />
        ))}
      </div>

      <div className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
        <div className="space-y-1.5">
          <GroupLabel icon={<Focus aria-hidden />}>Focal length</GroupLabel>
          <div role="group" aria-label="Focal length" className="flex flex-wrap gap-1.5">
            {FOCAL_LENGTHS.map((focal: FocalLength) => (
              <button
                key={focal}
                type="button"
                aria-pressed={value.focalLength === focal}
                data-testid={`focal-${focal}`}
                onClick={() => onChange({ ...value, focalLength: focal })}
                className={cn(chipClass(value.focalLength === focal), "font-mono")}
              >
                {focal}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <GroupLabel icon={<Aperture aria-hidden />}>Aperture</GroupLabel>
          <div role="group" aria-label="Aperture" className="flex flex-wrap gap-1.5">
            {APERTURES.map((aperture: ApertureValue) => (
              <button
                key={aperture}
                type="button"
                aria-pressed={value.aperture === aperture}
                data-testid={`aperture-${aperture.replace("f/", "")}`}
                onClick={() => onChange({ ...value, aperture })}
                className={cn(chipClass(value.aperture === aperture), "font-mono")}
              >
                {aperture}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!compact && (
        <p className="rounded-lg border border-zinc-800/80 bg-surface-2/70 px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-400" aria-live="polite">
          {describeCamera(value)}
        </p>
      )}
    </Card>
  );
}

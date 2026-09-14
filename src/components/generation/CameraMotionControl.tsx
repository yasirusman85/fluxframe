import React from "react";
import { Camera, Sliders, Compass, Eye } from "lucide-react";
import { CAMERA_PRESETS, type CameraPreset } from "../../lib/demo-assets";
import type { CameraMotionSettings } from "../../types/project";
import { Badge } from "../ui/Badge";

interface CameraMotionControlProps {
  value: CameraMotionSettings;
  onChange: (settings: CameraMotionSettings) => void;
}

const FOCAL_LENGTHS = ["18mm", "24mm", "35mm", "50mm", "85mm", "135mm"];
const APERTURES = ["f/1.4", "f/2.8", "f/5.6", "f/11", "f/16"];

export const CameraMotionControl: React.FC<CameraMotionControlProps> = ({
  value,
  onChange,
}) => {
  const handlePresetSelect = (preset: CameraPreset) => {
    onChange({
      ...value,
      preset: preset.id,
      pan: preset.pan,
      tilt: preset.tilt,
      zoom: preset.zoom,
      dolly: preset.dolly,
      crane: preset.crane,
      orbit: preset.orbit,
    });
  };

  return (
    <div className="space-y-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/90 p-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5 uppercase tracking-wider">
          <Camera className="w-4 h-4 text-violet-400" /> Cinema Camera Choreography
        </h4>
        <Badge variant="violet" size="sm">
          Multi-Axis WAN V2
        </Badge>
      </div>

      {/* Camera Presets Selector */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
          <Compass className="w-3.5 h-3.5 text-zinc-500" /> Cinematic Presets
        </label>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
          {CAMERA_PRESETS.map((preset) => {
            const isSelected = value.preset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-violet-600 text-white font-bold border border-violet-400/50 shadow-sm"
                    : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-transparent"
                }`}
                title={preset.description}
              >
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Axis Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {/* Pan */}
        <div className="space-y-1 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/60">
          <div className="flex justify-between text-[11px] font-medium text-zinc-400">
            <span>Pan (Horizontal)</span>
            <span className="font-mono text-violet-400 font-bold">{value.pan > 0 ? `+${value.pan}°` : `${value.pan}°`}</span>
          </div>
          <input
            type="range"
            min="-90"
            max="90"
            value={value.pan}
            onChange={(e) => onChange({ ...value, pan: Number(e.target.value), preset: undefined })}
            className="w-full accent-violet-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Tilt */}
        <div className="space-y-1 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/60">
          <div className="flex justify-between text-[11px] font-medium text-zinc-400">
            <span>Tilt (Vertical)</span>
            <span className="font-mono text-violet-400 font-bold">{value.tilt > 0 ? `+${value.tilt}°` : `${value.tilt}°`}</span>
          </div>
          <input
            type="range"
            min="-90"
            max="90"
            value={value.tilt}
            onChange={(e) => onChange({ ...value, tilt: Number(e.target.value), preset: undefined })}
            className="w-full accent-violet-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Zoom */}
        <div className="space-y-1 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/60">
          <div className="flex justify-between text-[11px] font-medium text-zinc-400">
            <span>Zoom (Depth)</span>
            <span className="font-mono text-violet-400 font-bold">{value.zoom > 0 ? `+${value.zoom}%` : `${value.zoom}%`}</span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={value.zoom}
            onChange={(e) => onChange({ ...value, zoom: Number(e.target.value), preset: undefined })}
            className="w-full accent-violet-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Advanced Optics Emulation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/60 text-xs">
        {/* Focal Length */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-zinc-500" /> Lens Focal Length
          </label>
          <div className="flex flex-wrap gap-1">
            {FOCAL_LENGTHS.map((focal) => (
              <button
                key={focal}
                type="button"
                onClick={() => onChange({ ...value, focalLength: focal })}
                className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-all ${
                  value.focalLength === focal
                    ? "bg-violet-600 text-white font-bold"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {focal}
              </button>
            ))}
          </div>
        </div>

        {/* Aperture */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-zinc-500" /> Aperture (Depth of Field)
          </label>
          <div className="flex flex-wrap gap-1">
            {APERTURES.map((ap) => (
              <button
                key={ap}
                type="button"
                onClick={() => onChange({ ...value, aperture: ap })}
                className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-all ${
                  value.aperture === ap
                    ? "bg-violet-600 text-white font-bold"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {ap}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

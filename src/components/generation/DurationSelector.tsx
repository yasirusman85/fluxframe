import { VIDEO_DURATIONS } from "../../lib/catalog";
import { SegmentedControl } from "../ui";
import type { SegmentOption } from "../ui";

export interface DurationSelectorProps {
  value: number;
  onChange: (value: number) => void;
  /** Seconds; defaults to the catalog durations (3 | 5 | 10). */
  options?: readonly number[];
}

function describeDuration(seconds: number): string {
  if (seconds <= 3) return "Preview";
  if (seconds >= 10) return "Long";
  return "Standard";
}

export function DurationSelector({ value, onChange, options = VIDEO_DURATIONS }: DurationSelectorProps) {
  const segments: SegmentOption<string>[] = options.map((seconds) => ({
    value: String(seconds),
    label: `${seconds}s`,
    description: describeDuration(seconds),
    testId: `duration-${seconds}`,
  }));

  return <SegmentedControl options={segments} value={String(value)} onChange={(next) => onChange(Number(next))} ariaLabel="Clip duration" columns={segments.length} size="sm" />;
}

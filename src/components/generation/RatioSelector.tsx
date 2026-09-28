import { ASPECT_RATIOS } from "../../lib/aspect";
import { SegmentedControl } from "../ui";
import type { SegmentOption } from "../ui";

export interface RatioSelectorProps {
  value: string;
  onChange: (value: string) => void;
  /** Subset of aspect ratio ids to offer; defaults to all six. */
  ratios?: string[];
  columns?: number;
}

const MAX_EDGE = 22;

/** Tiny box whose proportions mirror the ratio (longest edge = 22px). */
function RatioGlyph({ value }: { value: number }) {
  const width = value >= 1 ? MAX_EDGE : Math.round(MAX_EDGE * value);
  const height = value >= 1 ? Math.round(MAX_EDGE / value) : MAX_EDGE;
  return (
    <span aria-hidden className="flex items-center justify-center" style={{ width: MAX_EDGE, height: MAX_EDGE }}>
      <span className="block rounded-[3px] border-[1.5px] border-current" style={{ width, height }} />
    </span>
  );
}

export function RatioSelector({ value, onChange, ratios, columns }: RatioSelectorProps) {
  const options: SegmentOption<string>[] = ASPECT_RATIOS.filter((ratio) => !ratios || ratios.includes(ratio.id)).map((ratio) => ({
    value: ratio.id,
    label: ratio.label,
    description: ratio.description,
    icon: <RatioGlyph value={ratio.value} />,
    testId: `ratio-${ratio.id}`,
  }));

  return <SegmentedControl options={options} value={value} onChange={onChange} ariaLabel="Aspect ratio" columns={columns ?? options.length} size="sm" />;
}

import { useEffect, useRef, useState } from "react";
import { Wand2 } from "lucide-react";
import { PROMPT_ENHANCERS } from "../../lib/catalog";
import { Button } from "../ui";

export interface PromptEnhancerProps {
  prompt: string;
  onEnhance: (next: string) => void;
  /** Key of PROMPT_ENHANCERS; defaults to "cinematic". */
  style?: keyof typeof PROMPT_ENHANCERS;
  disabled?: boolean;
}

const ENHANCE_DELAY_MS = 400;

function enhancerFor(style?: string): string {
  return PROMPT_ENHANCERS[style ?? "cinematic"] ?? PROMPT_ENHANCERS.cinematic;
}

/** Deterministic: appends the style's enhancer clause and capitalises the first letter. */
function enhancePrompt(prompt: string, enhancer: string): string {
  const base = prompt.trim().replace(/[\s,.;]+$/, "");
  const next = `${base}, ${enhancer}`.trim();
  return next.charAt(0).toUpperCase() + next.slice(1);
}

export function PromptEnhancer({ prompt, onEnhance, style, disabled }: PromptEnhancerProps) {
  const [loading, setLoading] = useState(false);
  const timer = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const enhancer = enhancerFor(style);
  const trimmed = prompt.trim();
  const alreadyEnhanced = trimmed.toLowerCase().includes(enhancer.toLowerCase());
  const blocked = Boolean(disabled) || trimmed.length === 0 || alreadyEnhanced;

  const handleClick = () => {
    if (blocked || loading) return;
    setLoading(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setLoading(false);
      onEnhance(enhancePrompt(prompt, enhancer));
    }, ENHANCE_DELAY_MS);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      leftIcon={<Wand2 className="h-3.5 w-3.5 text-brand-400" aria-hidden />}
      isLoading={loading}
      disabled={blocked}
      onClick={handleClick}
      data-testid="enhance-button"
      title={alreadyEnhanced ? "This prompt already includes the enhancer" : `Add ${style ?? "cinematic"} detail to the prompt`}
      className="text-brand-300 hover:text-brand-200"
    >
      {loading ? "Enhancing…" : "Enhance"}
    </Button>
  );
}

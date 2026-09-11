import React, { useState } from "react";
import { Wand2 } from "lucide-react";
import { Button } from "../ui/Button";

export interface PromptEnhancerProps {
  prompt: string;
  onEnhance: (enhancedPrompt: string) => void;
}

export const PromptEnhancer: React.FC<PromptEnhancerProps> = ({
  prompt,
  onEnhance,
}) => {
  const [isEnhancing, setIsEnhancing] = useState(false);

  const enhanceModifiers = [
    "hyper-realistic 8k render, octane engine, volumetric lighting, photorealistic textures",
    "cinematic 35mm film grain, anamorphic lens flare, dramatic rim lighting, shallow depth of field",
    "vibrant cyberpunk neon glow, dark synthwave atmospheric fog, ultra detailed 16k",
    "award-winning studio lighting, golden ratio composition, masterpiece quality",
  ];

  const handleMagicEnhance = () => {
    if (!prompt.trim()) return;
    setIsEnhancing(true);

    setTimeout(() => {
      const modifier = enhanceModifiers[Math.floor(Math.random() * enhanceModifiers.length)];
      const enhanced = `${prompt.trim()}, ${modifier}`;
      onEnhance(enhanced);
      setIsEnhancing(false);
    }, 600);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleMagicEnhance}
      isLoading={isEnhancing}
      disabled={!prompt.trim()}
      leftIcon={<Wand2 className="w-3.5 h-3.5 text-violet-400" />}
      className="text-xs text-violet-300 hover:text-violet-200 hover:bg-violet-950/60 border border-violet-900/40"
    >
      Magic Enhance
    </Button>
  );
};

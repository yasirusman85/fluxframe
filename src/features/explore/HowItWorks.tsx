import React from "react";
import { Cpu, PenLine, Sparkles } from "lucide-react";
import { Badge } from "../../components/ui";

interface Step {
  title: string;
  body: string;
  note: string;
  icon: React.ReactNode;
}

const STEPS: Step[] = [
  {
    title: "Prompt",
    body: "Describe the shot, pick an engine style, ratio and — for video — a camera move. The composer above deep-links straight into a studio.",
    note: "Deterministic prompt enhancer",
    icon: <PenLine className="h-5 w-5" aria-hidden />,
  },
  {
    title: "AI keyframe via Pollinations",
    body: "The public image endpoint returns a real JPEG. It allows roughly one anonymous request every 15 seconds, so jobs queue and back off automatically.",
    note: "Pollinations · procedural fallback if it is down",
    icon: <Sparkles className="h-5 w-5" aria-hidden />,
  },
  {
    title: "In-browser render",
    body: "Canvas and MediaRecorder turn the keyframe into a .webm clip with grain, letterbox and light leaks. Nothing but the prompt ever leaves your machine.",
    note: "Motion engine · assets stored in IndexedDB",
    icon: <Cpu className="h-5 w-5" aria-hidden />,
  },
];

export const HowItWorks: React.FC = () => (
  <section aria-labelledby="how-heading" className="space-y-5">
    <div>
      <h2 id="how-heading" className="text-2xl font-extrabold tracking-tight text-white">
        How it works
      </h2>
      <p className="text-sm text-zinc-400">Three steps, no servers of our own.</p>
    </div>
    <ol className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {STEPS.map((step, index) => (
        <li key={step.title} className="relative flex gap-4 rounded-2xl border border-zinc-800/80 bg-surface-1 p-5">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-surface-2 text-brand-300">{step.icon}</span>
          <div className="min-w-0 space-y-2">
            <h3 className="text-sm font-bold text-white">
              <span className="mr-1.5 font-mono text-xs text-brand-400">0{index + 1}</span>
              {step.title}
            </h3>
            <p className="text-xs leading-relaxed text-zinc-400">{step.body}</p>
            <Badge variant="outline" size="sm">
              {step.note}
            </Badge>
          </div>
        </li>
      ))}
    </ol>
  </section>
);

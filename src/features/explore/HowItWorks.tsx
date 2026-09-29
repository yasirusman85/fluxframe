import React from "react";
import { Cpu, PenLine, Sparkles } from "lucide-react";
import { SectionHeading } from "./SectionHeading";

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
    icon: <PenLine className="h-4 w-4" aria-hidden />,
  },
  {
    title: "AI keyframe via Pollinations",
    body: "The public image endpoint returns a real JPEG. It allows roughly one anonymous request every 15 seconds, so jobs queue and back off automatically.",
    note: "Pollinations · procedural fallback if it is down",
    icon: <Sparkles className="h-4 w-4" aria-hidden />,
  },
  {
    title: "In-browser render",
    body: "Canvas and MediaRecorder turn the keyframe into a .webm clip with grain, letterbox and light leaks. Nothing but the prompt ever leaves your machine.",
    note: "Motion engine · assets stored in IndexedDB",
    icon: <Cpu className="h-4 w-4" aria-hidden />,
  },
];

/** Three-step explainer. */
export const HowItWorks: React.FC = () => (
  <section aria-labelledby="how-heading" className="lf-section-lg">
    <SectionHeading id="how-heading" title="How it works" subtitle="Three steps, no servers of our own." />
    <ol role="list" className="lf-container grid grid-cols-1 gap-2 md:grid-cols-3 lg:gap-3">
      {STEPS.map((step, index) => (
        <li key={step.title} className="flex gap-4 rounded-lg border border-ink-line bg-ink-raised p-5">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink-line bg-ink text-accent">
            {step.icon}
          </span>
          <div className="min-w-0 space-y-2">
            <h3 className="lf-card-title text-white">
              <span className="mr-1.5 font-mono text-xs font-normal text-accent/70">0{index + 1}</span>
              {step.title}
            </h3>
            <p className="text-xs leading-relaxed text-zinc-400">{step.body}</p>
            <span className="inline-block text-[11px] text-zinc-500">{step.note}</span>
          </div>
        </li>
      ))}
    </ol>
  </section>
);

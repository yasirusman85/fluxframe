import React from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/cn";
import { HERO_RAIL, PROMO_CARD, railSubtitle } from "./landing-content";

const RAIL_IMAGES = [
  "/showcase/perfume.jpg",
  "/showcase/market-illustration.jpg",
  "/showcase/tokyo-drift.jpg",
  "/showcase/hyperjump.jpg",
];

/**
 * Horizontally scrolling rail of entry-point cards directly under the header.
 * Fixed 400px cards, 12px gutters, 8px radius — same as the reference.
 */
export const HeroRail: React.FC = () => (
  <section aria-label="Jump to" className="lf-container mb-7 pt-0">
    <ul
      role="list"
      data-testid="hero-rail"
      className="lf-scroll flex gap-3 overflow-x-auto pb-1"
    >
      {HERO_RAIL.map((item, index) => (
        <li key={item.to + item.label} className="w-[min(31.5rem,82vw)] shrink-0">
          <Link
            to={item.to}
            data-testid={`hero-rail-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            className="group block"
          >
            <div className="relative h-[284px] overflow-hidden rounded-lg bg-zinc-200">
              <img src={RAIL_IMAGES[index]} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-white/10"/>
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                <span className="font-grotesk text-3xl font-black uppercase leading-[.9] tracking-[-.06em] text-white drop-shadow-xl md:text-5xl">{item.label}</span>
              </div>
            </div>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div><h2 className="text-sm font-bold uppercase text-white">{item.label}</h2><p className="mt-1 text-sm text-zinc-500">{railSubtitle(item.to)}</p></div>
              {item.tag && <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-black uppercase text-black">{item.tag}</span>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  </section>
);

/** Wide black promo card that closes the top of the page. */
export const PromoBanner: React.FC = () => (
  <section className="lf-container mb-7 grid gap-3 lg:grid-cols-[1.03fr_1.97fr]">
    <Link to={PROMO_CARD.to} data-testid="promo-banner" className={cn("group relative min-h-[266px] overflow-hidden rounded-2xl bg-zinc-900 p-6", "transition-opacity hover:opacity-90")}>
      <img src="/showcase/volcano.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-55"/>
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/45 to-transparent"/>
      <div className="relative flex h-full max-w-md flex-col items-start justify-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">{PROMO_CARD.eyebrow}</p>
        <h2 className="font-grotesk text-3xl font-black uppercase leading-[.98] tracking-[-.05em] text-white">{PROMO_CARD.title}</h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-300">{PROMO_CARD.body}</p>
        <span className="mt-5 inline-flex h-11 items-center rounded-lg bg-accent px-5 text-sm font-bold text-black">{PROMO_CARD.cta}</span>
      </div>
    </Link>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[
        ["Seedance 2.5", "The most advanced video model", "/create/video", "Video"],
        ["Nano Banana Pro", "Generate high-quality visuals", "/create/image", "Image"],
        ["Higgsfield Genjutsu", "One video, many versions", "/create/video", "New"],
        ["Plugin for ChatGPT", "Create images and videos in ChatGPT", "/apps", "MCP"],
        ["Cinema Studio 4.0", "Create cinematic scenes effortlessly", "/create/cinema", "Studio"],
        ["Supercomputer", "One agent for your creative stack", "/canvas", "Agent"],
      ].map(([title, body, to, tag]) => <Link key={title} to={to} className="group flex min-h-[126px] flex-col justify-between rounded-2xl border border-white/5 bg-[#23262a] p-4 transition hover:border-white/15 hover:bg-[#292c31]"><div className="flex items-start justify-between"><span className="text-lg text-zinc-300">∿</span><span className="rounded-md bg-white/5 px-2 py-1 text-[10px] text-zinc-400">{tag}</span></div><div><h3 className="text-sm font-bold text-white">{title}</h3><p className="mt-1 text-xs text-zinc-500">{body}</p></div></Link>)}
    </div>
  </section>
);

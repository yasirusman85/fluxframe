import React from "react";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { HeroRail, PromoBanner } from "./HeroRail";
import { ShowcaseSection } from "./ShowcaseSection";
import { RecentGenerations } from "./RecentGenerations";
import { StatsStrip } from "./StatsStrip";

/**
 * Landing page: a scrolling entry-point rail, the promo card, the quick
 * composer, the five studios, an honest "how it works", the remixable
 * showcase, recent generations and a stats strip.
 */
export const ExplorePage: React.FC = () => {
  useDocumentTitle("Explore");

  return (
    <div className="pb-4">
      <HeroRail />
      <PromoBanner />
      <section className="lf-container mb-14">
        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#15100e] px-6 py-16 text-center md:py-20">
          <div className="absolute inset-0 opacity-50 [background:radial-gradient(circle_at_50%_20%,#9d4f2f55,transparent_55%)]"/>
          <p className="relative text-xl font-semibold text-zinc-200">Use your whole creative stack with</p>
          <h1 className="relative mt-3 font-grotesk text-4xl font-black uppercase tracking-[-.06em] text-[#d7764d] md:text-7xl">Higgsfield Studio</h1>
          <p className="relative mx-auto mt-4 max-w-xl text-sm text-zinc-400">Generate images and videos, build motion graphics, and direct cinematic scenes from one workspace.</p>
        </div>
      </section>
      <ShowcaseSection />
      <RecentGenerations />
      <StatsStrip />
    </div>
  );
};

export default ExplorePage;

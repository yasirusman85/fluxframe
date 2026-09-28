import React from "react";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { HeroSection } from "./HeroSection";
import { StudiosStrip } from "./StudiosStrip";
import { HowItWorks } from "./HowItWorks";
import { ShowcaseSection } from "./ShowcaseSection";
import { RecentGenerations } from "./RecentGenerations";
import { StatsStrip } from "./StatsStrip";

/**
 * Landing page: hero composer that deep-links into a studio, the five
 * studios, a short honest "how it works", the remixable showcase, the
 * user's recent generations and a stats strip.
 */
export const ExplorePage: React.FC = () => {
  useDocumentTitle("Explore");

  return (
    <div className="mx-auto w-full max-w-7xl space-y-14 px-4 py-6 sm:px-6 lg:space-y-20 lg:px-8 lg:py-8">
      <HeroSection />
      <StudiosStrip />
      <HowItWorks />
      <ShowcaseSection />
      <RecentGenerations />
      <StatsStrip />
    </div>
  );
};

export default ExplorePage;

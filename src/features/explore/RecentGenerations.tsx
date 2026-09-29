import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { MediaCard } from "../../components/media/MediaCard";
import { useProjectStore } from "../../store/project-store";
import { SectionHeading } from "./SectionHeading";

const MAX_RECENT = 8;

/** Recent outputs from the local library. */
export const RecentGenerations: React.FC = () => {
  const projects = useProjectStore((s) => s.projects);
  const recent = useMemo(
    () => [...projects].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, MAX_RECENT),
    [projects],
  );

  if (recent.length === 0) return null;

  return (
    <section aria-labelledby="recent-heading" className="lf-section-lg">
      <div className="mb-4 md:mb-5">
        <SectionHeading
          id="recent-heading"
          title="Recent generations"
          subtitle="Straight from your local library — open, download, remix."
        />
        <Link
          to="/projects"
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent transition-opacity hover:opacity-80"
        >
          View library <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <ul role="list" className="lf-container grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 lg:gap-3">
        {recent.map((project) => (
          <li key={project.id} data-testid="recent-project-card" className="min-w-0">
            <MediaCard project={project} size="sm" />
          </li>
        ))}
      </ul>
    </section>
  );
};

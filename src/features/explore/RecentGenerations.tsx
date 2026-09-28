import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { MediaCard } from "../../components/media/MediaCard";
import { useProjectStore } from "../../store/project-store";

const MAX_RECENT = 8;

export const RecentGenerations: React.FC = () => {
  const projects = useProjectStore((s) => s.projects);
  const recent = useMemo(
    () => [...projects].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, MAX_RECENT),
    [projects],
  );

  if (recent.length === 0) return null;

  return (
    <section aria-labelledby="recent-heading" className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="recent-heading" className="text-2xl font-extrabold tracking-tight text-white">
            Recent generations
          </h2>
          <p className="text-sm text-zinc-400">Straight from your local library — open, download, remix.</p>
        </div>
        <Link to="/projects" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-300 transition-colors hover:text-brand-200">
          View library <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {recent.map((project) => (
          <div key={project.id} data-testid="recent-project-card" className="min-w-0">
            <MediaCard project={project} size="sm" />
          </div>
        ))}
      </div>
    </section>
  );
};

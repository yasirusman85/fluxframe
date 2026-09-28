import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, GitBranch, Layers } from "lucide-react";
import type { GenerationProject } from "../../types/project";
import { SectionTitle } from "../../components/ui";
import { MediaCard } from "../../components/media/MediaCard";
import { pluralize } from "../../lib/format";
import { TYPE_PLURALS } from "./library-utils";

const RELATED_LIMIT = 8;
const MORE_LIMIT = 4;

const byNewest = (a: GenerationProject, b: GenerationProject) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

export interface RelatedProjectsProps {
  project: GenerationProject;
  projects: GenerationProject[];
}

/** Remix lineage (parent / siblings / children) plus a short "more of this type" strip. */
export const RelatedProjects: React.FC<RelatedProjectsProps> = ({ project, projects }) => {
  const related = useMemo(() => {
    const family = projects.filter(
      (candidate) =>
        candidate.id !== project.id &&
        (candidate.parentId === project.id ||
          (project.parentId !== undefined && (candidate.id === project.parentId || candidate.parentId === project.parentId))),
    );
    return family.sort(byNewest).slice(0, RELATED_LIMIT);
  }, [project.id, project.parentId, projects]);

  const more = useMemo(() => {
    const exclude = new Set([project.id, ...related.map((p) => p.id)]);
    return projects
      .filter((candidate) => candidate.type === project.type && !exclude.has(candidate.id))
      .sort(byNewest)
      .slice(0, MORE_LIMIT);
  }, [project.id, project.type, projects, related]);

  if (related.length === 0 && more.length === 0) return null;

  return (
    <div className="space-y-6">
      {related.length > 0 && (
        <section data-testid="project-related" className="space-y-3">
          <SectionTitle icon={<GitBranch />} hint={pluralize(related.length, "project")}>
            Related
          </SectionTitle>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Related projects">
            {related.map((candidate) => (
              <li key={candidate.id}>
                <MediaCard project={candidate} size="sm" />
              </li>
            ))}
          </ul>
        </section>
      )}
      {more.length > 0 && (
        <section data-testid="project-more" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <SectionTitle icon={<Layers />}>More {TYPE_PLURALS[project.type]}</SectionTitle>
            <Link to={`/projects?filter=${project.type}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-300 hover:text-brand-200">
              View all <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label={`More ${TYPE_PLURALS[project.type]}`}>
            {more.map((candidate) => (
              <li key={candidate.id}>
                <MediaCard project={candidate} size="sm" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

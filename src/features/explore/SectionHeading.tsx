import React from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/cn";

export interface SectionHeadingProps {
  /** Rendered as the accent-coloured uppercase link. */
  title: string;
  subtitle?: string;
  /** Where the title links to. */
  to?: string;
  className?: string;
  id?: string;
}

/**
 * Section header in the reference layout: an uppercase, tight-tracked title
 * plus a muted one-line descriptor underneath, both on a 16px gutter.
 */
export const SectionHeading: React.FC<SectionHeadingProps> = ({ title, subtitle, to, className, id }) => {
  const titleNode = (
    <span className="lf-heading block text-accent transition-opacity hover:opacity-80">{title}</span>
  );

  return (
    <header className={cn("lf-container mb-4 space-y-1 md:mb-5", className)}>
      {id ? (
        <h2 id={id}>
          {to ? (
            <Link to={to} className="inline-block">
              {titleNode}
            </Link>
          ) : (
            titleNode
          )}
        </h2>
      ) : to ? (
        <Link to={to} className="inline-block">
          {titleNode}
        </Link>
      ) : (
        <h2>{titleNode}</h2>
      )}
      {subtitle && <p className="lf-sub">{subtitle}</p>}
    </header>
  );
};

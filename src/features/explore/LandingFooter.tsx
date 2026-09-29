import React from "react";
import { Link } from "react-router-dom";
import { Globe } from "lucide-react";
import {
  LANDING_ADDRESS,
  LANDING_FOOTER_GROUPS,
  LANDING_SOCIALS,
} from "./landing-content";

const FOOTER_LINK =
  "block w-fit py-0.5 text-base font-medium text-accent-ink transition-opacity hover:opacity-60";
const GROUP_TITLE = "text-base font-medium tracking-tight text-accent-ink/75";

/**
 * Full-bleed accent footer: link columns in a dense flow, then a bottom bar
 * with the legal links. The inverted palette is what makes it read as a
 * closing band rather than more of the page.
 */
export const LandingFooter: React.FC = () => (
  <footer
    data-testid="landing-footer"
    className="relative z-10 bg-accent py-4 text-accent-ink md:py-9"
  >
    <div className="lf-container grid grid-flow-row-dense gap-14 md:grid-cols-4 md:gap-18">
      {LANDING_FOOTER_GROUPS.map((group) => (
        <nav key={group.title} aria-label={group.title} className="space-y-3">
          <h2 className={GROUP_TITLE}>{group.title}</h2>
          <ul role="list" className="space-y-0.5">
            {group.links.map((link) => (
              <li key={link.label + link.to}>
                <Link to={link.to} className={FOOTER_LINK}>
                  {link.label}
                  {link.tag && (
                    <span className="ml-1.5 rounded bg-accent-ink/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                      {link.tag}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ))}
    </div>

    <div className="lf-container mt-14 flex flex-col gap-4 md:mt-0">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="text-sm text-accent-ink/60">{LANDING_ADDRESS}</span>
        <ul role="list" className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {LANDING_SOCIALS.map((social) => (
            <li key={social.label}>
              <Link to={social.to} className="text-sm font-medium text-accent-ink/70 transition-opacity hover:opacity-100">
                {social.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-accent-ink/15 pt-4 text-sm text-accent-ink/60">
        <span>
          © {new Date().getFullYear()} Higgsfield Studio. All rights reserved.
        </span>
        <button type="button" className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-100">
          <Globe className="h-4 w-4" aria-hidden />
          English
        </button>
        <Link to="/account" className="transition-opacity hover:opacity-100">
          Help center
        </Link>
        <Link to="/account" className="transition-opacity hover:opacity-100">
          Cookie Notice
        </Link>
        <Link to="/account" className="transition-opacity hover:opacity-100">
          Terms
        </Link>
        <Link to="/account" className="transition-opacity hover:opacity-100">
          Privacy
        </Link>
      </div>
    </div>
  </footer>
);

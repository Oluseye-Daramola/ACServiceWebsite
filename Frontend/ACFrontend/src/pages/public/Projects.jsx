import { useState } from "react";
import { PROJECTS } from "../../content/site";
import { CtaBand, PageHero, ProjectCard, SectionHead, StatsRow } from "../../components/SiteParts";

const FILTERS = ["All", "Residential", "Commercial"];

export default function Projects() {
  const [filter, setFilter] = useState("All");
  const shown = filter === "All" ? PROJECTS : PROJECTS.filter((p) => p.category === filter);

  return (
    <>
      <PageHero
        eyebrow="Discover"
        title="Our Projects"
        subtitle="A selection of installations, repairs and maintenance jobs across Lagos"
        image="/images/lagos.jpg"
      />
      <section className="s-section">
        <div className="s-container">
          <SectionHead eyebrow="Portfolio" title="Recent work" center />
          <div className="filters" role="tablist" aria-label="Filter projects">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                className={filter === f ? "active" : ""}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="project-grid">
            {shown.map((p) => (
              <ProjectCard key={p.title} p={p} />
            ))}
          </div>
        </div>
      </section>
      <section className="s-section s-tint">
        <div className="s-container">
          <StatsRow />
        </div>
      </section>
      <CtaBand />
    </>
  );
}

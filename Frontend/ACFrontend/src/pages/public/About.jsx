import { Link } from "react-router-dom";
import { COMPANY_INFO } from "../../content/site";
import {
  BrandStrip,
  CtaBand,
  Icon,
  PageHero,
  Reasons,
  SectionHead,
  StatsRow,
  Testimonials,
} from "../../components/SiteParts";

const VALUES = [
  ["shield", "Integrity", "Honest diagnosis and clear quotes. We only fix what needs fixing."],
  ["check", "Quality", "Work done to manufacturer standards with genuine parts."],
  ["clock", "Reliability", "We turn up when we say and keep you updated."],
  ["tech", "Care", "We treat your home or office as if it were our own."],
];

// Roles, not names: swap in real team members and photos when available.
const TEAM = [
  ["/images/engineer.jpg", "Lead Engineer", "Installation & system design"],
  ["/images/field-engineer.jpg", "Field Engineer", "Repairs & diagnostics"],
  ["/images/engineer-plans.jpg", "Project Engineer", "Site surveys & planning"],
  ["/images/installer.jpg", "Installation Technician", "Mounting, piping & wiring"],
];

export default function About() {
  return (
    <>
      <PageHero
        eyebrow="Who we are"
        title="About Us"
        subtitle="Air-conditioning specialists serving homes and businesses in Lagos"
        image="/images/lagos-lagoon.jpg"
      />

      <section className="s-section">
        <div className="s-container split">
          <div className="split-media stacked">
            <img src="/images/office-meeting.jpg" alt="Team meeting in a Lagos office" loading="lazy" />
            <img
              src="/images/ac-condensers.jpg"
              alt="Outdoor air-conditioning units mounted on a building wall"
              loading="lazy"
              className="inset"
            />
          </div>
          <div>
            <SectionHead eyebrow="Welcome" title={`The story of ${COMPANY_INFO.name}`} />
            <p className="s-lead">
              {COMPANY_INFO.name} is an air-conditioning company based in {COMPANY_INFO.address}. We started with a
              simple aim: give Nigerian homes and businesses the same standard of cooling service they would expect
              anywhere in the world.
            </p>
            <p>
              Today our engineers install, repair and maintain systems for families, offices, shops, restaurants and
              estates. Every job is booked, assigned, reported and signed off through our own service platform, so you
              always know who is coming, what was done and what it cost.
            </p>
            <StatsRow />
          </div>
        </div>
      </section>

      <section className="s-section s-dark">
        <div className="s-container">
          <div className="mission">
            <div>
              <span className="s-eyebrow">Our mission</span>
              <p>
                Keep every home and workplace we serve cool, healthy and energy-efficient with honest, expert service.
              </p>
            </div>
            <div>
              <span className="s-eyebrow">Our vision</span>
              <p>To be the most trusted air-conditioning partner in Nigeria, known for quality work and reliability.</p>
            </div>
          </div>
          <div className="values">
            {VALUES.map(([icon, t, d]) => (
              <div key={t}>
                <span className="r-icon">
                  <Icon name={icon} />
                </span>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="s-section">
        <div className="s-container">
          <SectionHead
            eyebrow="Behind the scenes"
            title="Our team"
            text="Trained engineers and technicians who do the work, end to end."
            center
          />
          <div className="team-grid">
            {TEAM.map(([img, role, focus]) => (
              <figure className="team-card" key={role}>
                <img src={img} alt={role} loading="lazy" />
                <figcaption>
                  <strong>{role}</strong>
                  <span>{focus}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <Reasons />
      <Testimonials />
      <BrandStrip />

      <section className="s-section center-block">
        <div className="s-container">
          <SectionHead
            title="Ready to work with us?"
            text="Book an installation, repair or service visit in under a minute."
            center
          />
          <Link to="/contact" className="s-btn s-btn-primary">
            Book a service
          </Link>
        </div>
      </section>
      <CtaBand />
    </>
  );
}

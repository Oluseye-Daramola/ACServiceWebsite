import { Link } from "react-router-dom";
import { COMPANY_INFO, PHONE_HREF, PROJECTS, SERVICE_LIST } from "../../content/site";
import {
  BrandStrip,
  CtaBand,
  Faq,
  Icon,
  ProjectCard,
  QuoteForm,
  Reasons,
  SectionHead,
  StatsRow,
  Testimonials,
} from "../../components/SiteParts";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="home-hero">
        <div className="s-container hero-grid">
          <div className="hero-copy">
            <span className="s-eyebrow">Welcome to {COMPANY_INFO.name}</span>
            <h1>
              Air-conditioning <span>installation, repair</span> &amp; maintenance
            </h1>
            <p>
              Trusted engineers keeping homes, offices and businesses across {COMPANY_INFO.address} cool all year round.
              Fast response, fair prices and a signed report after every job.
            </p>
            <div className="hero-actions">
              <Link to="/contact" className="s-btn s-btn-primary">
                Get your free quote <Icon name="arrow" size={18} />
              </Link>
              <a href={PHONE_HREF} className="hero-call">
                <span className="call-icon">
                  <Icon name="phone" size={20} />
                </span>
                <span>
                  <small>Call us anytime</small>
                  <strong>{COMPANY_INFO.phone}</strong>
                </span>
              </a>
            </div>
          </div>
          <div className="hero-media">
            <img src="/images/engineer.jpg" alt="Smiling engineer wearing a blue hard hat" className="hero-main" />
            <div className="hero-badge">
              <Icon name="snow" size={26} />
              <span>
                <strong>500+</strong>
                <small>Units installed & serviced</small>
              </span>
            </div>
          </div>
        </div>
      </section>

      <BrandStrip />

      {/* Services */}
      <section className="s-section">
        <div className="s-container">
          <SectionHead
            eyebrow="One-stop solution"
            title="Air-conditioning services"
            text="From the first installation to years of reliable cooling, one team handles it all."
            center
          />
          <div className="service-cards">
            {SERVICE_LIST.map((s) => (
              <article className="svc-card" key={s.slug}>
                <Link to={`/services/${s.slug}`} className="svc-img">
                  <img src={s.image} alt={s.imageAlt} loading="lazy" />
                </Link>
                <div className="svc-body">
                  <span className="svc-icon">
                    <Icon name={s.icon} size={26} />
                  </span>
                  <h3>
                    <Link to={`/services/${s.slug}`}>{s.title}</Link>
                  </h3>
                  <p>{s.summary}</p>
                  <Link to={`/services/${s.slug}`} className="s-more">
                    Read more <Icon name="arrow" size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Reasons />

      {/* Free quote */}
      <section className="quote-section" style={{ backgroundImage: "url(/images/lagos.jpg)" }}>
        <div className="s-container quote-grid">
          <div className="quote-copy">
            <SectionHead
              eyebrow="Free quote"
              title="Lagos' trusted air-conditioning experts"
              text="Tell us what you need and we'll get back to you, usually within a few hours, with a clear quote and a visit time."
              light
            />
            <ul className="tick-list tick-light">
              <li>No call-out surprises: you approve every cost</li>
              <li>Residential, commercial and estate projects</li>
              <li>Every major brand and system type</li>
            </ul>
          </div>
          <QuoteForm />
        </div>
      </section>

      {/* Specialities + counters */}
      <section className="s-section">
        <div className="s-container split">
          <div className="split-media duo">
            <img src="/images/installer.jpg" alt="Technician drilling a wall to mount a unit" loading="lazy" />
            <img src="/images/family.jpg" alt="Smiling family relaxing on a sofa at home" loading="lazy" />
          </div>
          <div>
            <SectionHead
              eyebrow="Our speciality"
              title="From hot rooms to perfect comfort"
              text={`${COMPANY_INFO.name} designs, installs and looks after cooling systems for flats, family homes, offices, shops, restaurants and estates. We plan each job around your space, your power supply and your budget, so the system works efficiently for years.`}
            />
            <StatsRow />
            <Link to="/about" className="s-btn s-btn-primary">
              More about us
            </Link>
          </div>
        </div>
      </section>

      <Testimonials />
      <Faq />

      {/* Recent projects (takes the place of the reference design's blog section) */}
      <section className="s-section">
        <div className="s-container">
          <div className="row-head">
            <SectionHead eyebrow="Our work" title="Recent projects" />
            <Link to="/projects" className="s-btn s-btn-ghost">
              View all projects
            </Link>
          </div>
          <div className="project-grid">
            {PROJECTS.slice(0, 3).map((p) => (
              <ProjectCard key={p.title} p={p} />
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}

import { Link, NavLink, useParams } from "react-router-dom";
import { COMPANY_INFO, PHONE_HREF, SERVICES, SERVICE_LIST, WHATSAPP_HREF } from "../../content/site";
import { BrandStrip, CtaBand, Faq, Icon, PageHero, QuoteForm, Reasons, SectionHead } from "../../components/SiteParts";
import { NotFound } from "./Auth";

// /services: overview of all three services
export function ServicesOverview() {
  return (
    <>
      <PageHero
        eyebrow="What we do"
        title="Our Services"
        subtitle="Air-conditioning installation, repair and maintenance specialists"
        image="/images/field-engineer.jpg"
      />
      <section className="s-section">
        <div className="s-container">
          <SectionHead
            eyebrow="One-stop solution"
            title="Everything your air conditioner needs"
            text={`${COMPANY_INFO.name} looks after split, standing, window, cassette and ducted systems for homes and businesses.`}
            center
          />
          <div className="svc-rows">
            {SERVICE_LIST.map((s, i) => (
              <article className={`svc-row ${i % 2 ? "svc-row-rev" : ""}`} key={s.slug}>
                <img src={s.image} alt={s.imageAlt} loading="lazy" />
                <div>
                  <span className="svc-icon">
                    <Icon name={s.icon} size={26} />
                  </span>
                  <h3>{s.title}</h3>
                  <p>{s.intro}</p>
                  <ul className="tick-list">
                    {s.points.slice(0, 4).map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                  <div className="hero-actions">
                    <Link to={`/services/${s.slug}`} className="s-btn s-btn-primary">
                      Learn more
                    </Link>
                    <Link to={`/contact?service=${s.slug}`} className="s-btn s-btn-ghost">
                      Book {s.title.toLowerCase()}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <Reasons />
      <BrandStrip />
      <CtaBand />
    </>
  );
}

// /services/installation | repair | maintenance
export function ServiceDetailPage() {
  const { slug } = useParams();
  const s = SERVICES[slug];
  if (!s) return <NotFound />;

  return (
    <>
      <PageHero
        eyebrow="Our service"
        title={s.title}
        subtitle={s.summary}
        image={s.image}
        crumbs={[["/services", "Services"]]}
      />
      <section className="s-section">
        <div className="s-container svc-detail">
          <aside className="svc-side">
            <nav className="side-nav" aria-label="Services">
              {SERVICE_LIST.map((x) => (
                <NavLink key={x.slug} to={`/services/${x.slug}`}>
                  {x.title} <Icon name="arrow" size={16} />
                </NavLink>
              ))}
            </nav>
            <div className="side-help">
              <Icon name="phone" size={28} />
              <h3>Need help now?</h3>
              <p>Talk to an engineer today.</p>
              <a href={PHONE_HREF} className="side-phone">
                {COMPANY_INFO.phone}
              </a>
              <a href={WHATSAPP_HREF} target="_blank" rel="noreferrer" className="s-btn s-btn-light s-btn-block">
                Chat on WhatsApp
              </a>
            </div>
          </aside>

          <div className="svc-main">
            <img src={s.image} alt={s.imageAlt} className="svc-hero-img" />
            <SectionHead eyebrow={`${s.title} service`} title={`Worry-free AC ${s.title.toLowerCase()}`} />
            <p className="s-lead">{s.intro}</p>

            <h3 className="s-sub">What's included</h3>
            <ul className="tick-list tick-cols">
              {s.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>

            <h3 className="s-sub">How it works</h3>
            <ol className="process">
              {s.steps.map(([t, d], i) => (
                <li key={t}>
                  <span className="process-no">{String(i + 1).padStart(2, "0")}</span>
                  <h4>{t}</h4>
                  <p>{d}</p>
                </li>
              ))}
            </ol>

            <QuoteForm title={`Book ${s.title.toLowerCase()}`} defaultService={s.slug} key={s.slug} />
          </div>
        </div>
      </section>
      <Faq />
      <CtaBand />
    </>
  );
}

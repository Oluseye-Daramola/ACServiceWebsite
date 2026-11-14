// Building blocks shared by the public website pages
import { useState } from "react";
import { Link } from "react-router-dom";
import { enquiryApi } from "../api/endpoints";
import { ErrorBox, Field, Select, useForm } from "./ui";
import { SERVICE_TYPES, clean } from "../utils/format";
import { BRANDS, COMPANY_INFO, FAQS, PHONE_HREF, REASONS, STATS, TESTIMONIALS } from "../content/site";

const PATHS = {
  install: "M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6",
  repair: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z",
  maintenance:
    "M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  tech: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  tag: "M20 12l-8 8-9-9V3h8zM7.5 7.5h.01",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  check: "M20 6L9 17l-5-5",
  phone:
    "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z",
  mail: "M4 4h16v16H4zM4 6l8 7 8-7",
  pin: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  snow: "M12 2v20M4.9 6l14.2 12M4.9 18L19.1 6M9 4l3 3 3-3M9 20l3-3 3 3",
  arrow: "M5 12h14M13 6l6 6-6 6",
  quote: "M7 7h4v4c0 3-2 5-4 6M15 7h4v4c0 3-2 5-4 6",
};

export function Icon({ name, size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export function SectionHead({ eyebrow, title, text, center, light }) {
  return (
    <div className={`s-head ${center ? "s-center" : ""} ${light ? "s-light" : ""}`}>
      {eyebrow && <span className="s-eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}

// Banner at the top of inner pages
export function PageHero({ eyebrow, title, subtitle, image, crumbs = [], flip = false, side = false, focus = "center" }) {
  return (
    <section className="page-hero">
      <div
        className={`page-hero-bg ${flip ? "flip" : ""} ${side ? "side" : ""}`}
        style={{ backgroundImage: `url(${image})`, backgroundPosition: focus }}
        aria-hidden
      />
      <div className="s-container">
        {eyebrow && <span className="s-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          {crumbs.map(([to, text]) => (
            <span key={text}>
              <span aria-hidden> / </span>
              {to ? <Link to={to}>{text}</Link> : <span>{text}</span>}
            </span>
          ))}
          <span aria-hidden> / </span>
          <span aria-current="page">{title}</span>
        </nav>
      </div>
    </section>
  );
}

export function BrandStrip() {
  return (
    <section className="brands">
      <div className="s-container">
        <p>We install and service all leading air-conditioning brands</p>
        <ul>
          {BRANDS.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Reasons() {
  return (
    <section className="s-section s-tint">
      <div className="s-container">
        <SectionHead
          eyebrow="Top 6 reasons"
          title="Why choose us"
          text={`What you get every time you call ${COMPANY_INFO.name}.`}
          center
        />
        <div className="reasons">
          {REASONS.map(([icon, title, text]) => (
            <div className="reason" key={title}>
              <span className="r-icon">
                <Icon name={icon} />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StatsRow({ dark }) {
  return (
    <div className={`s-stats ${dark ? "s-stats-dark" : ""}`}>
      {STATS.map(([n, l]) => (
        <div key={l}>
          <strong>{n}</strong>
          <span>{l}</span>
        </div>
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="s-section">
      <div className="s-container">
        <SectionHead eyebrow="Testimonials" title="What our customers say" center />
        <div className="testimonials">
          {TESTIMONIALS.map(([name, role, img, text]) => (
            <figure className="testimonial" key={name}>
              <span className="t-quote">
                <Icon name="quote" size={28} />
              </span>
              <blockquote>{text}</blockquote>
              <figcaption>
                <img src={img} alt="" loading="lazy" />
                <span>
                  <strong>{name}</strong>
                  <small>{role}</small>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Faq({ image = "/images/ac-condensers.jpg" }) {
  return (
    <section className="s-section s-tint">
      <div className="s-container faq-grid">
        <div className="faq-media">
          <img src={image} alt="Outdoor air-conditioning units mounted on a building wall" loading="lazy" />
        </div>
        <div>
          <SectionHead eyebrow="Do you have" title="Any questions?" />
          <div className="faq">
            {FAQS.map(([q, a], i) => (
              <details key={q} open={i === 0}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function CtaBand() {
  return (
    <section className="cta-band">
      <div className="s-container cta-inner">
        <div>
          <h2>Quality HVACR solutions for homes and businesses</h2>
          <p>Book a visit online or call us on {COMPANY_INFO.phone}.</p>
        </div>
        <div className="cta-actions">
          <Link to="/contact" className="s-btn s-btn-light">
            Schedule appointment
          </Link>
          <a href={PHONE_HREF} className="s-btn s-btn-outline-light">
            <Icon name="phone" size={18} /> Call now
          </a>
        </div>
      </div>
    </section>
  );
}

// Short quote request → POST /api/enquiries (same endpoint as the Contact page)
export function QuoteForm({ title = "Request a free quote", defaultService = "" }) {
  const [done, setDone] = useState("");
  const { values, set, submit, busy, error, setValues } = useForm({
    name: "",
    phone: "",
    email: "",
    address: "",
    serviceType: defaultService,
    message: "",
  });
  const onSubmit = submit(async (v) => {
    const res = await enquiryApi.create(clean(v));
    setDone(res.message);
    setValues((s) => ({ ...s, message: "" }));
  });

  return (
    <div className="quote-card">
      <h3>{title}</h3>
      {done ? (
        <div className="quote-done">
          <p>
            <strong>Request received.</strong> {done}
          </p>
          <button type="button" className="s-btn s-btn-ghost" onClick={() => setDone("")}>
            Send another request
          </button>
        </div>
      ) : (
        <form className="form-grid quote-form" onSubmit={onSubmit}>
          <ErrorBox error={error} />
          <Field label="Full name *">
            <input required minLength={2} value={values.name} onChange={set("name")} autoComplete="name" />
          </Field>
          <Field label="Phone *">
            <input required type="tel" value={values.phone} onChange={set("phone")} autoComplete="tel" />
          </Field>
          <Field label="Email *">
            <input required type="email" value={values.email} onChange={set("email")} autoComplete="email" />
          </Field>
          <Field label="Service">
            <Select
              options={SERVICE_TYPES}
              placeholder="Not sure"
              value={values.serviceType}
              onChange={set("serviceType")}
            />
          </Field>
          <Field label="Address" full>
            <input value={values.address} onChange={set("address")} autoComplete="street-address" />
          </Field>
          <Field label="What do you need? *" full>
            <textarea required minLength={5} rows={3} value={values.message} onChange={set("message")} />
          </Field>
          <div className="field-full">
            <button className="s-btn s-btn-primary s-btn-block" disabled={busy}>
              {busy ? "Sending…" : "Get my free quote"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function ProjectCard({ p }) {
  return (
    <article className="project-card">
      <img src={p.image} alt={p.title} loading="lazy" />
      <div className="project-overlay">
        <span className="project-tag">{p.category}</span>
        <h3>{p.title}</h3>
        <p>
          <Icon name="pin" size={15} /> {p.place}
        </p>
      </div>
    </article>
  );
}

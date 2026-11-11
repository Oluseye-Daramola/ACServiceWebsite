import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { enquiryApi } from "../../api/endpoints";
import { ErrorBox, Field, Select, useForm } from "../../components/ui";
import { SERVICE_TYPES, clean, fromInput } from "../../utils/format";
import { COMPANY_INFO, MAIL_HREF, PHONE_HREF, WHATSAPP_HREF } from "../../content/site";
import { Icon, PageHero } from "../../components/SiteParts";

// Public contact / booking form → POST /api/enquiries
export default function Contact() {
  const [params] = useSearchParams();
  const initialType = SERVICE_TYPES.includes(params.get("service")) ? params.get("service") : "";
  const [done, setDone] = useState("");
  const { values, set, submit, busy, error, setValues } = useForm({
    name: "",
    email: "",
    phone: "",
    address: "",
    serviceType: initialType,
    preferredDate: "",
    message: "",
  });

  const onSubmit = submit(async (v) => {
    const res = await enquiryApi.create(clean({ ...v, preferredDate: fromInput(v.preferredDate) }));
    setDone(res.message);
    setValues((s) => ({ ...s, message: "", preferredDate: "" }));
  });

  return (
    <>
      <PageHero
        eyebrow="Get in touch"
        title="Contact Us"
        subtitle="Book a service or ask us anything"
        image="/images/lagos-civic-centre.jpg"
        side
        focus="center 35%"
      />
      <section className="s-section">
        <div className="s-container contact-grid">
          <aside className="contact-info">
            <h2>Talk to {COMPANY_INFO.name}</h2>
            <p>
              Fill in the form and we will get back to you, usually within a few hours. For urgent breakdowns, call us.
            </p>
            <a href={PHONE_HREF} className="info-item">
              <span className="r-icon">
                <Icon name="phone" />
              </span>
              <span>
                <small>Call us</small>
                <strong>{COMPANY_INFO.phone}</strong>
              </span>
            </a>
            <a href={WHATSAPP_HREF} target="_blank" rel="noreferrer" className="info-item">
              <span className="r-icon">
                <Icon name="quote" />
              </span>
              <span>
                <small>WhatsApp</small>
                <strong>Chat with us</strong>
              </span>
            </a>
            <a href={MAIL_HREF} className="info-item">
              <span className="r-icon">
                <Icon name="mail" />
              </span>
              <span>
                <small>Email</small>
                <strong className="break">{COMPANY_INFO.email}</strong>
              </span>
            </a>
            <div className="info-item">
              <span className="r-icon">
                <Icon name="pin" />
              </span>
              <span>
                <small>Office</small>
                <strong>{COMPANY_INFO.address}</strong>
              </span>
            </div>
            <div className="info-item">
              <span className="r-icon">
                <Icon name="clock" />
              </span>
              <span>
                <small>Opening hours</small>
                <strong>{COMPANY_INFO.hours}</strong>
              </span>
            </div>
          </aside>
          <div>
            <h2 className="form-title">Book a service</h2>
            {done ? (
              <div className="quote-card success-card">
                <h2>Request received ✓</h2>
                <p>{done}</p>
                <p className="muted">A confirmation has been sent to {values.email}.</p>
                <button className="btn" onClick={() => setDone("")}>
                  Send another request
                </button>
              </div>
            ) : (
              <form className="quote-card form-grid" onSubmit={onSubmit}>
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
                <Field label="Service needed">
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
                <Field label="Preferred date">
                  <input type="date" value={values.preferredDate} onChange={set("preferredDate")} />
                </Field>
                <Field label="Describe the problem *" full>
                  <textarea required minLength={5} rows={5} value={values.message} onChange={set("message")} />
                </Field>
                <div className="field-full">
                  <button className="btn btn-primary btn-lg" disabled={busy}>
                    {busy ? "Sending…" : "Send request"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

import { useEffect, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "./ui";
import { COMPANY } from "../utils/format";
import { COMPANY_INFO, MAIL_HREF, PHONE_HREF, SERVICE_LIST, WHATSAPP_HREF } from "../content/site";
import { Icon } from "./SiteParts";

const Logo = () => (
  <Link to="/" className="logo">
    <span className="logo-mark" aria-hidden>
      ❄
    </span>
    {COMPANY}
  </Link>
);

// Public website: home, services, about, projects, contact, login…
const SITE_NAV = [
  ["/", "Home"],
  ["/services", "Services", SERVICE_LIST.map((x) => [`/services/${x.slug}`, x.title])],
  ["/about", "About Us"],
  ["/projects", "Projects"],
  ["/contact", "Contact"],
];

export function PublicLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [menu, setMenu] = useState({ open: false, at: pathname });
  // Close the mobile menu whenever the route changes
  const open = menu.open && menu.at === pathname;
  const setOpen = (v) => setMenu({ open: v, at: pathname });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="site">
      <div className="site-topbar">
        <div className="s-container topbar-inner">
          <div className="topbar-info">
            <a href={PHONE_HREF}>
              <Icon name="phone" size={14} /> {COMPANY_INFO.phone}
            </a>
            <a href={MAIL_HREF}>
              <Icon name="mail" size={14} /> {COMPANY_INFO.email}
            </a>
            <span className="hide-sm">
              <Icon name="clock" size={14} /> {COMPANY_INFO.hours}
            </span>
          </div>
          <span className="hide-sm">
            <Icon name="pin" size={14} /> {COMPANY_INFO.address}
          </span>
        </div>
      </div>

      <header className="site-header">
        <div className="s-container header-inner">
          <Link to="/" className="site-logo">
            <span className="site-logo-mark" aria-hidden>
              <Icon name="snow" size={22} />
            </span>
            <span>{COMPANY_INFO.name}</span>
          </Link>

          <nav className={`site-nav ${open ? "open" : ""}`} aria-label="Main">
            {SITE_NAV.map(([to, text, sub]) =>
              sub ? (
                <div className="has-sub" key={to}>
                  <NavLink to={to} end>
                    {text}{" "}
                    <span className="caret" aria-hidden>
                      ▾
                    </span>
                  </NavLink>
                  <div className="sub-menu">
                    {sub.map(([sTo, sText]) => (
                      <NavLink key={sTo} to={sTo}>
                        {sText}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ) : (
                <NavLink key={to} to={to} end={to === "/"}>
                  {text}
                </NavLink>
              ),
            )}
            <div className="nav-cta">
              {user ? (
                <Link className="s-btn s-btn-ghost s-btn-sm" to="/app">
                  Dashboard
                </Link>
              ) : (
                <Link className="s-btn s-btn-ghost s-btn-sm" to="/login">
                  Staff login
                </Link>
              )}
              <Link className="s-btn s-btn-primary s-btn-sm" to="/contact">
                Book a service
              </Link>
            </div>
          </nav>

          <button className="burger" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="s-container footer-grid">
          <div>
            <Link to="/" className="site-logo light">
              <span className="site-logo-mark" aria-hidden>
                <Icon name="snow" size={22} />
              </span>
              <span>{COMPANY_INFO.name}</span>
            </Link>
            <p>
              Air-conditioning installation, repair and maintenance for homes and businesses in {COMPANY_INFO.address}.
            </p>
            <a href={WHATSAPP_HREF} target="_blank" rel="noreferrer" className="s-btn s-btn-primary s-btn-sm">
              Chat on WhatsApp
            </a>
          </div>
          <div>
            <h4>Company</h4>
            <Link to="/">Home</Link>
            <Link to="/about">About Us</Link>
            <Link to="/projects">Projects</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/login">Staff login</Link>
          </div>
          <div>
            <h4>Our Services</h4>
            {SERVICE_LIST.map((x) => (
              <Link key={x.slug} to={`/services/${x.slug}`}>
                {x.title}
              </Link>
            ))}
            <Link to="/contact?service=gas_refill">Gas refill</Link>
            <Link to="/contact?service=inspection">Inspection</Link>
          </div>
          <div>
            <h4>Get in touch</h4>
            <a href={PHONE_HREF}>
              <Icon name="phone" size={15} /> {COMPANY_INFO.phone}
            </a>
            <a href={MAIL_HREF} className="break">
              <Icon name="mail" size={15} /> {COMPANY_INFO.email}
            </a>
            <span>
              <Icon name="pin" size={15} /> {COMPANY_INFO.address}
            </span>
            <span>
              <Icon name="clock" size={15} /> {COMPANY_INFO.hours}
            </span>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="s-container">
            © {new Date().getFullYear()} {COMPANY_INFO.name}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

const ADMIN_NAV = [
  ["/app", "Dashboard", "▦"],
  ["/app/enquiries", "Enquiries", "✉"],
  ["/app/clients", "Clients", "☺"],
  ["/app/services", "Services", "🛠"],
  ["/app/reports", "Reports", "📄"],
  ["/app/invoices", "Invoices", "🧾"],
  ["/app/payments", "Payments", "₦"],
  ["/app/technicians", "Technicians", "👷"],
];
const TECH_NAV = [
  ["/app", "Dashboard", "▦"],
  ["/app/services", "My jobs", "🛠"],
  ["/app/reports", "My reports", "📄"],
];

// Logged-in area with sidebar
export function AppLayout() {
  const { user, loading, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (loading) return <Spinner text="Restoring your session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const nav = isAdmin ? ADMIN_NAV : TECH_NAV;

  return (
    <div className={`shell ${open ? "nav-open" : ""}`}>
      <aside className="sidebar">
        <Logo />
        <nav onClick={() => setOpen(false)}>
          {nav.map(([to, text, icon]) => (
            <NavLink key={to} to={to} end={to === "/app"}>
              <span className="nav-icon" aria-hidden>
                {icon}
              </span>
              {text}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <NavLink to="/app/profile" onClick={() => setOpen(false)} className="me">
            <span className="avatar">{user.name?.[0]?.toUpperCase()}</span>
            <span>
              <strong>{user.name}</strong>
              <small>{user.role}</small>
            </span>
          </NavLink>
          <button className="btn btn-sm btn-ghost" onClick={() => logout()}>
            Log out
          </button>
        </div>
      </aside>
      <div className="scrim" onClick={() => setOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
            ☰
          </button>
          <span className="muted">{isAdmin ? "Admin" : "Technician"} workspace</span>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// Guards a route by role; technicians hitting admin pages go to the dashboard
export function RequireRole({ role, children }) {
  const { user } = useAuth();
  if (user?.role !== role) return <Navigate to="/app" replace />;
  return children;
}

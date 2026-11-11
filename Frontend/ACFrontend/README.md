# Haycon Solutions Limited – Frontend

The website and staff dashboard for Haycon Solutions Limited, an air-conditioning installation, repair and maintenance company in Lagos.

One React app serves two areas:

- **Public website**: home, services (installation, repair, maintenance), about, projects and contact. Booking and quote forms send enquiries straight to the backend.
- **Staff dashboard** (`/app`): one login for **admins**, who run the business, and **technicians**, who do the jobs.

Built with React 19, Vite and React Router 7, styled with plain CSS. There is no UI framework and no state library. It talks to the API in [`../../Backend`](../../Backend/README.md).

---

## Contents

- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Public website](#public-website)
- [Staff dashboard](#staff-dashboard)
- [Editing website content](#editing-website-content)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Styling](#styling)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Requirements

| | Version / note |
|---|---|
| Node.js | 20.19+ (Vite 8 requirement) |
| Backend | The API in `../../Backend` must be running and reachable |

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file (the defaults work for local development)
cp .env.example .env

# 3. Start the dev server
npm run dev              # http://localhost:5173
```

Before you log in:

1. Start the backend (`npm run dev` in `../../Backend`). It runs on `http://localhost:5000`.
2. Make sure the backend's `CLIENT_URL` includes this frontend's origin (`http://localhost:5173` by default), or the browser blocks requests with a CORS error.
3. Create the first admin with `npm run seed` in the backend, then log in at `/login`. The admin adds technicians from **Technicians → + New technician**. See [Creating the admin and technicians](../../Backend/README.md#creating-the-admin-and-technicians).

## Environment variables

Set these in `.env` (template: [`.env.example`](.env.example)). Vite reads them **at build time**, so restart `npm run dev` or rebuild after any change.

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000/api` | Backend base URL, **including `/api`** |
| `VITE_COMPANY_NAME` | `Haycon Solutions Limited` | Header, footer, page text and dashboard |
| `VITE_COMPANY_EMAIL` | `haycontech.solutions500@gmail.com` | Top bar, footer, contact page (`mailto:` links) |
| `VITE_COMPANY_PHONE` | `+234 702 524 2589` | Top bar, footer, contact page. Also builds the `tel:` and WhatsApp (`wa.me`) links. |
| `VITE_COMPANY_ADDRESS` | `Lagos, Nigeria` | Top bar, footer, about and contact pages |
| `VITE_COMPANY_HOURS` | `Mon – Sat, 8:00am – 6:00pm` | Top bar and contact page |
| `VITE_CURRENCY` | `NGN` | Money format in the dashboard. Keep it the same as the backend's `CURRENCY`. |

The company values are copies of the backend's `COMPANY_*` variables. Update both together so the website, emails and PDFs match.

> Everything prefixed `VITE_` ends up in the public JavaScript bundle. Never put passwords, API keys or other secrets here.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload on `http://localhost:5173` |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the `dist/` build locally to check it |
| `npm run lint` | ESLint (React hooks and refresh rules) |

## Public website

All public pages share one layout (`PublicLayout`): a top bar with contact details, a sticky header with a **Services** dropdown, a **Book a service** button, a mobile menu, and a four-column footer.

| Route | Page | What's on it |
|---|---|---|
| `/` | Home | Hero, brands, service cards, why choose us, quote form, specialities and stats, testimonials, FAQ, recent projects, call-to-action |
| `/services` | Services overview | All three services with highlights and links |
| `/services/installation` <br> `/services/repair` <br> `/services/maintenance` | Service detail | Side menu, "Need help now?" box (call and WhatsApp), what's included, 4-step process, booking form pre-set to that service, FAQ |
| `/about` | About us | Company story, stats, mission, vision and values, team, testimonials |
| `/projects` | Projects | Portfolio filterable by **All / Residential / Commercial** |
| `/contact` | Contact | Phone, WhatsApp, email, address, hours, and the booking form |
| `/login`, `/forgot-password`, `/reset-password?token=` | Staff sign-in | Login and password reset. The reset path is fixed by the link in the backend's email. |

**Forms.** The quote form (home and service pages) and the contact form both call `POST /api/enquiries`. The customer gets an acknowledgement email and admins get an alert. Links like `/contact?service=repair` pre-select the service type. The backend allows 5 enquiries per hour per IP.

There are no products or blog pages, by design.

## Staff dashboard

Everything under `/app` needs a login. `AppLayout` redirects visitors to `/login`, and `RequireRole` keeps technicians out of admin-only pages.

| Route | Admin | Technician | Backend endpoints |
|---|---|---|---|
| `/app` | Revenue, balances, work queues | Own jobs, schedule, unsigned reports | `GET /dashboard` |
| `/app/profile` | ✅ | ✅ | `GET/PATCH /auth/me`, `PATCH /auth/change-password` |
| `/app/enquiries`, `/:id` | ✅ | – | list, view, change status, **convert to client + job**, delete |
| `/app/clients`, `/:id` | ✅ | – | list, create, view (jobs and invoices), edit, delete |
| `/app/technicians`, `/:id` | ✅ | – | list, create, view (job counts), edit, reset password, deactivate / reactivate |
| `/app/services`, `/new`, `/:id` | Create, edit, assign, override status, delete | Own jobs only: start and complete | `/services`, `/services/:id/progress` |
| `/app/reports`, `/:id` | View, PDF, email to client | Create, edit, add photos, **capture both signatures** on the device | `/reports` |
| `/app/invoices`, `/new`, `/:id` | ✅ | – | create, edit, cancel, PDF, email, WhatsApp share, record payment |
| `/app/payments`, `/:id` | ✅ | – | list with totals and summary, view, reverse |

**The job flow:** enquiry → convert to client and job → assign a technician → technician starts the job, files a report, adds photos, and both they and the client sign on the technician's device → job completed → admin emails the signed report → admin creates an invoice and sends it by email or WhatsApp → admin records payments until the invoice is paid.

Technicians never see invoices, payments or other technicians' jobs. The backend enforces this too, not only the UI.

## Editing website content

Most website text is in **[`src/content/site.js`](src/content/site.js)**, so you can update it without touching the page components.

| Export | What it controls |
|---|---|
| `COMPANY_INFO` | Name, email, phone, address, hours (from `.env`, with Haycon defaults) |
| `PHONE_HREF`, `WHATSAPP_HREF`, `MAIL_HREF` | Click-to-call, WhatsApp and email links built from `COMPANY_INFO` |
| `BRANDS` | AC brand names in the brand strip |
| `SERVICES` | The three services: title, icon, photo, summary, intro, "what's included" points and 4 process steps. Keys (`installation`, `repair`, `maintenance`) are the URL slugs and match the backend's service types. |
| `REASONS` | "Why choose us" items |
| `STATS` | Figures such as projects completed and years of experience |
| `TESTIMONIALS` | Customer quotes: name, location, photo, text |
| `PROJECTS` | Portfolio items: title, location, category (`Residential` / `Commercial`), service, photo |
| `FAQS` | Questions and answers |

> ⚠️ **`STATS`, `TESTIMONIALS` and `PROJECTS` are placeholders.** Replace them with real figures, real customer feedback (with permission) and photos of real jobs before going live.

**Photos** live in [`public/images`](public/images) and are referenced as `/images/<file>.jpg`. They're free-licence photos from Pexels and Unsplash. To change one, drop the new file in `public/images` and update the path in `site.js` or the page. Landscape JPEGs about 1600px wide, under 400 KB, work well. Page banner images are set in each page's `<PageHero image="…">`.

**The browser tab title and description** are in [`index.html`](index.html).

## How it works

- **API client** ([`src/api/client.js`](src/api/client.js)): a small `fetch` wrapper. It adds the `Authorization: Bearer` header, turns error responses into an `ApiError` (`status`, `message`, `details`), drops empty query parameters, and fetches PDFs as blobs to open or download.
- **Endpoints** ([`src/api/endpoints.js`](src/api/endpoints.js)): every backend endpoint, grouped by resource (`authApi`, `enquiryApi`, `serviceApi`, …).
- **Auth** ([`src/context/AuthContext.jsx`](src/context/AuthContext.jsx)): the JWT is kept in `localStorage` (`ac_token`), and the session is restored on page load with `GET /auth/me`. Any `401` on a logged-in request logs the user out with a message, for example when the token expires or the password changed on another device. Changing the password swaps in the new token the API returns.
- **Data loading** ([`src/hooks/useApi.js`](src/hooks/useApi.js)): `useApi(fn, deps)` returns `{ data, loading, error, reload }`. `useDebounced` delays search input.
- **List filters** ([`src/hooks/useListParams.js`](src/hooks/useListParams.js)): page, search and filters live in the URL query string, so lists can be bookmarked and the back button works.
- **UI kit** ([`src/components/ui.jsx`](src/components/ui.jsx)): toast, modal, badge, card, form fields, pagination, and a confirm-before-acting `ActionButton`.
- **Signatures** ([`src/components/SignaturePad.jsx`](src/components/SignaturePad.jsx)): a canvas pad that works with mouse, touch and pen, and sends the signature as a PNG data URL.
- **Formatting** ([`src/utils/format.js`](src/utils/format.js)): money and date formatting, plus the backend's enum values (service types, statuses, priorities, payment methods).

## Project structure

```
ACFrontend/
├── index.html               # tab title, meta description, Manrope font
├── public/
│   ├── favicon.svg
│   └── images/              # website photos
└── src/
    ├── main.jsx             # entry: loads index.css then site.css
    ├── App.jsx              # all routes
    ├── index.css            # dashboard styles and design tokens
    ├── site.css             # public website styles (scoped under .site)
    ├── api/                 # fetch client + endpoint list
    ├── context/             # AuthContext (session)
    ├── hooks/               # useApi, useDebounced, useListParams
    ├── content/site.js      # website text, services, projects, FAQs
    ├── utils/format.js      # formatting + backend enums
    ├── components/
    │   ├── Layouts.jsx      # PublicLayout, AppLayout, RequireRole
    │   ├── SiteParts.jsx    # website sections: PageHero, QuoteForm, Faq, Testimonials…
    │   ├── ui.jsx           # dashboard UI kit
    │   ├── Pickers.jsx      # client / service / technician pickers
    │   └── SignaturePad.jsx
    └── pages/
        ├── public/          # Home, ServicesPages, About, Projects, Contact, Auth
        ├── admin/           # Enquiries, Clients, Technicians, Invoices, Payments
        ├── services/        # job list, detail, create form
        ├── reports/         # report list, detail, form
        ├── Dashboard.jsx
        └── Profile.jsx
```

## Styling

- **Dashboard**: [`src/index.css`](src/index.css) defines the design tokens (colours, radius, shadows) and follows the device's light or dark mode.
- **Public website**: [`src/site.css`](src/site.css) is scoped under the `.site` wrapper. It uses a fixed light theme, the Manrope font and its own tokens (`--s-primary`, `--s-dark`, …), so website changes can't affect the dashboard and the reverse.
- **Responsive**: breakpoints at 1100px, 960px (burger menu, single-column sections) and 640px. Every page works down to phone width.

## Deployment

1. Set `VITE_API_URL` to the live API, e.g. `https://api.example.com/api`, and set the company variables. Then run `npm run build`.
2. Upload the `dist/` folder to any static host (Netlify, Vercel, Cloudflare Pages, Render static site, cPanel…).
3. **Add a single-page-app fallback** so routes like `/services/repair` or `/app/invoices` load on refresh instead of returning 404:
   - Netlify: create `public/_redirects` containing `/*  /index.html  200`
   - Vercel: create `vercel.json` with `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`
   - Apache / cPanel: an `.htaccess` rewrite of unknown paths to `index.html`
4. On the backend, add the live site's origin to `CLIENT_URL`, putting it **first**, because password-reset links use the first entry.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Cannot reach the server" | The backend isn't running, or `VITE_API_URL` is wrong. It must end in `/api`. |
| CORS error in the browser console | Add this site's exact origin (scheme + host + port) to the backend's `CLIENT_URL` and restart the backend. |
| `.env` change has no effect | Restart `npm run dev`, or rebuild for production. Vite reads env variables at startup or build time. |
| Logged out unexpectedly | The token expired (`JWT_EXPIRES_IN` on the backend) or the password changed on another device. Log in again. |
| Page 404s after refresh on the live site | Add the SPA fallback from [Deployment](#deployment). |
| Booking form says "Too many requests" | The backend limit is 5 enquiries per hour per IP. Wait, or call or WhatsApp instead. |
| Password-reset email never arrives | SMTP isn't configured on the backend. See the backend [Troubleshooting](../../Backend/README.md#troubleshooting). |
| PDF doesn't open | Allow pop-ups for the site. The PDF opens in a new tab. |

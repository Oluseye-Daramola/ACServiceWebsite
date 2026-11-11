# AC Website – Frontend

React 19 + Vite + React Router frontend for the AC service backend (`../../Backend`). It has the public website (home, services, about, projects, contact/booking) and a staff app for **admins** and **technicians**.

## Getting started

```bash
npm install
cp .env.example .env     # set VITE_API_URL if the API isn't on localhost:5000
npm run dev              # http://localhost:5173
```

The backend must be running, and its `CLIENT_URL` must include this frontend's origin (default `http://localhost:5173`). Log in with the admin account made by `npm run seed` in the backend.

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000/api` | Backend base URL, including `/api` |
| `VITE_COMPANY_NAME` | `Haycon Solutions Limited` | Shown in the header and footer |
| `VITE_COMPANY_EMAIL`, `VITE_COMPANY_PHONE`, `VITE_COMPANY_ADDRESS` | Haycon details | Contact details on the website (copy from the backend's `COMPANY_*`) |
| `VITE_COMPANY_HOURS` | `Mon – Sat, 8:00am – 6:00pm` | Opening hours in the top bar and contact page |
| `VITE_CURRENCY` | `NGN` | Currency format (should match the backend's `CURRENCY`) |

## Pages

| Route | Who | Backend endpoints |
|---|---|---|
| `/` | public | quote form → `POST /enquiries` |
| `/services`, `/services/installation`, `/services/repair`, `/services/maintenance` | public | booking form → `POST /enquiries` |
| `/about`, `/projects` | public | – |
| `/contact` | public | `POST /enquiries` |
| `/login`, `/forgot-password`, `/reset-password?token=` | public | `/auth/login`, `/auth/forgot-password`, `/auth/reset-password` |
| `/app` | both | `GET /dashboard` (admin or technician view) |
| `/app/profile` | both | `GET/PATCH /auth/me`, `PATCH /auth/change-password` |
| `/app/enquiries`, `/:id` | admin | list, get, status, **convert to job**, delete |
| `/app/clients`, `/:id` | admin | list, create, get (with jobs + invoices), update, delete |
| `/app/technicians`, `/:id` | admin | list, create, get (job counts), update, reset password, deactivate/reactivate |
| `/app/services`, `/new`, `/:id` | admin: everything · technician: own jobs | list, create, update, assign, status override, delete · technician: start / complete (`/progress`) |
| `/app/reports`, `/:id` | both | list, get, PDF · technician: create, edit, photos, **signature pad** for both signatures · admin: email to client |
| `/app/invoices`, `/new`, `/:id` | admin | list, create, update, cancel, PDF, email, WhatsApp share, record payment |
| `/app/payments`, `/:id` | admin | transactions list + summary, get, reverse |

The public invoice PDF link (`/invoices/public/:id/pdf`) is served directly by the backend.

## Structure

```
src/
├── api/client.js        # fetch wrapper: token, errors, 401 → logout, PDF blobs
├── api/endpoints.js     # every backend endpoint, grouped by resource
├── context/AuthContext  # session (token in localStorage), login/logout
├── components/          # layouts, UI kit (modal, toast, badge…), pickers, SignaturePad
├── hooks/               # useApi (data loading), useListParams (filters in the URL)
├── content/site.js      # website text: services, projects, FAQs, stats, testimonials
├── utils/format.js      # money/date formatting, backend enum values
└── pages/               # public/, admin/, services/, reports/, Dashboard, Profile
```

Website photos live in `public/images` (free Pexels/Unsplash photos). The stats, testimonials and projects in `src/content/site.js` are placeholders: replace them with real ones.

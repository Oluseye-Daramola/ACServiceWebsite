# Haycon Solutions Limited – AC Service Platform

The website and business system for **Haycon Solutions Limited**, an air-conditioning installation, repair and maintenance company in Lagos, Nigeria.

Customers find the company and book a service on the public website. Staff then run each job to the end in the dashboard:

**website enquiry → client → service job → technician report (signed on site) → invoice → payments**

| Folder | What it is | Stack | Docs |
|---|---|---|---|
| [`Backend/`](Backend) | REST API, database, emails, PDFs | Node.js, Express 5, MongoDB (Mongoose), JWT | [Backend README](Backend/README.md) |
| [`Frontend/ACFrontend/`](Frontend/ACFrontend) | Public website + admin/technician dashboard | React 19, Vite, React Router 7 | [Frontend README](Frontend/ACFrontend/README.md) |

---

## Contents

- [What it does](#what-it-does)
- [How the pieces fit](#how-the-pieces-fit)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Staff accounts](#staff-accounts)
- [Everyday workflow](#everyday-workflow)
- [Testing and checks](#testing-and-checks)
- [Deployment](#deployment)
- [Repository layout](#repository-layout)
- [Troubleshooting](#troubleshooting)

---

## What it does

**Public website**
- Home, Services (Installation, Repair, Maintenance), About, Projects and Contact pages.
- Booking and quote forms that send enquiries straight to the business. The customer gets an acknowledgement email and admins get an alert.
- Click-to-call, WhatsApp and email links built from the company details.

**Staff dashboard** (one login, two roles)
- **Admin**: enquiries, clients, technicians, jobs, reports, invoices and payments. Dashboard shows revenue, outstanding balance and work queues.
- **Technician**: sees only their own jobs, files service reports with photos, and captures **both signatures** (theirs and the client's) on their device.

**Behind the scenes**
- Auto-numbered jobs (`SRV-2026-00001`) and invoices (`INV-2026-00001`).
- Signed report and invoice PDFs, sent by email or shared on WhatsApp.
- Payment tracking that can't overpay an invoice. Invoice status updates automatically.
- Password reset by email, rate limiting, input validation and role-based access.

## How the pieces fit

```
 Browser
 ├── Public website  (/, /services, /about, /projects, /contact)
 └── Staff dashboard (/app/...)            Frontend · Vite · :5173
            │
            │  fetch  →  VITE_API_URL  (Authorization: Bearer <JWT>)
            ▼
 REST API  /api/...                         Backend · Express · :5000
 ├── MongoDB Atlas (replica set)            data
 ├── SMTP (e.g. Gmail)                      emails: alerts, reports, invoices, resets
 └── Cloudinary (optional)                  report photos and signatures
```

The frontend never talks to the database directly. Everything goes through the API, which checks the user's role on every request.

## Requirements

| Tool | Version / note |
|---|---|
| Node.js | **20.19+** to run the apps, **24+** to run the backend tests |
| MongoDB | A **replica set**, e.g. [MongoDB Atlas](https://www.mongodb.com/atlas) (the free tier works). Payments use transactions. |
| SMTP account | Optional, but needed for any email. For Gmail, use an [App Password](https://myaccount.google.com/apppasswords). |
| Cloudinary | Optional. Without it, uploads are saved to `Backend/uploads`. |

## Quick start

Open two terminals.

**Terminal 1: backend**

```bash
cd Backend
npm install
cp .env.example .env      # fill in at least MONGO_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run seed              # creates the first admin account
npm run dev               # http://localhost:5000  (check: /api/health)
```

**Terminal 2: frontend**

```bash
cd Frontend/ACFrontend
npm install
cp .env.example .env      # defaults point at http://localhost:5000/api
npm run dev               # http://localhost:5173
```

Open **http://localhost:5173** for the website. Go to **/login** and sign in with the admin email and password from `Backend/.env`.

## Configuration

Each app has its own `.env`. Copy it from that app's `.env.example`, and **never commit a `.env` file**.

| Setting | Backend (`Backend/.env`) | Frontend (`Frontend/ACFrontend/.env`) |
|---|---|---|
| Connection between the apps | `CLIENT_URL=http://localhost:5173` (CORS, reset links) | `VITE_API_URL=http://localhost:5000/api` |
| Company details | `COMPANY_NAME`, `COMPANY_EMAIL`, `COMPANY_PHONE`, `COMPANY_ADDRESS` (PDFs, emails) | `VITE_COMPANY_NAME`, `VITE_COMPANY_EMAIL`, `VITE_COMPANY_PHONE`, `VITE_COMPANY_ADDRESS`, `VITE_COMPANY_HOURS` (website) |
| Currency | `CURRENCY=NGN` | `VITE_CURRENCY=NGN` |
| Secrets | `MONGO_URI`, `JWT_SECRET`, `SMTP_*`, `CLOUDINARY_*`, `ADMIN_PASSWORD` | **none**: everything here is public |

**Keep the company details and currency the same in both files**, so the website, emails and PDFs all match.

For every variable, see the [backend list](Backend/README.md#environment-variables) and the [frontend list](Frontend/ACFrontend/README.md#environment-variables).

## Staff accounts

There's no public sign-up. Staff accounts are created like this:

1. **First admin**: `npm run seed` in `Backend/`, using `ADMIN_*` from `.env`. Running it again with a different `ADMIN_EMAIL` adds another admin.
2. **Technicians**: the admin opens **Technicians → + New technician** in the dashboard and shares the login details.
3. **Passwords**: everyone can change their own password under **Profile**, or use **Forgot password** (this needs SMTP). An admin can also reset a technician's password.
4. **Leavers**: deactivate the technician instead of deleting them, so their job history is kept.

The full steps are in the backend README under [Creating the admin and technicians](Backend/README.md#creating-the-admin-and-technicians).

## Everyday workflow

```
Customer  ── books on the website ─────────────► Enquiry (admin gets an email)
Admin     ── converts enquiry ─────────────────► Client + Job
          ── assigns technician ───────────────► technician gets an email
Technician── starts job, files report, photos
          ── technician + client sign on device ► Job completed
Admin     ── emails signed report PDF to client
          ── creates invoice ──────────────────► email or WhatsApp
          ── records payments ─────────────────► invoice marked "paid"
```

## Testing and checks

| Where | Command | What it checks |
|---|---|---|
| `Backend/` | `npm test` | 159 automated API tests on a throwaway in-memory MongoDB. It never touches your real database, email or Cloudinary. |
| `Frontend/ACFrontend/` | `npm run lint` | ESLint |
| `Frontend/ACFrontend/` | `npm run build` | Production build compiles |

The [Postman collection](Backend/AC-Website.postman_collection.json) walks through the full workflow by hand.

## Deployment

1. **Database**: use a MongoDB Atlas cluster and allow your API host's IP under Network Access.
2. **Backend**: deploy `Backend/` to a Node host (Render, Railway, a VPS…) and set these environment variables:
   - `NODE_ENV=production`
   - a strong `JWT_SECRET`
   - `API_URL` set to the API's public address
   - `CLIENT_URL` with the live website first
   - SMTP and **Cloudinary**, because most hosts wipe the local disk on redeploy
3. **Frontend**: set `VITE_API_URL` to the live API (ending in `/api`). Run `npm run build` and upload `dist/` to a static host (Netlify, Vercel, Cloudflare Pages…). Add a single-page-app fallback to `index.html`.

The [backend deployment notes](Backend/README.md#deployment-notes) and [frontend deployment steps](Frontend/ACFrontend/README.md#deployment) go into more detail.

## Repository layout

```
AC Website/
├── README.md                     # this file
├── Backend/
│   ├── server.js, app.js         # entry point and Express app
│   ├── seedAdmin.js              # npm run seed
│   ├── Config/  Routes/  Controllers/  Models/
│   ├── Validators/  Middleware/  Services/  Utils/
│   ├── Tests/                    # npm test
│   ├── AC-Website.postman_collection.json
│   └── README.md
└── Frontend/
    └── ACFrontend/
        ├── index.html            # tab title, fonts
        ├── public/images/        # website photos
        ├── src/
        │   ├── App.jsx           # routes
        │   ├── content/site.js   # website text, services, projects, FAQs
        │   ├── pages/            # public/, admin/, services/, reports/
        │   ├── components/  api/  context/  hooks/  utils/
        │   ├── index.css         # dashboard styles
        │   └── site.css          # website styles
        └── README.md
```

## Troubleshooting

| Problem | Where to look |
|---|---|
| Backend won't start: `querySrv ECONNREFUSED` | DNS can't resolve the Atlas address. Switch DNS to `8.8.8.8` / `1.1.1.1`, or use the non-SRV `mongodb://` connection string. |
| Website says "Cannot reach the server" | The backend isn't running, or `VITE_API_URL` is wrong (it must end in `/api`). |
| CORS error in the browser | Add the frontend's exact origin to `CLIENT_URL` in `Backend/.env` and restart the backend. |
| No emails | Fill in `SMTP_*` in `Backend/.env`. For Gmail, use an App Password. |
| Changed `.env` but nothing changed | Restart the app. For the frontend, rebuild for production. |
| Live site 404s on refresh | Add the SPA fallback to your static host. |

For more fixes, see the [backend troubleshooting](Backend/README.md#troubleshooting) and [frontend troubleshooting](Frontend/ACFrontend/README.md#troubleshooting) sections.

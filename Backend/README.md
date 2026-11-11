# AC Website – Backend API

REST API for an air-conditioning service business. It runs the whole job lifecycle:

**website enquiry → client → service job → technician report (signed on site) → invoice → payments**

Built with Node.js, Express 5, MongoDB (Mongoose) and JWT authentication.

---

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Roles and workflow](#roles-and-workflow)
- [API reference](#api-reference)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Deployment notes](#deployment-notes)
- [Troubleshooting](#troubleshooting)

---

## Features

- **Two roles**: `admin` (runs the business) and `technician` (does the jobs). Both use one login.
- **Enquiries**: public contact form with spam limits. The customer gets an acknowledgement email, admins get an alert (Reply-To is the customer). One click converts an enquiry into a client and a service job.
- **Clients and services**: auto-numbered jobs (`SRV-2026-00001`), AC unit details, priorities, scheduling. Assigning a technician emails them.
- **Service reports**: technicians record findings, work done, parts and photos, and capture **both signatures** (theirs and the client's) on their device. Reports lock once signed. A technician can only complete a job after both signatures.
- **Report PDF**: downloadable, and emailed to the client once fully signed.
- **Invoices**: auto-numbered (`INV-2026-00001`). Totals, tax and discount are calculated server-side. PDF download, email with the PDF attached, and **WhatsApp sharing** (a wa.me link plus a 7-day public PDF link).
- **Payments**: record cash, transfer, card or POS payments and reverse mistakes (with an audit trail). Invoice status updates automatically (`unpaid → partially_paid → paid`). Overpayment is impossible, even with simultaneous requests (MongoDB transactions).
- **Dashboards**: revenue, outstanding balance and work queues for the admin. Own jobs, schedule and unsigned reports for technicians.
- **Security**: bcrypt passwords, JWT. Changing or resetting a password logs out every other device. Forgot-password emails a 30-minute, single-use link. Helmet, CORS and rate limiting on login, password reset and the contact form. Joi validation on every input.

## Requirements

| | Version |
|---|---|
| Node.js | **20.19+** to run the app, **24+** to run the tests |
| MongoDB | A **replica set**, e.g. [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier works). Payments use transactions, which a plain standalone `mongod` doesn't support. |
| SMTP account | Optional, but needed for any email (password reset, invoices, alerts). Gmail works with an [App Password](https://myaccount.google.com/apppasswords). |
| Cloudinary | Optional. Without it, photos and signatures are saved to `./uploads`. |

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file and fill it in (at least MONGO_URI and JWT_SECRET)
cp .env.example .env

# 3. Create the first admin account (uses ADMIN_EMAIL / ADMIN_PASSWORD from .env)
npm run seed

# 4. Start the API with auto-reload
npm run dev
```

The API runs on `http://localhost:5000`. Check it with:

```bash
curl http://localhost:5000/api/health
```

Then import **`AC-Website.postman_collection.json`** into Postman. The login requests save the token automatically, and the folders follow the real workflow in order.

> **Don't use port 6000.** Chrome and Firefox block it (`ERR_UNSAFE_PORT`), so the frontend couldn't reach the API.

## Environment variables

All variables are listed in [`.env.example`](.env.example). Never commit `.env`.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `MONGO_URI` | ✅ | – | MongoDB connection string (must be a replica set, e.g. Atlas) |
| `JWT_SECRET` | ✅ | – | Long random string used to sign login tokens |
| `JWT_EXPIRES_IN` | | `7d` | How long a login lasts |
| `PORT` | | `5000` | API port |
| `NODE_ENV` | | `development` | Set to `production` when deployed (hides stack traces in error responses) |
| `CLIENT_URL` | | `http://localhost:5173` | Frontend origin(s) allowed by CORS, comma separated. The **first** one is used in password-reset and dashboard links. |
| `API_URL` | | `http://localhost:5000` | Public URL of this API, used in shared invoice PDF links and local upload URLs |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_PHONE` | for `npm run seed` | – | First admin account |
| `COMPANY_NAME`, `COMPANY_EMAIL`, `COMPANY_PHONE`, `COMPANY_ADDRESS` | | – | Printed on PDFs and emails |
| `CURRENCY` | | `NGN` | Currency shown on invoices |
| `TIMEZONE` | | `Africa/Lagos` | Time zone for dates on PDFs (servers usually run on UTC) |
| `DEFAULT_COUNTRY_CODE` | | `234` | Turns local numbers like `0803…` into international format for WhatsApp |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | for email | – | Outgoing mail server. Without these, no email is sent. |
| `ENQUIRY_NOTIFY_EMAILS` | | all active admins | Comma-separated inboxes for new-enquiry alerts |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | | – | Store photos and signatures on Cloudinary instead of `./uploads` |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start with nodemon (restarts on file changes) |
| `npm start` | Start for production |
| `npm run seed` | Create the first admin from `.env` (does nothing if that email already exists) |
| `npm test` | Run the automated test suite (see [Testing](#testing)) |

## Roles and workflow

```
Website visitor ──► POST /api/enquiries ──► admin gets an email alert
                                                   │
Admin ──► convert enquiry ──► Client + Service (pending)
      ──► assign technician ──► Service (assigned), technician emailed
                                                   │
Technician ──► start job (in_progress)
           ──► file report, add photos
           ──► technician signs + client signs (on the technician's device)
           ──► complete job (only allowed when both have signed)
                                                   │
Admin ──► email signed report PDF to client
      ──► create invoice ──► email it or share on WhatsApp
      ──► record payments ──► invoice becomes "paid" automatically
```

- **Admins** can do everything, including overriding a job's status (e.g. marking it completed without a signed report). That is intentional.
- **Technicians** only ever see their own jobs and reports, and never see invoices or money.
- A technician with active jobs can't be deactivated until the jobs are reassigned. Deactivating keeps their history.

## API reference

All endpoints are under `/api`. Unless marked **public**, send the token from login:

```
Authorization: Bearer <token>
```

**Responses** always include `success`. Lists are paginated with `?page=1&limit=20` (max 100) and return:

```json
{ "success": true, "data": [ ... ], "pagination": { "page": 1, "limit": 20, "total": 42, "pages": 3 } }
```

**Errors** look like this. `details` is only present for validation errors:

```json
{ "success": false, "message": "Validation failed", "details": [{ "field": "phone", "message": "phone is required" }] }
```

| Status | Meaning |
|---|---|
| 400 | Invalid input, or the action isn't allowed in the current state |
| 401 | Not logged in, token expired, or password changed since login |
| 403 | Logged in but not allowed (wrong role or deactivated account) |
| 404 | Not found, or not yours (technicians get 404 for other technicians' jobs) |
| 409 | Duplicate, or the record changed while you were editing it (reload and retry) |
| 429 | Too many requests (rate limit) |
| 502 | An email (invoice or report) couldn't be sent because the mail server failed. Safe to retry later. |
| 503 | Email isn't configured on the server (`SMTP_*` variables missing) |

### Auth – `/api/auth`

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/login` | public | `{ email, password }` → `{ token, user }`. Limited to 10 attempts per 15 min per IP. |
| POST | `/forgot-password` | public | `{ email }`. Emails a link to `{CLIENT_URL}/reset-password?token=…`. Always returns the same message. |
| POST | `/reset-password` | public | `{ token, password }`. Sets the password, logs out other devices, returns a new `token`. |
| GET | `/me` | any | Current user |
| PATCH | `/me` | any | `{ name?, phone? }` |
| PATCH | `/change-password` | any | `{ currentPassword, newPassword }`. Returns a new `token`; all other sessions are logged out. |

### Enquiries – `/api/enquiries`

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/` | **public** | Contact form: `{ name, email, phone, message, address?, serviceType?, preferredDate? }`. Limited to 5 per hour per IP. |
| GET | `/` | admin | `?status=new\|contacted\|converted\|closed&search=` |
| GET | `/:id` | admin | |
| PATCH | `/:id/status` | admin | `{ status: new\|contacted\|closed, adminNotes? }` |
| POST | `/:id/convert` | admin | Creates or reuses a client and creates a service. Optional overrides: `clientId, title, serviceType, description, address, scheduledDate, priority, technicianId, adminNotes`. |
| DELETE | `/:id` | admin | Not allowed once converted |

`serviceType` is one of `installation, repair, maintenance, gas_refill, inspection, other`.

### Clients – `/api/clients` (admin)

| Method | Path | Notes |
|---|---|---|
| GET | `/` | `?search=` (name, email, phone, city) |
| POST | `/` | `{ name, phone, email?, address?, city?, notes? }` |
| GET | `/:id` | Includes the client's `services` and `invoices` |
| PATCH | `/:id` | |
| DELETE | `/:id` | Only if the client has no services |

### Technicians – `/api/technicians` (admin)

| Method | Path | Notes |
|---|---|---|
| GET | `/` | `?search=&isActive=true\|false` |
| POST | `/` | `{ name, email, phone, password, specialization? }` |
| GET | `/:id` | Includes job counts by status |
| PATCH | `/:id` | `{ name?, email?, phone?, specialization?, isActive? }`. Deactivating is blocked while they have active jobs. |
| PATCH | `/:id/reset-password` | `{ password }`. Logs the technician out everywhere. |
| DELETE | `/:id` | Deactivates (soft delete). Blocked while they have active jobs. |

### Services (jobs) – `/api/services`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/` | admin, technician | `?status=&serviceType=&priority=&client=&technician=&search=`. Technicians only get their own. |
| GET | `/:id` | admin, technician | Includes `report`. Admins also get `invoice`. |
| POST | `/` | admin | `{ clientId, title, serviceType, description?, address?, acUnits?, scheduledDate?, priority?, adminNotes?, technicianId? }` |
| PATCH | `/:id` | admin | |
| PATCH | `/:id/assign` | admin | `{ technicianId }` (technician is emailed) |
| PATCH | `/:id/status` | admin | `{ status }`. Admin override, any status. |
| PATCH | `/:id/progress` | technician | `{ status: in_progress\|completed, technicianNotes? }`. Completing needs a report signed by both parties. |
| DELETE | `/:id` | admin | Only if there's no invoice or report |

Status flow: `pending → assigned → in_progress → completed` (or `cancelled`). Priority: `low, normal, high, urgent`.

### Service reports – `/api/reports`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/` | admin, technician | `?status=draft\|awaiting_signatures\|signed&technician=` (admin only) |
| GET | `/:id` | admin, technician | |
| GET | `/service/:id` | admin, technician | Report for a service |
| GET | `/:id/pdf` | admin, technician | `?inline=true` to view in the browser. Unsigned reports are marked DRAFT. |
| POST | `/` | technician | `{ serviceId, findings, workDone, partsUsed?, recommendations?, arrivalTime?, departureTime? }` |
| PATCH | `/:id` | technician | Only before anyone has signed |
| POST | `/:id/photos` | technician | `multipart/form-data`, field `photos`, up to 10 JPEG/PNG/WEBP images (5 MB each). Not allowed after signing. |
| POST | `/:id/sign` | technician | `{ signer: technician\|client, name, signature }`, where `signature` is a base64 image data URL from a signature pad |
| POST | `/:id/send-email` | admin | `{ email? }` (defaults to the client's). Only for fully signed reports. |

### Invoices – `/api/invoices`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/` | admin | `?status=unpaid\|partially_paid\|paid\|cancelled&client=&search=&from=&to=` |
| POST | `/` | admin | `{ serviceId, items: [{ description, quantity, unitPrice }], taxRate?, discount?, dueDate?, notes? }`. One active invoice per service. |
| GET | `/:id` | admin | Includes `transactions` |
| PATCH | `/:id` | admin | Only before any payment |
| PATCH | `/:id/cancel` | admin | Reverse any payments first |
| GET | `/:id/pdf` | admin | `?inline=true` to view in the browser |
| POST | `/:id/send-email` | admin | `{ email? }`. Sends the PDF. |
| POST | `/:id/share-whatsapp` | admin | `{ phone? }` → `{ whatsappUrl, pdfLink }`. Open `whatsappUrl` to send. |
| GET | `/public/:id/pdf?token=` | **public** | The link inside the WhatsApp message (valid 7 days) |

Totals are always calculated by the server: `subtotal − discount + tax` (tax is applied after the discount).

### Transactions (payments) – `/api/transactions` (admin)

| Method | Path | Notes |
|---|---|---|
| GET | `/` | `?from=&to=&method=&status=&client=&invoice=`. Also returns `totalAmount`. |
| POST | `/` | `{ invoiceId, amount, method: cash\|bank_transfer\|card\|pos\|other, paymentRef?, paidAt?, notes? }`. Can't exceed the balance. |
| GET | `/summary` | `?from=&to=`. Totals by method and by month, plus the outstanding balance. |
| GET | `/:id` | |
| PATCH | `/:id/reverse` | `{ reason }`. Undoes a payment and recalculates the invoice. |

### Dashboard and health

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/api/dashboard` | admin, technician | Response depends on the role |
| GET | `/api/health` | public | Uptime check |

## Testing

```bash
npm test
```

- Uses Node's built-in test runner with [Supertest](https://github.com/ladjs/supertest) and [mongodb-memory-server](https://github.com/typegoose/mongodb-memory-server).
- **No setup needed**: a throwaway in-memory MongoDB replica set starts automatically. The first run downloads a MongoDB binary (around 100 MB, cached afterwards).
- **Safe**: tests never use your `.env` database, never send real email (a fake mailer captures messages) and never upload to Cloudinary (files go to a temp folder that is deleted afterwards).
- Covers every module: 159 tests, about 30 seconds. They include simultaneous payments (no overpayment), permissions for each role, password-change logout, reset links, PDF generation and email content.
- Run one file: `node --test --test-global-setup=./Tests/setup/globalSetup.js --require=./Tests/setup/env.js Tests/transactions.test.js`

On Windows, a `MongoNetworkError: read ECONNRESET` message may print after the results. That's the test database shutting down and is harmless; check the `pass`/`fail` counts and the exit code.

```
Tests/
├── setup/
│   ├── globalSetup.js   # starts/stops the in-memory MongoDB replica set
│   ├── env.js           # safe test environment + fake mailer (preloaded)
│   └── db.js            # useTestDb(): fresh database per file, wiped before each test
├── mocks/nodemailer.js  # fake mail transport with an inspectable outbox
├── helpers.js           # api() client, data factories, test images
└── *.test.js            # one file per module
```

## Project structure

```
├── server.js            # starts the server: DB connection, graceful shutdown
├── app.js               # Express app: security middleware, routes, error handling
├── seedAdmin.js         # creates the first admin
├── Config/              # env loading, database, Cloudinary
├── Routes/              # URL → middleware → controller
├── Controllers/         # request handling and business rules
├── Models/              # Mongoose schemas (User, Client, Enquiry, Service, ServiceReport, Invoice, Transaction, Counter)
├── Validators/          # Joi schemas for request bodies and params
├── Middleware/          # auth (JWT), role checks, validation, rate limits, uploads, errors
├── Services/            # email, invoice/report PDFs, file storage, WhatsApp links, technician assignment
├── Utils/               # errors, pagination, sequential numbers, logger
└── Tests/               # automated tests
```

## Deployment notes

- Set `NODE_ENV=production`, a strong `JWT_SECRET`, and real `CLIENT_URL` / `API_URL` values. Reset links and WhatsApp PDF links are built from these.
- **Use Cloudinary in production.** Most hosts (Render, Railway, Heroku, etc.) wipe the local disk on every deploy or restart, which would delete `./uploads`.
- The database must be a replica set. Atlas clusters are.
- Rate limits are kept in memory, which is fine for a single server instance.
- The app trusts one proxy hop (`trust proxy = 1`), which is correct behind a typical host's load balancer, so rate limits apply per real client IP.

## Troubleshooting

| Problem | Fix |
|---|---|
| `querySrv ECONNREFUSED _mongodb._tcp…` on start | Your network's DNS can't resolve the Atlas `mongodb+srv://` address. Switch your DNS to `8.8.8.8` / `1.1.1.1`, or use Atlas's standard (non-SRV) `mongodb://` connection string. Also check your IP is allowed in Atlas → Network Access. |
| `Transaction numbers are only allowed on a replica set member` | You're on a standalone local MongoDB. Use Atlas, or run your local MongoDB as a single-node replica set. |
| Browser can't reach the API (`ERR_UNSAFE_PORT`) | You're on port 6000. Use 5000. |
| Emails aren't arriving | Fill in the `SMTP_*` variables. For Gmail use an App Password. The server log shows a warning when email isn't configured or fails. |
| Password reset link points to localhost | Set the first `CLIENT_URL` entry to your live frontend address. |
| CORS error in the browser | Add the frontend's exact origin (scheme + host + port) to `CLIENT_URL`. |

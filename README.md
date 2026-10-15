# Job Application Tracker: Backend

The backend API for the **Job Application Tracker**, a platform where job seekers track every application, interview, and deadline, and verified recruiters move candidates through a hiring pipeline with a written audit trail.

> **Status:** MVP implemented on `main`. Request and response shapes live in [`docs/api-contract.md`](docs/api-contract.md).

---

## Table of contents

1. [The problem](#the-problem)
2. [MVP scope](#mvp-scope)
3. [Tech stack](#tech-stack)
4. [Team and module ownership](#team-and-module-ownership)
5. [Project structure](#project-structure)
6. [Getting started](#getting-started)
7. [Environment variables](#environment-variables)
8. [Running the server](#running-the-server)
9. [API conventions](#api-conventions)
10. [Roles and permissions](#roles-and-permissions)
11. [Data contracts](#data-contracts)
12. [Endpoints by module](#endpoints-by-module)
13. [Seeding data](#seeding-data)
14. [Git workflow](#git-workflow)
15. [Contributing checklist](#contributing-checklist)
16. [Testing](#testing)
17. [Deployment](#deployment)
18. [Roadmap](#roadmap)
19. [Troubleshooting](#troubleshooting)

---

## The problem

A job search spreads across inboxes, spreadsheets, and chat threads. Seekers miss interview times and offer deadlines. Recruiters lose the history of who moved a candidate, and when.

The Job Application Tracker replaces that scatter with **one record per application**: the job, the stage, the interviews, the deadline, the files, and the notices that keep both sides in step.

## MVP scope

The backend provides:

- A secure REST API for registration, email confirmation, login, and profile updates
- Role-based access for job seekers, recruiters, and administrators, with rate limiting
- A public job board with salary, location, requirements, search, pagination, and a closing-date filter
- Applications that link a seeker to the posting’s recruiter, block duplicates, and support withdrawal
- A write-only status history and an all-or-nothing stage update
- Interview rounds with time zones, reschedule and cancel, and a recruiter-set deadline
- In-app notifications, email, and a background job that sends interview and deadline reminders
- Private resume storage (PDF, DOC, DOCX, 5 MB) with short-lived download links
- Job-seeker statistics, an administrator setup script, and seed data for local testing

## Tech stack

| Area | Choice |
|---|---|
| Runtime | Node.js (ES modules, `"type": "module"`) |
| Framework | Express 4 |
| Database | MongoDB with Mongoose 8 |
| Auth | JWT (`jsonwebtoken`) with `bcrypt` password hashing |
| Security | `helmet`, `cors`, `express-rate-limit` |
| Config | `dotenv` |
| Email | Nodemailer |
| Media | Cloudinary authenticated raw storage, via Multer |
| Scheduler | `node-cron` (every 5 minutes) |
| API docs | [`docs/api-contract.md`](docs/api-contract.md) and the Postman collection in `postman/` |
| Tests | Node’s built-in test runner (`node --test`) |
| Hosting | Render |
| Dev tooling | `nodemon`, `morgan` |

> **ES modules reminder:** use `import`/`export` everywhere, and include the `.js` extension in relative imports (`import User from '../models/User.js'`). `require` and `module.exports` will not work.

## Team and module ownership

| No. | Member | Stream | Deliverables |
|---|---|---|---|
| 1 | [Ajah Wisdom Agaba](https://github.com/ajahwisdomagaba) (team lead) | Architecture, login, and security | Project starter, centralized error handling, JWT login, bcrypt, `requireJobseeker` / `requireRecruiter` / `requireAdmin`, rate limiting, `GET` and `PATCH /users/me` |
| 2 | [Elshaddai Akpomedaye](https://github.com/E1spencer) | Seed data, setup, and email | `setupAdmin.js`, `seed.js` (verified recruiters and job posts), Nodemailer, email confirmation token and verify endpoints |
| 3 | [Babajide Ojo](https://github.com/manlike-jide) | Job board | JobPost schema (mandatory salary, location, requirements), `GET /jobs` and `GET /jobs/:jobId`, pagination, closing-date visibility |
| 4 | [Victory Jenom Silas](https://github.com/silasvictory02-code) | Applications and linking | Application schema, `POST /jobs/:jobId/apply`, recruiter linking, duplicate guard, `GET /applications`, withdrawal |
| 5 | [Babajide Ojo](https://github.com/manlike-jide) | Pipeline and audit trail | StatusHistory (write-only, immutable), stage validator (Applied, Interview, Offer, Rejected, Withdrawn), MongoDB session transaction on `PATCH /recruiter/applications/:applicationId/status` |
| 6 | [Destiny Efe](https://github.com/destiny620) | Interviews and deadlines | Interview schema (round and time zone), schedule round 2+, reschedule or cancel, set deadline, job-seeker application detail |
| 7 | [Ajah Wisdom Agaba](https://github.com/ajahwisdomagaba) | Reminders and scheduled job | Notification and Reminder schemas, cron every 5 minutes, 12-hour and 6-hour interview reminders, 24-hour deadline reminder, double-send guard, cancellation triggers, in-app notification endpoints |
| 8 | [Victor Fabian](https://github.com/victor-fabian) | Files, statistics, and QA | Multer (PDF, DOC, DOCX, 5 MB), Cloudinary raw storage, signed links, attachment deletion, `GET /statistics`, Postman collection with test scripts |

## Project structure

```
job-application-tracker/
├── src/
│   ├── server.js              # Entry: loads env, connects DB, starts cron, listens
│   ├── config/                # MongoDB and Cloudinary
│   ├── controllers/           # Request handlers
│   ├── middlewares/           # Auth, rate limits, upload, errors
│   ├── models/                # Mongoose schemas
│   ├── routes/                # One router per area
│   ├── scripts/               # setupAdmin.js and seed.js
│   ├── services/              # Email, cron, reminders, pipeline notices
│   └── utils/                 # AppError, stage rules, statistics helpers
├── test/                      # Node test runner suites
├── docs/
│   └── api-contract.md        # Every route, request, and response
├── postman/                   # Files and statistics collection
├── package.json
├── .env.example               # Copy to .env and fill in
└── README.md
```

## Getting started

### Prerequisites

- **Node.js** (LTS) and **npm**. Check with `node -v` and `npm -v`.
- **Git** and a GitHub account with access to the repo
- A **MongoDB** database: local MongoDB, or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster
- **Postman** for exercising endpoints

Cloudinary and SMTP are optional for a first run. Uploads return 503 until Cloudinary is set. Mail is skipped, and the in-app notice is still saved, until SMTP is set.

### 1. Clone

```bash
git clone https://github.com/ajahwisdomagaba/job-application-tracking.git
cd job-application-tracking
git checkout main
git pull origin main
```

### 2. Install and configure

```bash
npm install
```

Copy the example env file:

```bash
# macOS / Linux / Git Bash
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Set `MONGODB_URI` and `JWT_SECRET` before starting. See [Environment variables](#environment-variables).

### 3. Create your feature branch

```bash
git checkout -b feat/<your-module>
```

### Local MongoDB

The example URI is:

```
mongodb://127.0.0.1:27017/job-application-tracker
```

Start MongoDB, then run the server. No Atlas account is required for local work.

### MongoDB Atlas

1. Create a free **M0** cluster.
2. **Database Access:** create a database user. Avoid `@`, `#`, and `/` in the password, or URL-encode them.
3. **Network Access:** add your current IP. Add it again if your network changes.
4. **Connect → Drivers → Node.js**, and copy the string.
5. Put a database name before the `?`:

   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/job-application-tracker?retryWrites=true&w=majority
   ```

**Each developer should use their own database.** The seed script adds sample recruiters and jobs and does not wipe other collections, but shared data still collides.

## Environment variables

Copy `.env.example` to `.env`. **Never commit `.env`.** It is listed in `.gitignore`.

`.env.example` is the source of truth. If you add a variable, add it there in the same pull request, with a placeholder, never a real secret.

| Variable | Purpose |
|---|---|
| `PORT` | Port the server listens on. Default `5000` |
| `NODE_ENV` | `development` turns on request logging and error stacks |
| `MONGODB_URI` | MongoDB connection string. `MONGO_URI` is accepted if this is unset |
| `JWT_SECRET` | Secret used to sign tokens |
| `JWT_EXPIRES_IN` | Token lifetime. Example: `7d` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name. Empty or `your_*` means uploads are off |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `CLOUDINARY_UPLOAD_FOLDER` | Folder for raw uploads. Default path in the example: `job-tracker/attachments` |
| `MAX_ATTACHMENT_SIZE_MB` | Upload cap. `5` |
| `SIGNED_LINK_TTL_SECONDS` | How long a download link stays valid. `300` |
| `SMTP_HOST` | SMTP host. Leave blank to keep mail unconfigured |
| `SMTP_PORT` | SMTP port. `587` is typical |
| `SMTP_SECURE` | `true` for port 465, otherwise `false` |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `EMAIL_FROM` | From address on outgoing mail |
| `API_BASE_URL` | Public base URL used in confirmation links. Must match `PORT` |
| `ADMIN_NAME` | Name for `npm run setup:admin` |
| `ADMIN_EMAIL` | Email for that admin. The script will not promote an existing non-admin |
| `ADMIN_PASSWORD` | At least 8 characters |
| `SEED_RECRUITER_PASSWORD` | Shared password for the two sample recruiters. At least 8 characters |

## Running the server

```bash
npm run dev      # restarts when files change
npm start        # one process, no reload
```

You should see a MongoDB connection message and:

```
Server is running IN development mode on port 5000
```

Check it:

```
GET http://localhost:5000/health
```

```json
{ "success": true, "message": "Server is running" }
```

Stop the server with `Ctrl + C`. A new `.env` value applies only after a restart.

The cron job starts with the server and runs every 5 minutes. It is quiet until reminders exist.

## API conventions

- **Base path:** `/api/v1` (health is `GET /health`)
- **Format:** JSON, except attachment upload, which is `multipart/form-data`
- **Auth:** `Authorization: Bearer <token>`
- **Most success responses:**

  ```json
  { "success": true, "message": "What happened", "data": {} }
  ```

- **Public jobs and the recruiter stage update:**

  ```json
  { "status": "success" }
  ```

- **Errors from the error handler:**

  ```json
  { "success": false, "message": "Description of what went wrong" }
  ```

  In `NODE_ENV=development` that body also includes `stack`.

- **Status codes:** `200` OK, `201` Created, `400` validation, `401` not authenticated, `403` wrong role or ownership, `404` not found, `409` illegal stage change or duplicate interview round, `415` file type not allowed, `429` rate limit, `500` server error, `503` mail or Cloudinary not configured
- **Validation:** read only the fields the handler expects. Do not pass `req.body` straight into a model
- **IDs:** MongoDB ObjectIds

### Rate limits

| Limiter | Window | Max | Where |
|---|---|---|---|
| Login | 15 minutes | 5 failed attempts. A response under 400 is not counted | `POST /api/v1/auth/login` |
| Public | 10 minutes | 100 | Register, confirm, resend, `GET /jobs`, `GET /jobs/:jobId` |
| Authenticated | 10 minutes | 100 | Profile, applications, recruiter routes, attachments, statistics |

Login lockout message: `Too many failed login attempts. Please try again after 15 minutes.` Other limiters: `Too many requests. Please slow down.`

## Roles and permissions

| Role | Can do |
|---|---|
| **Job seeker** | Register, confirm email, log in, edit profile, browse open jobs, apply once per job, list and open their applications, withdraw, upload files, read their statistics and notifications |
| **Recruiter** | Register with a company name. Starts as `verificationStatus: "pending"`. A **verified** recruiter moves stages, schedules and changes interviews, and sets deadlines on applications linked to them |
| **Admin** | Created only by `npm run setup:admin`. Can read global attachment statistics (`scope=all`) and manage attachments the same way an owner can |

Public registration cannot create an admin. Login is blocked until `isEmailConfirmed` is true. A new account receives a confirmation link that lasts 24 hours.

## Data contracts

These names and allowed values are shared across modules. **Do not rename them without telling the team.** Full bodies are in [`docs/api-contract.md`](docs/api-contract.md).

### User

| Field | Allowed values / rule |
|---|---|
| `role` | `jobseeker` \| `recruiter` \| `admin` |
| `companyName` | Required when `role` is `recruiter` |
| `verificationStatus` | `pending` \| `verified` \| `rejected` for recruiters |
| `isEmailConfirmed` | `false` until the confirmation link is used |
| `password` | At least 8 characters. Stored as a bcrypt hash. Never returned |

### JobPost

| Field | Rule |
|---|---|
| `title`, `description`, `field`, `location` | Required strings. `title` max 150 characters |
| `requirements` | Required array of non-blank strings. At least one item |
| `salaryMin`, `salaryMax` | Required numbers, `salaryMin` ≥ 0, `salaryMax` ≥ `salaryMin` |
| `salaryCurrency` | Required. Default `Naira` |
| `salaryPeriod` | `per month` \| `per year` |
| `closingDate` | Required date. Applications stop when this moment has passed |
| `status` | `Open` \| `Closed` |
| `recruiter` | Must be a verified recruiter. `companyName` is copied from that account |
| `companyName` | Stored on the job so the public board does not need the recruiter document |

### Visibility rule

A job appears on the public board, and accepts applications, **only when**:

```
status === "Open"  AND  closingDate >= now
```

Public job JSON omits `recruiter` and `__v`.

List filters: `page` (default 1), `limit` (default 10, max 50), `field` (exact, case-insensitive), `search` (keyword on title, company, field, description, location, and requirements).

### Application

| Field | Rule |
|---|---|
| `owner` | The job seeker |
| `job` | The JobPost |
| `recruiter` | Copied from the job at apply time |
| `companyName`, `jobTitle` | Copied at apply time |
| `currentStage` | `Applied` \| `Interview` \| `Offer` \| `Rejected` \| `Withdrawn`. Starts at `Applied` |
| `deadline` | Optional date set by the recruiter. The field name is `deadline` |

One seeker can hold one application per job. The unique index is `{ owner, job }`.

### Stage rules

| From | Allowed next | Who |
|---|---|---|
| Applied | Interview, Rejected | Recruiter |
| Applied | Withdrawn | Job seeker |
| Interview | Offer, Rejected | Recruiter |
| Interview | Withdrawn | Job seeker |
| Offer, Rejected, Withdrawn | none | Terminal |

A recruiter status call may send only `Interview`, `Offer`, or `Rejected`. Withdrawal is `PATCH /api/v1/applications/:applicationId/withdraw`.

The status update writes the new stage, a StatusHistory row, and the first interview (when moving to Interview) in one MongoDB transaction. StatusHistory rows are immutable. Updates and deletes on that collection throw.

Moving to `Rejected`, or withdrawing, cancels that application’s reminders. Moving to `Interview` schedules interview reminders.

### Interview

| Field | Rule |
|---|---|
| `roundNumber` | Integer ≥ 1. Unique per application. Round 1 is created with the Interview stage. Later rounds use the schedule endpoint |
| `dateTime` | Required |
| `timeZone` | Required. Default `Africa/Lagos` |
| `type` | `phone` \| `video` \| `in-person` |
| `locationOrLink` | Required |
| `status` | `Scheduled` \| `Rescheduled` \| `Cancelled` |

## Endpoints by module

All routes are under `/api/v1` unless noted. Shapes, query rules, and error strings are in [`docs/api-contract.md`](docs/api-contract.md).

### Health

| Method | Route | Access |
|---|---|---|
| GET | `/health` | Public |

### Auth and profile ([Ajah Wisdom Agaba](https://github.com/ajahwisdomagaba), [Elshaddai Akpomedaye](https://github.com/E1spencer))

| Method | Route | Access |
|---|---|---|
| POST | `/auth/register` | Public. Body includes `name`, `email`, `password`. Recruiters also send `companyName` and `role: "recruiter"` |
| GET | `/auth/confirm-email?token=` | Public |
| POST | `/auth/resend-confirmation` | Public |
| POST | `/auth/login` | Public. Rejected until the email is confirmed |
| GET | `/users/me` | Any logged-in user |
| PATCH | `/users/me` | Any logged-in user |

### Job board ([Babajide Ojo](https://github.com/manlike-jide))

| Method | Route | Access |
|---|---|---|
| GET | `/jobs` | Public. Query: `page`, `limit`, `field`, `search` |
| GET | `/jobs/:jobId` | Public. Hidden when closed or past `closingDate` |

### Applications ([Victory Jenom Silas](https://github.com/silasvictory02-code), [Destiny Efe](https://github.com/destiny620))

| Method | Route | Access |
|---|---|---|
| POST | `/jobs/:jobId/apply` | Job seeker |
| GET | `/applications` | Job seeker. Their applications only |
| GET | `/applications/:applicationId` | Job seeker. Includes interviews |
| PATCH | `/applications/:applicationId/withdraw` | Job seeker |

### Pipeline ([Babajide Ojo](https://github.com/manlike-jide))

| Method | Route | Access |
|---|---|---|
| PATCH | `/recruiter/applications/:applicationId/status` | Verified recruiter who owns the application. Body: `{ "stage": "Interview" \| "Offer" \| "Rejected" }`. Interview also needs the round-1 interview fields |

### Interviews and deadlines ([Destiny Efe](https://github.com/destiny620))

| Method | Route | Access |
|---|---|---|
| POST | `/recruiter/applications/:applicationId/interviews` | Recruiter. Round 2 and later |
| PATCH | `/recruiter/applications/:applicationId/interviews/:interviewId` | Recruiter. Reschedule or cancel |
| PATCH | `/recruiter/applications/:applicationId/deadline` | Recruiter |

### Notifications ([Ajah Wisdom Agaba](https://github.com/ajahwisdomagaba))

| Method | Route | Access |
|---|---|---|
| GET | `/notifications` | Logged-in user. Their notices only |
| PATCH | `/notifications/:notificationId/read` | Owner |

Stage changes to Interview, Offer, or Rejected also create an in-app notice and attempt an email. Reminder rows are not called over HTTP. The cron job delivers them.

### Files and statistics ([Victor Fabian](https://github.com/victor-fabian))

| Method | Route | Access |
|---|---|---|
| POST | `/attachments` | Job seeker. Multipart file field. PDF, DOC, or DOCX, up to 5 MB |
| GET | `/attachments` | Logged-in user |
| GET | `/attachments/:id` | Owner or admin |
| GET | `/attachments/:id/link` | Owner or admin. Short-lived Cloudinary URL |
| DELETE | `/attachments/:id` | Owner or admin |
| GET | `/statistics` | Job seeker |
| GET | `/statistics/attachments` | Logged-in user. `?scope=all` requires an admin |

The Postman collection in `postman/` covers this module and includes test scripts.

## Seeding data

Create the one-time administrator, then load sample recruiters and open jobs.

```bash
npm run setup:admin
npm run seed
```

`setup:admin` reads `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. If that email already belongs to a non-admin, the script stops and changes nothing. A second run against an existing admin prints a message and exits cleanly.

`seed` reads `SEED_RECRUITER_PASSWORD` (at least 8 characters) and ensures two verified, email-confirmed recruiters plus their open jobs:

| Email | Company |
|---|---|
| `ada.recruiter@example.com` | Northstar Digital |
| `tunde.recruiter@example.com` | Greenfield Technologies |

Seeded jobs use `status: "Open"` and a closing date in the future, so they show on `GET /jobs`. Re-running the script reuses those accounts and titles. It does not delete your other users, applications, or files.

Run both scripts against your own development database.

## Git workflow

- **`main`:** integration branch. Feature work lands here through a pull request
- **`feat/<module>`:** one branch per change, created from an up-to-date `main`

```bash
git checkout main && git pull origin main
git checkout -b feat/<your-module>
# ...make changes...
git add .
git commit -m "feat(jobs): require a non-empty requirements list"
git push -u origin feat/<your-module>
```

### Commit messages

Use a short prefix: `feat(scope):`, `fix(scope):`, `docs:`, `refactor(scope):`, `test(scope):`, `chore:`.

### Pull requests

1. Push your branch and open a pull request into **`main`**.
2. Describe what is included, any schema or contract change, and what you tested.
3. If a route, body, or error message changed, update [`docs/api-contract.md`](docs/api-contract.md) in the same pull request.
4. Request review from [Ajah Wisdom Agaba](https://github.com/ajahwisdomagaba). Address feedback with new commits on the same branch.

## Contributing checklist

Before opening a pull request:

- [ ] Branched from an up-to-date `main`
- [ ] Uses ES module syntax with `.js` extensions on relative imports
- [ ] No secrets, `.env`, or `node_modules` committed
- [ ] New environment variables added to `.env.example`
- [ ] Inputs validated, and only expected fields read from the body
- [ ] Errors that go through the handler use `{ "success": false, "message": "..." }`
- [ ] Routes use `protect` and the correct `requireJobseeker`, `requireRecruiter`, or `requireAdmin` check
- [ ] Shared field names (`deadline`, stage names, JobPost requirements) unchanged, or the change is called out for the team
- [ ] [`docs/api-contract.md`](docs/api-contract.md) matches the route you added or changed
- [ ] `npm test` passes, and you tried the endpoint locally

## Testing

```bash
npm test
```

That runs `node --test` across `test/` and `src/test/`. Suites cover the application model and controller, job requirements, upload rules, statistics, email confirmation, the database config, and reminder notices.

Mail tests still pass when SMTP is blank. The notice is saved, and the email error is logged.

The Postman collection under `postman/` is the manual pass for uploads, signed links, deletion, and statistics. Point its environment at your local base URL and a confirmed job-seeker token.

## Deployment

Staging and production are intended for Render. Set every variable from `.env.example` in the Render dashboard. Do not commit a filled-in `.env`.

- Start command: `npm start`
- Health check path: `/health`
- Bind the process to `0.0.0.0` and `process.env.PORT`. Render assigns the port
- The filesystem is ephemeral. Attachments belong in Cloudinary, not on local disk
- Give staging its own MongoDB database, Cloudinary folder, and SMTP account

## Roadmap

The eight streams above are on `main`. Next work:

| Focus | Why |
|---|---|
| Render listen address | The process must bind `0.0.0.0` so the health check can reach it |
| Broader Postman coverage | The current collection covers files and statistics. Auth, jobs, applications, and the pipeline still rely on the written contract |
| Staging SMTP and Cloudinary | Confirmation mail, stage mail, reminders, and uploads need real credentials outside local development |
| Interview reminder cancellation | Reschedule and cancel should clear that round’s pending reminders when the interview changes, not only when the cron next fires |

## Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| `EADDRINUSE` | Something else is on `PORT`. Stop it, or change `PORT` in `.env` and restart |
| `ERR_MODULE_NOT_FOUND` | A relative import is missing its `.js` extension, or `npm install` has not been run |
| `require is not defined in ES module scope` | Use `import` / `export`, not `require` / `module.exports` |
| MongoDB connection failure | `MONGODB_URI` is wrong, MongoDB is not running, or (on Atlas) your IP is not allowed |
| Password with `@`, `#`, `/` breaks Atlas | URL-encode it (`@` becomes `%40`) or choose a simpler password |
| Env variable is `undefined` | The name does not match `.env.example`, or the server was not restarted after the edit |
| Login says the email is not confirmed | Open the link from the confirmation mail, or call `POST /auth/resend-confirmation`. SMTP must be set for the mail to leave the machine |
| `GET /jobs` returns an empty list | Jobs must be `Open` with `closingDate` still in the future. Run `npm run seed` after setting `SEED_RECRUITER_PASSWORD` |
| Apply returns 404 for a job you can see in the database | The posting is `Closed` or past its closing date. The public routes hide it on purpose |
| Stage update returns 409 | The move is not in the stage table, or the application is already Offer, Rejected, or Withdrawn |
| Stage update returns 403 | The caller is not a verified recruiter, or the application belongs to another recruiter |
| Upload returns 415 | The file is not PDF, DOC, or DOCX |
| Upload returns 503 | Cloudinary keys are missing or still start with `your_` |
| Reminder email never arrives | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` are blank. The in-app notification can still exist |
| `ADMIN_PASSWORD` or seed password rejected | Both must be at least 8 characters |
| `setup:admin` refuses an email | That address already belongs to a job seeker or recruiter. Pick a different `ADMIN_EMAIL` |

---

*Maintained by the Job Application Tracker backend team. Team lead: [Ajah Wisdom Agaba](https://github.com/ajahwisdomagaba).*

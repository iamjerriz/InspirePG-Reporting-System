# Logger System

An internal tool for logging "Proof of OOP Login" records. Users fill out a
short form (name, SID, area, seller type, and a proof-of-login image);
submissions are written to a Supabase Postgres table, and the uploaded image
is stored in Supabase Storage. A password-protected `/admin` page lets an
admin view, search/filter, edit, and delete every submitted record.

There are two pages: the public logger form (`/`) and the admin dashboard
(`/admin`). No user accounts, analytics, or other pages are included.

---

## 1. Project Overview

- **Frontend**: React + Vite + TypeScript + Tailwind CSS, routed with
  `react-router-dom`. The logger form validates input client-side with
  `react-hook-form` + `zod` and submits via `multipart/form-data`; the admin
  page has a login screen and a sortable/filterable table of submissions with
  edit/delete actions (dark mode by default, toggleable).
- **Backend**: Node.js + Express + TypeScript. Validates the submission again
  server-side, uploads the proof image to a Supabase Storage bucket, and
  writes a row to a `log_entries` table in Supabase Postgres via
  `@supabase/supabase-js` (using the service role key — Postgres itself
  handles concurrent writes, so no in-process locking is needed). Also
  exposes a cookie-authenticated admin API for reading, updating, and
  deleting logged rows.

```text
logger-system/
├── frontend/   React + Vite + TypeScript client
├── backend/    Express + TypeScript API
│   └── supabase/schema.sql   Table + storage bucket setup for a new project
└── README.md
```

**Important:** the React frontend never talks to Supabase directly — it only
ever calls the backend over HTTP. The backend holds the Supabase service role
key (which bypasses Row Level Security) and is the only thing with direct
database/storage access.

---

## 2. Requirements

- Node.js 18+ (tested on Node 22)
- npm 9+

---

## 3. Installation

Each side is an independent npm project — install both.

```bash
cd logger-system/backend
npm install

cd ../frontend
npm install
```

---

## 4. Frontend Setup

```bash
cd logger-system/frontend
npm run dev
```

Runs on **http://localhost:5173**. The Vite dev server proxies any request to
`/api/*` to the backend at `http://localhost:3001` (see `vite.config.ts`), so
the frontend code just calls `fetch("/api/log", ...)` with no hardcoded host.

Other scripts:

- `npm run build` — type-checks and builds a production bundle to `dist/`
- `npm run preview` — serves the production build locally
- `npm run typecheck` — TypeScript project-reference check with no emit

---

## 5. Backend Setup

The backend requires a Supabase project — it will not start without one (the
Supabase URL and service role key are required env vars).

1. Create a project at [supabase.com](https://supabase.com) (or use an
   existing one).
2. In the Supabase SQL editor, run `backend/supabase/schema.sql` — it creates
   the `log_entries` table (with Row Level Security enabled and no
   anon/authenticated policies, so only the service role key can touch it)
   and a private `proofs` storage bucket.
3. In **Project Settings → API**, copy the **Project URL** and the
   **service_role** key (not the `anon` key — the service role key is
   required to bypass RLS from the backend).

```bash
cd logger-system/backend
cp .env.example .env
# edit .env: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

Runs on **http://localhost:3001** by default (`tsx watch`, restarts on save).

Other scripts:

- `npm run build` — compiles TypeScript to `dist/`
- `npm start` — runs the compiled server (`dist/server.js`)
- `npm run typecheck` — `tsc --noEmit`
- `npm run migrate:supabase` — one-time script to import any existing
  `backend/data/logger.xlsx` rows and `backend/uploads/` images left over
  from before this migration (safe to re-run; already-migrated rows are
  skipped). See `backend/scripts/migrateToSupabase.ts`.

---

## 6. Environment Variables

Defined in `backend/.env.example`:

```env
PORT=3001
MAX_FILE_SIZE_MB=5
CORS_ORIGIN=http://localhost:5173

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=proofs

ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
JWT_SECRET=
SESSION_TTL_HOURS=8
```

| Variable                    | Purpose                                                                 |
| ---------------------------- | ------------------------------------------------------------------------ |
| `PORT`                       | Port the Express server listens on                                      |
| `MAX_FILE_SIZE_MB`           | Maximum accepted image size                                             |
| `CORS_ORIGIN`                | Allowed origin for CORS (only relevant if you bypass the Vite proxy)    |
| `SUPABASE_URL`                | **Required.** Your Supabase project's URL (Project Settings → API)     |
| `SUPABASE_SERVICE_ROLE_KEY`   | **Required.** Service role key — bypasses RLS, backend-only, never expose to the frontend |
| `SUPABASE_STORAGE_BUCKET`     | Storage bucket for proof images (default `proofs`, created by `schema.sql`) |
| `ADMIN_USERNAME`              | Login username for `/admin`                                             |
| `ADMIN_PASSWORD`              | Login password for `/admin` — **change this before deploying anywhere shared** |
| `JWT_SECRET`                  | Signing key for admin session tokens. If unset, a random one is generated at startup (sessions won't survive a restart) — set this explicitly in production |
| `SESSION_TTL_HOURS`           | How long an admin login session lasts before requiring re-login          |

The backend throws on startup if `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`
is missing — there's no local-file fallback anymore.

The frontend has no required environment variables in development, since it
talks to the backend through the Vite proxy.

---

## 7. Running Locally (both servers)

Open two terminals:

```bash
# Terminal 1
cd logger-system/backend
npm run dev

# Terminal 2
cd logger-system/frontend
npm run dev
```

Then open **http://localhost:5173**.

---

## 8. How Supabase Storage Works

- The backend keeps one table, `log_entries` (see `backend/supabase/schema.sql`
  for the exact DDL), with these columns:

  | id (identity PK) | timestamp | first_name | last_name | sid | area | seller_type | proof_filename | created_at |

- `Timestamp` is generated by the backend (`new Date()` at the moment the
  request is handled), never trusted from the browser, and stored as text in
  the same `YYYY-MM-DD HH:MM:SS` (UTC) format the old Excel version used.
- SID is always stored and validated as a plain string, never coerced to a
  number, so leading zeros or non-numeric SIDs are preserved.
- `id` is a real auto-incrementing primary key (Postgres `generated always as
  identity`) — the admin edit/delete API addresses records by this `id`.

### Concurrency

Postgres handles concurrent writes natively (row-level locking, MVCC), so
unlike the old Excel file there's no need for the backend to serialize writes
itself — `backend/src/db.ts` just issues normal `insert`/`update`/`delete`
calls via `@supabase/supabase-js`. Multiple backend instances can safely write
to the same table.

### Row Level Security

`log_entries` has RLS enabled with **no policies** for the `anon` or
`authenticated` roles — only requests made with the service role key (which
only the backend holds) can read or write it. The frontend never receives or
uses a Supabase key at all; it only talks to the Express API.

---

## 9. How Image Uploads Work

- The frontend sends the image as part of a `multipart/form-data` request
  (via `FormData`), field name `proof`.
- The backend (`multer`, configured in `backend/src/upload.ts`) buffers the
  upload in memory and validates the MIME type (`image/jpeg`, `image/png`,
  `image/webp` only) — the client-supplied filename and extension are never
  trusted.
- Accepted images are uploaded to the `proofs` Supabase Storage bucket under a
  generated filename such as `proof_<timestamp>_<random-hex><ext>` (extension
  derived from the detected MIME type), so uploads can never overwrite each
  other.
- The generated filename is what gets written into the `proof_filename`
  column of `log_entries` — the image binary itself is never stored in
  Postgres.
- The `proofs` bucket is **private** (not public). `GET
  /api/admin/proof/:filename` (admin-only) issues a short-lived (60s) signed
  URL via `createSignedUrl` and redirects to it — there's no public,
  guessable URL for any proof image.

---

## 10. Admin Dashboard (`/admin`)

A separate page at **http://localhost:5173/admin** lets an admin log in and
view every submitted record in a sortable, filterable table.

- **Login**: single shared admin username/password, set via `ADMIN_USERNAME`
  / `ADMIN_PASSWORD` (defaults to `admin` / `admin123` for local dev — change
  these before sharing the app with anyone). On success the backend sets an
  `httpOnly` session cookie signed with `JWT_SECRET`; the cookie can't be read
  or forged from client-side JS.
- **Session**: lasts `SESSION_TTL_HOURS` (default 8h), then the admin has to
  log in again. `GET /api/admin/session` is used on page load to restore the
  logged-in state without re-entering credentials.
- **Brute-force protection**: the login endpoint locks out an IP for 15
  minutes after 5 failed attempts (in-memory, per backend process — see the
  concurrency caveat in §8 for why this doesn't span multiple instances).
- **Table**: sortable by clicking any column header (toggles ascending/
  descending), plus a text search (matches first name, last name, or SID) and
  Area / Seller Type dropdown filters. All filtering/sorting happens
  client-side over the full result set, which is fine at this app's expected
  scale (see §13).
- **Proof images**: each row has a "View" link that opens the image via the
  authenticated `GET /api/admin/proof/:filename` route — this route is not
  public; it requires the same admin session cookie and only accepts
  filenames matching the exact pattern the backend generates (see §9),
  rejecting anything else to prevent path traversal.
- This is a single shared admin credential, not a multi-user account system —
  intentional, to match the "single internal tool" scope. If you need
  per-admin accounts or audit trails, that's a larger change to `backend/src/auth.ts`.

---

## 11. API Endpoint Documentation

### `POST /api/log`

Content-Type: `multipart/form-data`

| Field        | Type   | Notes                                              |
| ------------ | ------ | --------------------------------------------------- |
| `firstName`  | string | required, non-empty                                 |
| `lastName`   | string | required, non-empty                                 |
| `sid`        | string | required, non-empty, kept as a string               |
| `area`       | string | required, must be one of the configured Area values |
| `sellerType` | string | required, must be valid for the selected `area`     |
| `proof`      | file   | required, exactly one image, JPG/PNG/WEBP, ≤ 5MB    |

**Success — `200 OK`**

```json
{ "success": true, "message": "Logger entry successfully saved." }
```

**Validation error — `400 Bad Request`**

```json
{ "success": false, "message": "Invalid seller type for the selected area." }
```

Returned for: missing/empty required fields, an unrecognized `area`, a
`sellerType` that isn't valid for the given `area`, a missing image, a
disallowed image MIME type, or an image over the size limit.

**Server error — `500 Internal Server Error`**

```json
{ "success": false, "message": "Unable to save the record. Please try again." }
```

Returned for unexpected failures (e.g. Supabase Storage/Postgres errors).

### `GET /api/health`

Simple liveness check; returns `{ "status": "ok", "areas": [...] }`.

### `POST /api/admin/login`

Content-Type: `application/json`, body `{ "username": string, "password": string }`.
On success, sets the `logger_admin_session` httpOnly cookie and returns
`{ "success": true, "message": "Logged in." }`. Returns `401` for bad
credentials, `429` if the calling IP is temporarily locked out.

### `POST /api/admin/logout`

Clears the session cookie. Always returns `{ "success": true }`.

### `GET /api/admin/session`

Returns `{ "authenticated": boolean }` based on whether a valid session
cookie is present. Never errors — used by the frontend to restore login state
on page load.

### `GET /api/admin/logs` _(requires admin session)_

Returns `{ "success": true, "rows": LogEntry[] }`, one object per row in
`log_entries` (`id`, `timestamp`, `firstName`, `lastName`, `sid`, `area`,
`sellerType`, `proofFilename`). Returns `401` if not logged in.

### `GET /api/admin/proof/:filename` _(requires admin session)_

Redirects (`302`) to a short-lived signed URL for that image in Supabase
Storage. `filename` must match the backend-generated pattern exactly;
anything else gets `400`. Returns `404` if the file doesn't exist, `401` if
not logged in.

### `PUT /api/admin/logs/:id` _(requires admin session)_

Content-Type: `multipart/form-data`. Same fields as `POST /api/log`
(`firstName`, `lastName`, `sid`, `area`, `sellerType`), but `proof` is
**optional** — omit it to keep the record's existing image, or include a new
one to replace it (the old file is deleted from Storage after the swap). The
row's original `timestamp` is preserved automatically. Returns `404` if `id`
doesn't exist, otherwise the same success/validation-error shape as
`POST /api/log`.

### `DELETE /api/admin/logs/:id` _(requires admin session)_

Deletes the row and its proof image from Storage. Returns
`{ "success": true, "message": "Record deleted." }`, or `404` if `id` doesn't
exist.

---

## 12. Production Deployment Considerations

- Because storage is now Supabase (Postgres + Storage) rather than a local
  file, the backend **can** run on serverless/ephemeral infrastructure (AWS
  Lambda, Vercel functions, Cloud Run, etc.) — nothing is written to local
  disk anymore.
- Set `CORS_ORIGIN` to the real frontend origin, build the frontend
  (`npm run build`) and serve the static output from a proper web
  server/CDN, and run the backend with `npm run build && npm start` behind a
  process manager (pm2, systemd, Docker, etc.) or your serverless platform of
  choice.
- Use your Supabase project's regular backup features (or `pg_dump`) for the
  `log_entries` table; Supabase Storage objects in the `proofs` bucket are
  the only copies of uploaded images.
- Set real values for `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `JWT_SECRET` —
  the built-in defaults are for local development only.
- Double-check `SUPABASE_SERVICE_ROLE_KEY` is only ever set as a backend
  server env var, never bundled into or exposed to the frontend.

---

## 13. Notes on the Supabase Migration

This project originally stored data in a shared `logger.xlsx` file with
images on local disk. It migrated to Supabase (Postgres + Storage) to remove
the single-writer/single-filesystem constraints that came with that approach.
A few things carried over deliberately, and a few didn't:

- **Carried over as-is**: admin auth (still a single shared username/password
  + custom JWT cookie, not Supabase Auth), the `timestamp` text format, and
  the Area/Seller Type validation config.
- **Changed**: records are now addressed by a real Postgres primary key
  (`id`) instead of array position; concurrent writes are handled by Postgres
  instead of an in-process queue; proof images live in a private Storage
  bucket instead of an unlisted local folder.
- **One-time migration**: `backend/scripts/migrateToSupabase.ts` moves any
  pre-existing `logger.xlsx` rows and `uploads/` images into Supabase — see
  §5. It's not part of the running app; run it once, then it's safe to leave
  `backend/data/` and `backend/uploads/` as a local backup or remove them.

---

## Modifying Area / Seller Type Options

All Area → Seller Type mappings live in one object per project:

- `backend/src/sellerTypes.ts` (authoritative — this is what's actually
  validated against)
- `frontend/src/config/sellerTypes.ts` (drives the dropdowns; keep in sync
  with the backend)

```ts
export const sellerTypesByArea = {
  Cavite: ["FSE BAU", "FSE TB", "CBA", "Wiredup", "PTM", "ConnectPro"],
  Laguna: ["FSE BAU", "FSE TB", "CBA", "GMC", "JASS", "NOAH GENESIS"],
  BaMiro: ["FSE BAU", "FSE TB", "STL", "CBA", "BATANGAS EMVIEM", "MINDORO EMVIEM"],
  "Quezon Province": ["FSE BAU", "CBA INHOUSE", "CBA RCJC", "STL"],
  Bicol: ["FSE BAU", "STL", "CBA TEAMBASED", "CBA INHOUSE", "RMS"],
};
```

> **Note on BaMiro:** the original spec listed a generic `EMVIEM` seller type
> for BaMiro, and separately described BaMiro as covering Batangas/Mindoro
> with `BATANGAS EMVIEM` / `MINDORO EMVIEM` options. This project keeps the
> two region-specific options and drops the generic `EMVIEM` entry. If that
> reading is wrong, edit both `sellerTypesByArea` objects above — nothing
> else needs to change.

To add/remove an Area or Seller Type, edit both files identically. The
backend rejects any `(area, sellerType)` pair not present in its copy of the
config, regardless of what the frontend sends.

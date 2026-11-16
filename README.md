# TrackLab Web (Next.js frontend)

Web app for **TrackLab**: manage master trackers (the steps of a lab analysis flow), lab analysis requests, and each request's tracking progress. Built from the provided designs, with a few UX improvements.

Backend repository: see `tracklab-backend` (.NET). It handles auth, talks to the assessment API, and provides logging and the audit trail.

## Features

| Page | What you can do |
|---|---|
| **Login** | Log in with the assessment account. Validation, show/hide password, a friendly message when the session expires, and a redirect back to the page you came from |
| **Dashboard** | Totals for requests, trackers and trackings, plus recent activity from the audit trail |
| **Master Tracker** | CRUD trackers (feature 2): server-side paging, sorting on every column, search, page size, add/edit form with validation, parent-step picker, delete (deactivate), per-record change history |
| **Lab Analysis Request** | CRUD requests (feature 3): paging, sorting, search, **Filter By** (project code / last status / receiving status, all or any condition), add/edit form, delete, history |
| **Request → Tracking progress** | Timeline of every tracker step for one request: record, edit or remove a step (bonus FE, CRUD trackings). The value input matches the step's action type (date / text / file / none), and the request's *Last Status* can update automatically |
| **Tracking Progress** | All trackings in one paged table, with full CRUD |
| **Audit Trail** | Who created, changed or deleted what, field by field, with filters |
| **System Logs** | Backend log viewer (feature 4): filter by date, level and text, and click a request ID to see every log line of that request |

Throughout the app: loading, empty and error states (errors show a reference ID that matches the backend logs), toasts, confirmation before deleting, keyboard and screen-reader friendly controls, and a responsive layout with a mobile sidebar.

## Tech stack

- **Next.js 16** (App Router, Cache Components) · **React 19** · **TypeScript**
- **Tailwind CSS 4**, Poppins font (self-hosted via `@fontsource`), `lucide-react` icons
- **TanStack Query** for server state (caching, refetch after writes, keeping the previous page while the next one loads)
- **React Hook Form + Zod** for forms and validation
- **Vitest + Testing Library** for unit and component tests

---

## Getting started

### Prerequisites

- Node.js **20.9+** and npm
- The backend running on `http://localhost:5080` (see the backend README)

### 1. Install

```bash
npm install
cp .env.example .env.local   # optional: only if the backend isn't on localhost:5080
```

`BACKEND_URL` is the only setting. No secrets live in the frontend.

### 2. Run (development)

```bash
npm run dev
```

Open **http://localhost:3000** and log in with the account from the assessment brief (`assessment.it`).

### 3. Build and run (production)

```bash
npm run build
npm start
```

`BACKEND_URL` is read at build time for the `/api` rewrite, so set it before `npm run build`.

### 4. Test and check

```bash
npm test            # Vitest: unit and component tests
npm run lint        # ESLint (Next.js + React Hooks rules)
npm run typecheck   # TypeScript
```

The tests cover the API client (CSRF header, correlation ID, ProblemDetails to readable errors, 401 handling), response normalisation, formatting (rupiah, dates), form schemas, the request filter, the tracking timeline, open-redirect protection on login, the data table and pagination, and the login form.

**Migrations:** none. The frontend has no database.

---

## How it talks to the backend

```
Browser ──► Next.js /api/* ──rewrite──► TrackLab.Api (.NET) ──► Assessment API
```

- `next.config.ts` rewrites `/api/*` to `BACKEND_URL`. Calls are same-origin, so the backend's **HttpOnly session cookies** work without CORS, and the browser never sees an access token.
- `src/lib/api-client.ts` wraps `fetch`. It adds `X-Requested-With` to `POST`/`PUT`/`DELETE` (the backend's CSRF check) and an `X-Correlation-Id` to every call, turns ProblemDetails errors into readable messages, and sends the user to `/login?expired=1` on any `401`.
- `src/proxy.ts` (Next.js 16's name for middleware) redirects to `/login` when there is no session cookie. This only avoids showing pages the user can't use; the backend still checks every request.
- `src/lib/client-logger.ts` reports uncaught errors and failed data requests to the backend log (`POST /api/logs/client`).
- `src/lib/normalize.ts` reads the API's `{ data, success, message, code }` envelope and accepts both `camelCase` and `snake_case` field names.

## Project structure

```
src/
├── app/                    # Routes (App Router)
│   ├── login/              # Public login page
│   └── (app)/              # Pages behind login, sharing the sidebar layout
│       ├── dashboard/  trackers/  requests/  requests/[id]/  trackings/  audit-trail/  logs/
├── features/               # Feature code: page components, forms, hooks
│   ├── auth/  trackers/  requests/  trackings/  audit/  logs/  dashboard/
├── components/
│   ├── ui/                 # Button, form controls, modal, data table, pagination, row menu…
│   └── layout/             # App shell (sidebar, top bar), page header
├── hooks/                  # Paged/all resource queries, mutations, table state
├── lib/                    # API client, resources, normalisation, formatting, types, client logger
└── proxy.ts                # Route protection
```

## Notes on the API data

- **Company name:** requests only carry `partnerId` and there is no partner endpoint. `src/lib/partners.ts` maps known ids to names. Every request in the shared data uses `93f25c4d…` (the id in the Postman examples), shown as *PT KALBE FARMA TBK* as in the design. Unknown ids show as "Partner XXXXXXXX".
- **Due date** is computed by the API (`requestDate` + `leadTime` days), so it's shown read-only on the request page.
- **Trackings** come back joined with their tracker's fields (`trackerDescription`, `trackerIcon`…), so a step still shows correctly after its tracker has been deleted.
- **Icons** are stored as free text in mixed styles (`fa-check`, `CheckCircle2`, `dna`); they're normalised and mapped to icons, with a neutral fallback for unknown names.
- **Lists for dropdowns** are read through the paging endpoint, 100 rows per page.
- **Delete** deactivates the record. The assessment API drops the body of DELETE requests, so the backend deactivates through the update endpoint instead, and permanent delete isn't offered (see the backend README).

## Design notes

- The layout follows the provided TrackLab designs (green table headers, `…` row action menus, ✓/✗ boolean columns, "Show 10" and "Showing 1 to 10 of N entries").
- Improvements: change history per record, a visual tracking timeline with a progress bar, the step value input matching the tracker's action type, automatic *Last Status* update, a filter panel that supports multiple values (`A||B`), and a mobile layout.
- There is no partner endpoint in the API, so the company dropdown lists partners from existing requests, with an option to type a partner ID.

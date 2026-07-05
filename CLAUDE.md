# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

A Hebrew-language legal case management platform for Israeli lawyers: client/case management,
an AI-assisted document drafting tool (Anthropic Claude), a manually-verified legal-authority
bank with citation auditing, deadline tracking, time & billing, and a per-case chronological
journal. All UI-facing and API error strings are in Hebrew, and the app is RTL.

`legacy_whisper/` is unrelated leftover code (a Hebrew Whisper transcription tool) from before
this repo was repurposed. It's kept for reference only — don't treat it as part of the platform
architecture and don't wire it into `backend/`/`frontend/`.

**Critical product constraint**: every AI-generated draft is explicitly a first draft that
requires human lawyer review before real use — this is enforced in code (see "Anti-hallucination
controls" below), not just a README disclaimer. When touching drafting/authority code, preserve
that behavior.

## Commands

### Backend (FastAPI, Python 3.11, `backend/`)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export JWT_SECRET_KEY="<long random value>"        # required, app raises at import time if unset
export ANTHROPIC_API_KEY="<key>"                    # optional; only drafting endpoint needs it
# optional: export DATABASE_URL="postgresql://user:pass@host/dbname"  (defaults to local sqlite)

python -m app.seed                                  # loads starter document templates
uvicorn app.main:app --reload --port 8000
```

Run tests (also what CI runs):

```bash
cd backend
python -m pytest tests/ -v
python -m pytest tests/test_api.py -v                      # single file
python -m pytest tests/test_api.py::test_name -v            # single test
```

Tests use an isolated temp-file SQLite DB and a fixed `JWT_SECRET_KEY`, set in
`backend/tests/conftest.py` before `app.main` is imported — `ANTHROPIC_API_KEY` is explicitly
unset so drafting-related tests exercise the "not configured" (503) path rather than calling the
real Anthropic API. The `auth_headers` fixture registers+logs in a fresh user per test (keyed off
`request.node.name`) and returns a Bearer header dict.

### Frontend (React + TypeScript + Vite, `frontend/`)

```bash
cd frontend
cp .env.example .env      # set VITE_API_BASE_URL if backend isn't on localhost:8000
npm install
npm run dev               # http://localhost:5173
npm run build             # tsc -b && vite build — this is what CI runs, no separate typecheck script
npm run lint               # oxlint
```

There is no frontend test suite currently.

### Full stack via Docker Compose

```bash
docker compose up --build                                    # drafting endpoint will 503 (no API key)
ANTHROPIC_API_KEY="sk-ant-..." docker compose up --build      # drafting fully functional
```

Backend on `:8000`, frontend on `:5173`. Backend data persists in the `backend_data` volume;
`docker compose down -v` wipes it. Compose sets `DATABASE_URL` to a sqlite file under `/app/data`.

### CI (`.github/workflows/ci.yml`)

Three parallel jobs on push/PR to `main`: `backend` (pytest), `frontend` (`npm ci && npm run
build`), and `docker-compose` (builds and boots the compose stack, polls `/api/health`, then
curls the frontend). Keep changes compatible with all three.

## Architecture

### Backend structure

- `app/main.py` — creates the FastAPI app, registers every router, runs
  `models.Base.metadata.create_all` at import time (no Alembic migrations wired up despite
  `alembic` being a dependency — schema changes today go straight into `models.py`).
- `app/models.py` — all SQLAlchemy models in one file.
- `app/schemas.py` — Pydantic request/response schemas.
- `app/security.py` — JWT auth (`python-jose`) + bcrypt password hashing. `get_current_user` is
  the standard FastAPI dependency; nearly every router is mounted with
  `dependencies=[Depends(security.get_current_user)]` at the `APIRouter` level rather than
  per-route.
- `app/routers/` — one module per resource. Several resources (deadlines, billing, invoices,
  notes) expose **two routers**: a nested one (`/api/cases/{case_id}/<resource>`) for case-scoped
  list/create, and a `standalone_router` (`/api/<resource>/{id}`) for update/delete/cross-case
  queries (e.g. `deadlines.standalone_router` also serves `/api/deadlines/upcoming`). Both routers
  from a module get registered in `main.py`. Follow this split when adding a new case-scoped
  resource.
- `app/llm/` — `client.py` wraps the Anthropic SDK call (`generate_draft`, raising
  `LLMNotConfiguredError` if `ANTHROPIC_API_KEY` is unset so the router can return a clean 503);
  `prompts.py` holds `SYSTEM_PROMPT` and `build_user_prompt`, which assembles case/template/
  authority context into the prompt sent to Claude.
- `app/citation_audit.py` — regex-based extraction of Hebrew legal-citation-shaped substrings
  (court decisions like `ע"א 1234/20`, statute references) from drafted text, used by the audit
  endpoint below. Extend the regexes here if new citation formats need detection.
- `app/seed.py` — idempotent (checks existing names) loader for starter `Template` rows; run via
  `python -m app.seed`, also invoked by the Docker image.
- `app/database.py` — `DATABASE_URL` env var picks sqlite (default, dev) vs Postgres (prod).

### Core data model and how it connects

`Client` → `Case` (1:many) → `Document`, `Authority`, `Deadline`, `TimeEntry`, `Invoice`,
`CaseNote` (each 1:many, cascade-delete with the case). `Template` is independent and optionally
linked from a `Document` via `template_id`. Key fields worth knowing:

- `Case.practice_area` feeds general legal context into drafting prompts.
- `Authority.case_id` is nullable — a null `case_id` means a firm-wide authority usable across
  any case; both drafting (`drafting.py`) and citation audit (`authorities.py`) queries pull
  `case_id == X OR case_id IS NULL`.
- `Deadline.due_date` is always entered manually by the lawyer — there is deliberately no
  statutory-deadline auto-calculation (would require jurisdiction/court-specific procedural rules
  that need legal verification). Don't add auto-calculation without discussing this constraint.
- `TimeEntry` has `billable` (bool) and optional `hourly_rate`; billing summary logic
  aggregates these per case.
- `Invoice` (`routers/invoices.py`) is generated from a case's outstanding billable `TimeEntry`
  rows that have an `hourly_rate` set and no `invoice_id` yet — `POST
  /api/cases/{case_id}/invoices` snapshots them into a new invoice (400 if none qualify) and
  stamps each entry's `invoice_id`, so an entry can only ever belong to one invoice. Deleting an
  invoice clears `invoice_id` back to null on its entries rather than deleting them.
  `GET /api/invoices/{id}/export.docx` renders any invoice as a downloadable Word file via
  `docx_utils.build_invoice_docx` (same RFC 5987 Hebrew-filename handling as the document
  export endpoint).

### Anti-hallucination controls (don't weaken these)

1. `SYSTEM_PROMPT` (in `app/llm/prompts.py`) explicitly forbids inventing facts, citations,
   case/docket numbers, or quotes.
2. `drafting.py`'s `draft_document` appends a fixed Hebrew `DISCLAIMER` to every generated
   document if the model didn't already include it.
3. `POST /api/documents/{id}/audit-citations` (`authorities.py` / `citation_audit.py`) scans a
   drafted document for citation-shaped substrings and cross-checks each one against the
   verified `Authority` bank for that case (plus case-independent authorities); anything not
   matched is flagged `verified: false` for the lawyer to check manually. The drafting prompt
   also only offers the model authorities that are already in this verified bank — it's not
   supposed to cite anything else.

### Frontend structure

- `src/api.ts` — single typed client for the whole backend; every REST call goes through the
  `request<T>()` helper (adds Bearer token from `localStorage`, JSON-encodes bodies, throws
  `ApiError` with the backend's Hebrew `detail` message on non-2xx). Add new backend endpoints
  here rather than calling `fetch` ad hoc from components.
- `src/auth/AuthContext.tsx` — holds the logged-in `User` and login/logout, backed by the token
  in `localStorage` (`api.ts`'s `getToken`/`setToken`).
- `src/App.tsx` — route table; `RequireAuth` gates everything except `/login` behind a logged-in
  user, nested under `Layout`.
- `src/pages/` — one component per route (`DashboardPage`, `ClientsPage`, `CaseDetailPage`,
  `LoginPage`); `CaseDetailPage` is the hub for a case's documents/authorities/deadlines/time
  entries/notes.
- `src/types.ts` — TypeScript types mirroring the backend Pydantic schemas.
- Hebrew/RTL throughout — new UI text should be Hebrew, matching existing pages, and layout
  should not assume LTR.

## Conventions to follow

- User-facing strings (API error `detail` messages, UI text) are Hebrew. Match the existing tone
  and phrasing rather than switching to English.
- New case-scoped resources should follow the nested-router + standalone-router pattern described
  above, not a single flat router.
- `Authority.case_id = None` is a meaningful, intentional state (firm-wide authority) — don't
  "fix" queries to require a non-null case_id.
- Schema changes go into `models.py`; there's no live migration workflow in use, so don't assume
  Alembic revisions need to be generated/run.

# Rally Investor Matching

Investor matching and CRM platform for early-stage founders under the Rally brand.

This repository is a development-ready foundation for the MVP described in `local/Rally Investor Matching MVP.pdf`. The `local/` folder is intentionally ignored by Git.

## Stack

- Frontend: Next.js, TypeScript, pnpm
- Backend: FastAPI, Python
- AI matching/RAG: `vc_match_intelligence` Python package under `src/`
- Database: PostgreSQL via Docker Compose
- CI: GitHub Actions

## Prerequisites

- Node.js 22+
- pnpm 10+
- Python 3.11+
- Docker Desktop

## Local Setup

Install frontend dependencies from the repository root:

```powershell
pnpm install
```

Create a local environment file:

```powershell
Copy-Item .env.example .env
```

Install backend dependencies:

```powershell
python -m venv apps/api/.venv
apps/api/.venv/Scripts/Activate.ps1
python -m pip install -r apps/api/requirements-dev.txt
python -m pip install -e .
```

Start PostgreSQL:

```powershell
docker compose up -d db
```

Start PostgreSQL and the backend API with Docker:

```powershell
docker compose up -d db api
```

The API health check is available at `http://localhost:8000/health`.

Useful Docker commands:

```powershell
docker compose ps
docker compose logs -f api
docker compose logs -f db
docker compose down
```

Alternatively, start the backend API locally for Python debugging:

```powershell
pnpm dev:api
```

Start the frontend:

```powershell
pnpm dev:web
```

The web app is available at `http://localhost:3000`.

## Local Database

The local PostgreSQL database uses the unified product schema in `data/schemas/rally_investor_matching.schema.sql`.

On a fresh Docker volume, `docker compose up -d db` automatically applies:

```text
data/schemas/rally_investor_matching.schema.sql
data/seeds/local_investors.sql
```

The local seed currently includes AirTree, Blackbird, Square Peg, and one demo founder company/match for API development.

Investor cheque sizing is stored in `investors.cheque_ranges` as a JSONB array so each stage can have its own range:

```json
[
  {
    "stage": "pre_seed",
    "amount_min": 149000,
    "amount_max": null,
    "currency": "AUD"
  },
  {
    "stage": "series_f",
    "amount_min": null,
    "amount_max": 60000000,
    "currency": "AUD"
  }
]
```

If your local Docker volume already existed before these init files were added, re-apply the schema and seed manually:

```powershell
python -m vc_match_intelligence.unified_db
```

Or pass a database URL explicitly:

```powershell
python -m vc_match_intelligence.unified_db --database-url postgresql://rally:rally_dev_password@localhost:5432/rally_investor_matching
```

Read the seeded investors through the API:

```powershell
Invoke-RestMethod http://localhost:8000/api/v1/investors
Invoke-RestMethod http://localhost:8000/api/v1/investors/airtree
```

Run the founder intake flow through the API:

```powershell
$body = @{
  message = 'Company: Example AI Health. We are headquartered in Australia and sell into Australia/New Zealand. We are a seed-stage B2B SaaS AI healthtech startup raising A$2.5m and need a lead investor.'
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/v1/match/intake -ContentType 'application/json' -Body $body
```

If required founder fields are missing, the endpoint returns `status: needs_follow_up` and one follow-up question. After one follow-up, it proceeds to matching with the information available.

Import colleague-provided investor JSON records:

```powershell
python -m vc_match_intelligence.investor_importer `
  --database-url postgresql://rally:rally_dev_password@localhost:5432/rally_investor_matching `
  path/to/investor.investor.json
```

Use `--slug-override source-slug=database-slug` when a new file should update an existing local investor slug instead of creating a duplicate. For example, the colleague Airtree file uses `airtree-ventures`, while the local demo keeps the API slug `airtree`:

```powershell
python -m vc_match_intelligence.investor_importer `
  --database-url postgresql://rally:rally_dev_password@localhost:5432/rally_investor_matching `
  --slug-override airtree-ventures=airtree `
  C:\Users\49765\Desktop\Internship\week3\airtree-ventures\airtree-ventures.investor.json `
  C:\Users\49765\Desktop\Internship\week3\square-peg\square-peg.investor.json
```

## VC Matching/RAG Commands

The local VC matching package is installed from the repository root with `python -m pip install -e .`.

Run an LLM smoke test:

```powershell
python -m vc_match_intelligence.llm --json
```

Extract a founder profile from text:

```powershell
python -m vc_match_intelligence.founder_parser 'We are an AU-based B2B AI healthtech company raising A$2.5m seed and looking for a lead investor.'
```

Run the interactive extraction helper:

```powershell
python scripts/test_extract_company.py
```

Run local matching against the unified database:

```powershell
python -m vc_match_intelligence.local_match --founder examples/founder_profile.sample.json --database-url postgresql://rally:rally_dev_password@localhost:5432/rally_investor_matching
```

## Verification

Run frontend checks:

```powershell
pnpm lint:web
pnpm format:check:web
pnpm typecheck:web
pnpm build:web
```

Run backend checks:

```powershell
pnpm lint:api
pnpm format:check:api
pnpm test:api
```

Format locally (before commit):

```powershell
pnpm format
```

Validate Docker Compose:

```powershell
docker compose config
```

Run a lightweight Python syntax check:

```powershell
python -m compileall -q apps/api/app src scripts
```

## Project Structure

```text
apps/
  web/              Next.js frontend and product backend
  api/              FastAPI AI/matching service and Dockerfile
src/                VC matching/RAG Python package
data/               Product SQL schema and local seed data
schemas/            Legacy VC matching/RAG schema artifacts
outputs/            Generated investor records and MVP bundle artifacts
```

## Frontend Conventions

- `apps/web` uses shadcn/ui and Tailwind for shared UI foundations.
- Add UI components from `apps/web` with `pnpm dlx shadcn@latest add <component>`.
- Brand assets live in `apps/web/public/brand`.
- Theme tokens live in `apps/web/src/app/globals.css` and currently use the Rally deep green and lime brand colors.
- Next.js owns frontend and product backend concerns. FastAPI owns AI and matching service concerns.

## Service Boundary

Next.js owns product experience and product data. FastAPI owns AI/matching logic and should not become the general product backend.

Use Next.js for users, auth, sessions, founder profiles, dashboards, and normal business APIs. Use FastAPI for AI calls, investor matching, scoring, validation, and read-focused database access needed by matching workflows.

## Development Workflow

Use `main` as the stable branch and `develop` as the active integration branch.

```text
feature/* -> PR -> develop -> PR -> main
```

Branch roles:

- `main`: stable branch for reviewed, CI-passing code
- `develop`: active integration branch for upcoming work
- `feature/*`: individual task branches created from `develop`

Start new work from `develop`:

```powershell
git checkout develop
git pull --ff-only origin develop
git checkout -b feature/your-change-name
```

When the feature is ready:

```powershell
git push -u origin feature/your-change-name
```

Then open a pull request into `develop`. After a batch of work is stable on `develop`, open a pull request from `develop` into `main`.

Before opening a pull request, run the relevant checks:

```powershell
pnpm lint:web
pnpm format:check:web
pnpm typecheck:web
pnpm lint:api
pnpm format:check:api
pnpm test:api
docker compose config
```

## Commit Message Format

Use a short Conventional Commit-style summary, followed by an optional body when the change needs context:

```text
chore: set up project foundation

Add pnpm workspace, Next.js frontend, FastAPI backend, Docker Compose, CI, and setup documentation.
```

Format:

- First line: concise summary, usually `type: description`
- Blank line
- Body: one or two sentences explaining the change

## Git Hygiene

Do not commit:

- `.env` or any real secrets
- `local/`
- `.cursor/` or other local Cursor/agent files
- virtual environments, caches, local database files, or generated runtime files

`.env.example` is safe to commit because it contains placeholders and local development defaults only.

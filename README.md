# Rally Investor Matching

Investor matching and CRM platform for early-stage founders under the Rally brand.

This repository is a development-ready foundation for the MVP described in `local/Rally Investor Matching MVP.pdf`. The `local/` folder is intentionally ignored by Git.

## Stack

- Frontend: Next.js, TypeScript, pnpm
- Backend: FastAPI, Python
- AI matching/RAG: FastAPI services, providers, and tools under `apps/api/app/`
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

Next.js only reads env files from `apps/web`, not the repo root, so also create a web-specific one for Better Auth (database connection, session secret, email provider):

```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
```

Fill in `BETTER_AUTH_SECRET` with a random value, then bootstrap the first admin account (run from `apps/web`, after the database is up):

```powershell
cd apps/web
pnpm run seed:admin
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
docker compose -f infra/docker/docker-compose.yml up -d db
```

Start PostgreSQL and the backend API with Docker:

```powershell
docker compose -f infra/docker/docker-compose.yml up -d db api
```

The API health check is available at `http://localhost:8000/health`.

Useful Docker commands:

```powershell
docker compose -f infra/docker/docker-compose.yml ps
docker compose -f infra/docker/docker-compose.yml logs -f api
docker compose -f infra/docker/docker-compose.yml logs -f db
docker compose -f infra/docker/docker-compose.yml down
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

The local PostgreSQL database uses the same formal public schema and investor-intelligence dataset as the AWS development environment.

On a fresh Docker volume, `docker compose -f infra/docker/docker-compose.yml up -d db` automatically applies:

```text
data/schemas/vc_matching_schema_aws_with_mvp_compat.sql
data/patches/202607_formal_sample_import_extensions.sql
data/seeds/formal_investor_data.sql
data/seeds/public_admin_test.sql
```

The investor snapshot was generated from AWS on 22 July 2026 and contains 481 investors, 423 investee profiles, 464 funding rounds, 704 investor/deal relationships, and the derived investor preference tables used by matching. It deliberately excludes authentication records, user profiles, founder companies, match history, and shortlists. User-linked reviewer IDs are removed from the shared snapshot.

PostgreSQL only runs `/docker-entrypoint-initdb.d` files when it creates a new volume. To replace an existing local database with the committed snapshot, remove the local development volume and start the services again:

```powershell
docker compose -f infra/docker/docker-compose.yml down -v
docker compose -f infra/docker/docker-compose.yml up -d db api
```

This removes only the local Docker database volume. Any locally created accounts, company profiles, match history, and shortlists in that volume will be deleted.

Read the synced investors through the API:

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
vcmi-import-investor `
  --database-url postgresql://rally:rally_dev_password@localhost:5432/rally_investor_matching `
  path/to/investor.investor.json
```

Use `--slug-override source-slug=database-slug` when a new file should update an existing local investor slug instead of creating a duplicate. For example, the colleague Airtree file uses `airtree-ventures`, while the local demo keeps the API slug `airtree`:

```powershell
vcmi-import-investor `
  --database-url postgresql://rally:rally_dev_password@localhost:5432/rally_investor_matching `
  --slug-override airtree-ventures=airtree `
  C:\Users\49765\Desktop\Internship\week3\airtree-ventures\airtree-ventures.investor.json `
  C:\Users\49765\Desktop\Internship\week3\square-peg\square-peg.investor.json
```

## VC Matching/RAG Commands

The local VC matching tools are installed from the repository root with `python -m pip install -e .`.

Run an LLM smoke test:

```powershell
vcmi-llm-smoke-test --json
```

Extract a founder profile from text:

```powershell
vcmi-parse-founder 'We are an AU-based B2B AI healthtech company raising A$2.5m seed and looking for a lead investor.'
```

Run the interactive extraction helper:

```powershell
python apps/api/scripts/test_extract_company.py
```

Run local matching against the unified database:

```powershell
vcmi-local-match --founder examples/founder_profile.sample.json --database-url postgresql://rally:rally_dev_password@localhost:5432/rally_investor_matching
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
docker compose -f infra/docker/docker-compose.yml config
```

Run a lightweight Python syntax check:

```powershell
python -m compileall -q apps/api/app apps/api/scripts
```

## Project Structure

```text
apps/
  web/              Next.js frontend and product backend
  api/              FastAPI AI/matching service
data/               Product SQL schemas, local seeds, and generated artifacts
infra/docker/       Local Docker Compose and API image build files
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
docker compose -f infra/docker/docker-compose.yml config
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

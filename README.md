# Rally Investor Matching

Investor matching and CRM platform for early-stage founders under the Rally brand.

This repository is a development-ready foundation for the MVP described in `local/Rally Investor Matching MVP.pdf`. The `local/` folder is intentionally ignored by Git.

## Stack

- Frontend: Next.js, TypeScript, pnpm
- Backend: FastAPI, Python
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
python -m pip install -r apps/api/requirements.txt
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

## Verification

Run frontend checks:

```powershell
pnpm lint:web
pnpm typecheck:web
pnpm build:web
```

Run backend tests:

```powershell
pnpm test:api
```

Validate Docker Compose:

```powershell
docker compose config
```

## Project Structure

```text
apps/
  web/              Next.js frontend and product backend
  api/              FastAPI AI/matching service and Dockerfile
data/               Future investor and founder data
```

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
pnpm typecheck:web
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

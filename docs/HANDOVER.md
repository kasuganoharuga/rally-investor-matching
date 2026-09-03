# Rally Investor Matching — Handover Document

Last updated: 2026-09-03

## 1. Account Ownership

| Asset | Owner | Notes |
|---|---|---|
| **AWS account** (`765332581489`) | **Stef** | Shared account — see §4 warning, it also hosts unrelated projects ("ai-catalyst", "currents") |
| **Domain** (`rallyroadmap.com`, registered on **GoDaddy**) | **Kane** | Production is served at `https://investormatch.rallyroadmap.com` |
| **GitHub repo/org** (`Torus-Group/rally-investor-matching`) | Created by **Stef** | |
| **LLM API** (currently Anthropic direct API) | Managed by **Kane** | Account ran out of credit as of 2026-09-03; migration to AWS Bedrock is in progress (see §4 IAM/LLM notes) — decision tracked in the Slack thread with Cal |

Anyone taking over this project needs access from all four of the above before they can do a full deploy end-to-end (AWS console/CLI access, GitHub repo access, domain DNS access, and the LLM provider credential).

---

## 2. Project Architecture

Monorepo (`pnpm` workspace) with two apps:

```
rally-investor-matching/
├── apps/
│   ├── web/     Next.js frontend (App Router) — apps/web/src/
│   │   ├── app/            route handlers + pages
│   │   ├── components/     shared UI
│   │   ├── features/       feature modules (auth, matching, investors,
│   │   │                   company-profile, onboarding, settings, shortlist,
│   │   │                   invitations, investor-management, company-management)
│   │   └── lib/
│   └── api/     FastAPI backend — apps/api/app/
│       ├── api/          route handlers (v1/*), dependencies (shared-secret auth)
│       ├── core/          config (pydantic-settings, .env), error handlers
│       ├── db/            Postgres connection
│       ├── repositories/  data access
│       ├── services/      business logic (match_service, founder_parser_service, ...)
│       ├── providers/     llm.py — Anthropic / Bedrock abstraction
│       ├── schemas/       pydantic request/response models
│       └── tools/         CLI utilities (data import, migrations, bedrock embed, etc.)
├── data/         SQL schemas, seed data, deal-import snapshots
├── infra/
│   ├── docker/            local dev docker-compose + API Dockerfile
│   └── cloudformation/    AWS infra templates (see §4)
├── scripts/aws/           deployment + ops scripts run on the EC2 host
└── .github/workflows/     CI + deploy pipelines (see §3)
```

**Data flow for the "investor matching" feature** (the one most recently debugged):

```
Browser (4-step wizard)
  → POST /api/matching/intake  (Next.js route, apps/web/src/app/api/matching/intake/route.ts)
  → matchingHistoryService.runIntake()  (apps/web/src/features/matching/server/services/matching-history-service.ts)
      - requires RALLY_MATCHING_API_SECRET (web-side env)
  → proxies to FastAPI: POST {MATCHING_API_BASE_URL}/api/v1/match/intake
      - header X-Rally-Matching-Key must match the API-side RALLY_MATCHING_API_SECRET
  → apps/api/app/api/v1/match.py → require_matching_server dependency (shared-secret check)
  → match_service.intake()
      → founder_parser_service.parse_founder_message()  → LLMClient.generate_json()
          (apps/api/app/providers/llm.py — Anthropic direct OR AWS Bedrock, switched via LLM_PROVIDER)
      → investor_repository (Postgres query for candidate investors)
```

Auth: Next.js side uses Better Auth; the FastAPI side trusts only the Next.js proxy (never the browser directly) via the `RALLY_MATCHING_API_SECRET` shared secret.

**Local dev setup**: `README.md` at repo root has full instructions (`Copy-Item .env.example .env`, `Copy-Item apps/web/.env.example apps/web/.env.local`, `pnpm install`, Python venv under `apps/api/.venv`, `infra/docker/docker-compose.yml` for local Postgres).

---

## 3. GitHub Repository

- **Repo**: [Torus-Group/rally-investor-matching](https://github.com/Torus-Group/rally-investor-matching)
- **Main development branch**: `develop` (not `main` — `main` is stale/does not contain the matching-wizard feature)
- **Workflows** (`.github/workflows/`):
  - `ci.yml` — lint/typecheck/test on PRs
  - `deploy-formal-aws.yml` — **auto-deploys to production on every push to `develop`**. Verifies the build, then uses GitHub OIDC (`arn:aws:iam::765332581489:role/vcmi-formal-github-actions-deploy`) to upload a source bundle to S3 and trigger a deploy on the production EC2 instance via SSM (`scripts/aws/deploy-formal-ec2.sh`). ⚠️ **Any push to `develop` is effectively a production release — there is no separate staging gate.**
  - `diagnose-oidc.yml` — utility workflow for debugging the GitHub↔AWS OIDC trust setup

---

## 4. AWS Structure (account `765332581489`, region `ap-southeast-2`)

⚠️ **This AWS account is shared with other, unrelated projects** ("ai-catalyst-*", "currents-*" — visible as separate RDS instances, S3 buckets, and Secrets Manager entries). Treat account-wide changes (IAM, billing, account settings) with caution — they are not scoped to Rally alone.

### CloudFormation stacks (Rally-specific)
- `vcmi-formal-rds` — Aurora/RDS Postgres for production (`vcmi-formal-postgres`, `db.t4g.micro`, publicly accessible, credentials in Secrets Manager)
- `vcmi-formal-compute` — the production EC2 instance + IAM role/instance profile
- `vcmi-formal-github-deploy` — the OIDC IAM role GitHub Actions assumes to deploy

(`infra/cloudformation/*.yaml` in the repo are the source templates; `infra/aws/README.md` documents the original RDS bring-up steps.)

### Production compute
- **EC2 instance**: `i-0cd72e60d642457ae` (public IP is dynamic — resolved fresh per deploy via `scripts/aws/refresh-public-urls.sh`)
- Runs two systemd services, both defined in `scripts/aws/deploy-formal-ec2.sh`:
  - `rally-api.service` — FastAPI, `EnvironmentFile=/etc/rally/api.env`, port 8000
  - `rally-web.service` — Next.js, `EnvironmentFile=/etc/rally/web.env`, port 3000
  - nginx in front for HTTPS (`scripts/aws/configure-https.sh`)
- **Config lives only on the box**, not in git: `/etc/rally/api.env` and `/etc/rally/web.env`. These are generated once at instance boot from Secrets Manager (see `infra/cloudformation/vcmi-ec2-compute.yaml`) and are **not** regenerated by normal deploys — deploys only touch `RALLY_MATCHING_API_SECRET` via `scripts/aws/configure-matching-secret.sh`. Any other env var change (e.g. `LLM_PROVIDER`) must be made directly on the box (SSM `send-command` or SSH), not via a code push.
- Access to the instance for ops is via **AWS Systems Manager (SSM) Session Manager / `send-command`** — no direct SSH key workflow was used in this session.

### Secrets Manager (Rally-relevant entries)
- `/vcmi/formal/rds/admin`, `/vcmi/formal/rds/app` — Postgres credentials
- `/vcmi/formal/anthropic_api_key` — the production Anthropic API key (currently out of credit; migration to Bedrock in progress, see below)

### IAM
- `vcmi-formal-ec2-role` (attached to the EC2 instance profile) — scoped to: read the deploy bundle from S3, read the two secrets above, write CloudWatch logs, send SES email. **As of 2026-09-03 it also has `bedrock:InvokeModel`** on the `au.anthropic.claude-sonnet-4-6` inference profile (inline policy `vcmi-formal-ec2-bedrock-matching-policy`) — added to migrate off the exhausted Anthropic-direct key.
- `vcmi-formal-github-actions-deploy` — assumed by GitHub Actions via OIDC for deploys.
- A separate IAM user `claude` (in the `Admin` group — full account access) was created for AI-assisted debugging in this session. **This is broader than it needs to be; consider scoping it down or deactivating it once handover is complete.**

### LLM provider config
Controlled by env vars in `/etc/rally/api.env`: `LLM_PROVIDER` (`anthropic` or `bedrock`), `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `BEDROCK_LLM_MODEL_ID`, `AWS_REGION`. See `apps/api/app/providers/llm.py` for the abstraction — no code changes are needed to switch providers, only env vars (+ IAM permissions if moving to Bedrock).

Production is currently switched to `LLM_PROVIDER=bedrock` (`BEDROCK_LLM_MODEL_ID=au.anthropic.claude-sonnet-4-6`), pending AWS's one-time "Anthropic use case details" review before Bedrock calls succeed. A backup of the prior Anthropic-direct `/etc/rally/api.env` is at `/etc/rally/api.env.bak-20260903T000543Z` on the EC2 instance if a rollback is needed. Remediation options (Bedrock vs. topping up the Anthropic account) are tracked in the Slack thread with Cal.

---

## 5. Useful Commands Reference

```bash
# SSM into production EC2 to run a one-off command
aws ssm send-command --instance-ids i-0cd72e60d642457ae \
  --document-name AWS-RunShellScript --region ap-southeast-2 \
  --parameters '{"commands":["<your command>"]}'

# Check production health directly on the box (run via SSM)
curl http://127.0.0.1:8000/health

# View recent API service logs
journalctl -u rally-api.service --no-pager -n 100
```

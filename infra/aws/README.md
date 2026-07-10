# AWS RAG Database Setup

This folder documents the first AWS test deployment path for Rally Investor
Matching. It creates a PostgreSQL database on RDS, applies the formal cloud
schema, and adds the temporary MVP compatibility schema used by the current
local FastAPI/Next.js app.

## What Gets Created

Use `infra/cloudformation/vcmi-rds-postgres.yaml` to create:

- RDS PostgreSQL 16
- a generated admin credential in AWS Secrets Manager
- a DB subnet group
- a security group for PostgreSQL port `5432`

The SQL bootstrap file is:

- `data/schemas/vc_matching_schema_aws_with_mvp_compat.sql`

It creates:

- the formal schema in `public`
- the current MVP/test schema in `mvp_compat`

After the app is fully migrated to the formal schema, remove the MVP layer with:

```sql
DROP SCHEMA IF EXISTS mvp_compat CASCADE;
```

## Create RDS From AWS Console

1. Open CloudFormation in `ap-southeast-2`.
2. Create stack with new resources.
3. Upload `infra/cloudformation/vcmi-rds-postgres.yaml`.
4. Use conservative test values:
   - `ProjectSlug`: `vcmi`
   - `Environment`: `dev`
   - `DBInstanceClass`: `db.t4g.micro`
   - `AllocatedStorageGb`: `20`
   - `BackupRetentionDays`: `1` for free-tier test accounts
   - `DeletionProtection`: `false` while iterating; switch to `true` for persistent production databases
   - `PubliclyAccessible`: `false` for AWS-internal app access

For temporary local initialization from your laptop, either:

- run initialization from an AWS host in the same VPC, or
- set `PubliclyAccessible=true` and set `AllowedPostgresCidr` to your current public IP `/32`.

Do not leave `AllowedPostgresCidr` broad such as `0.0.0.0/0`.

## Initialize The Database

After the CloudFormation stack reaches `CREATE_COMPLETE`:

1. Open the stack outputs and copy:
   - `DatabaseEndpointAddress`
   - `DatabaseName`
   - `DatabaseSecretArn`
2. Open Secrets Manager and read the generated username/password.
3. Build a PostgreSQL URL:

```text
postgresql://USERNAME:PASSWORD@DB_ENDPOINT:5432/rally_investor_matching
```

4. From the repo root, run the Python initializer:

```powershell
.\.venv\Scripts\python.exe .\scripts\aws\init_rds.py `
  --database-url "postgresql://USERNAME:PASSWORD@DB_ENDPOINT:5432/rally_investor_matching"
```

If you have `psql` installed, the PowerShell wrapper works too:

```powershell
.\scripts\aws\init-rds.ps1 `
  -DatabaseUrl "postgresql://USERNAME:PASSWORD@DB_ENDPOINT:5432/rally_investor_matching"
```

The script applies the formal schema + `mvp_compat` schema, then loads
`data/seeds/local_investors.sql` into `mvp_compat`. It also creates a bootstrap
admin user in the formal schema:

```text
admin@rally.local
```

Override this for a shared environment with:

```powershell
.\.venv\Scripts\python.exe .\scripts\aws\init_rds.py `
  --database-url "postgresql://USERNAME:PASSWORD@DB_ENDPOINT:5432/rally_investor_matching" `
  --admin-email "you@company.com" `
  --admin-name "Your Name"
```

## Current MVP App Connection String

The current MVP/test code expects simple tables such as `investors`,
`rag_chunks`, `companies`, `matches`, and `match_results`. Those live in
`mvp_compat`, so the app must use this search path:

```text
mvp_compat,public
```

Use a database URL with encoded `PGOPTIONS`:

```text
postgresql://USERNAME:PASSWORD@DB_ENDPOINT:5432/rally_investor_matching?options=-csearch_path%3Dmvp_compat%2Cpublic
```

Or set it persistently for the app database role:

```sql
ALTER ROLE app_user IN DATABASE rally_investor_matching
SET search_path = mvp_compat, public;
```

## Deploying The Whole App

The current AWS dev deployment runs the MVP on one Amazon Linux EC2 instance:

- FastAPI on port `8000`
- Next.js on port `3000`
- app database credentials read from Secrets Manager
- `ANTHROPIC_API_KEY` read from Secrets Manager at `/vcmi/dev/anthropic_api_key`
- RDS access restricted to the EC2 security group plus any temporary admin CIDR

For a shared demo where teammates need browser access, set the compute stack
`AllowedWebCidr` parameter to `0.0.0.0/0`. This only opens the web/API security
group on ports `3000` and `8000`; do not use `0.0.0.0/0` for the RDS
PostgreSQL security group.

The template is:

- `infra/cloudformation/vcmi-ec2-compute.yaml`

This is intentionally simple for testing. For a longer-lived production setup,
move the same app/runtime pieces to ECS/Fargate or another managed compute layer.

Whichever compute option is used, store secrets outside Git:

- `DATABASE_URL`
- `ANTHROPIC_API_KEY` or Bedrock model settings
- auth/session secrets

Never commit `.env` or copied RDS credentials.

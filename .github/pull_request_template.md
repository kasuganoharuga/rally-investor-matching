## Summary

- 

## Test Plan
- [ ] `pnpm lint:web` (if web touched)
- [ ] `pnpm format:check:web` (if web touched)
- [ ] `pnpm typecheck:web` (if web touched)
- [ ] `pnpm lint:api` + `pnpm format:check:api` (if api touched)
- [ ] `pnpm test:api` (if api touched)
- [ ] `docker compose config` (if Docker touched)

## Notes

- No secrets or local-only files committed

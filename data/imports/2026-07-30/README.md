# Audited recent-deal delta packages (2026-07-30)

This directory contains the four audited delta packages used by the recent-deal incremental import:

- `recent-deal2026-7-30_deals-001-060_delta_identity-audited-v3_team-audited`
- `recent-deal2026-7-30_deals-061-120_delta_identity-audited-v3_team-audited`
- `recent-deal2026-7-30_deals-121-180_delta_identity-audited-v3_team-audited`
- `recent-deal2026-7-30_deals-181-230_delta_identity-audited-v3_team-audited`

Together they add 230 funding rounds, 583 deal-investor relationships, and 305 investor masters. The expected post-import counts are recorded in `data/generated/recent_deal_delta_import_summary.json`.

Import into an existing database without deleting its Docker volume:

```sh
python scripts/data/import_recent_deal_delta.py \
  --input-root data/imports/2026-07-30
```

The importer uses `data/generated/retained_investors_cleaned.json` for missing investor master records unless `--retained-investors-json` is supplied.

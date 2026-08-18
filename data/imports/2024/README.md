# 2024 deal import packages

This directory contains eight audited database-import packages for the 2024
Rally deal dataset. Each package includes its own manifest, validation report,
investor-resolution audit, and table-specific JSON payloads.

Declared package totals:

- 469 source deal rows
- 455 investee company payloads
- 425 investor payloads
- 422 funding rounds
- 817 deal-investor relationships

All eight package validation reports have status `passed`. Import them with
`scripts/data/import_recent_deal_delta.py`, using this directory as
`--input-root`. The importer is incremental and resolves existing investor
dependencies before inserting new master records.

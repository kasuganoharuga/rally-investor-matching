# Incremental database import: recent-deal2026-7-30 rows 182-231

This is an Investor-deduplicated delta package for 50 funding transactions.

## Investor handling

- Existing database Investors: 53. Their master records are not re-exported.
- New Investor masters: 65. They are included once.
- Deal-Investor relations: 134. These supplement existing and new Investors.
- Removed duplicate same-deal alias relations: 0.

The target database must already contain the keys listed in scope.json under existing_database_investor_keys.
Identity mappings and alias decisions are recorded in investor_resolution.json.

Import JSON records in manifest.json import_order. Every payload JSON is an independent upsert.

## Investor identity audit

This audited variant cross-checks official websites, LinkedIn identities, headquarters fields, and classification dates. See investor_identity_audit.json for field-level reasons behind every remaining null. Individual personal residence is never inferred as an investor headquarters.

## Investor team audit

This variant adds verified public core team members and an institution-level coverage audit. Missing member records remain explicit gaps and are not interpreted as proof that an institution has no team. See investor_team_audit.json.

## Investee business enrichment

All 50 Investee profiles now include normalized primary and secondary sector, primary and secondary use case, customer type, business model, sales motion, technology depth, and AI relevance fields.

The existing package was updated in place. See investee_business_classification_audit.json for record-level values and evidence URLs. Investee LinkedIn remains a documented schema-level gap because the current import contract has no investee LinkedIn field.

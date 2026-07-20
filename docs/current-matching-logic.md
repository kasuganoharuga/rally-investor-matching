# Current Matching Logic

Current version: local formal-data V1
Main backend files:

- `apps/api/app/services/match_service.py`
- `apps/api/app/services/matching_scoring.py`
- `apps/api/app/repositories/investor_repository.py`
- `apps/api/app/services/founder_parser_service.py`

## 1. Overall Flow

The matching system has four main steps:

1. Founder submits a free-text company / fundraise description, optionally with an uploaded document.
2. The AI parser converts the founder input into a structured company profile.
3. If key fields are missing, the system asks one follow-up question. It only asks once.
4. After enough information is available, FastAPI matches the founder profile against the formal investor database and returns the top 20 ranked investors.

The browser does not call the database directly. The matching path is:

```text
Next.js UI
  -> FastAPI /api/v1/match/intake
    -> founder_parser_service
    -> investor_repository.list_match_profiles()
    -> matching_scoring.score_profile()
    -> matching_scoring.select_ranked_matches()
```

## 2. Founder Profile Extraction

The founder parser asks the model to return structured JSON only.

Important fields include:

- `company_name`
- `company_hq_country`
- `primary_market`
- `stage`
- `round_type`
- `target_raise_value`
- `target_raise_currency`
- `target_raise_unit`
- `sector`
- `actual_sector`
- `actual_themes`
- `customer_type`
- `business_model`
- `sales_motion`
- `technology_depth`
- `ai_relevance`
- `ai_usage_type`
- `lead_needed`
- `traction_summary`
- `one_sentence_summary`
- `missing_information`

`actual_sector` uses the 12 fixed first-level taxonomy codes, for example:

- `healthcare_life_sciences`
- `resources_mining_metals`
- `energy_climate`
- `fintech_financial_services`
- `enterprise_software_data_security`
- `property_construction`

`actual_themes` uses the second-level tags, for example:

- `ai_governance_security`
- `cloud_finops`
- `product_analytics_user_research`
- `real_estate_construction_workflows`
- `asset_maintenance_fleet_management`
- `pet_care_nutrition`

AI is treated as a modifier unless the company is specifically AI infrastructure or model infrastructure.

## 3. Follow-Up Logic

The system requires these fields before matching:

- `company_name`
- `company_hq_country`
- `primary_market`
- `stage`
- `sector`
- `business_model`
- `target_raise_value`
- `target_raise_currency`
- `target_raise_unit`
- `lead_needed`

If one or more are missing, the response status becomes:

```text
needs_follow_up
```

The follow-up question includes up to the first 4 missing fields.

After one follow-up answer, the system continues matching even if some fields are still missing. In that case, status becomes:

```text
matched_with_missing_information
```

## 4. Investor Data Used

The matching system now uses the formal schema, not the old MVP compatibility schema.

Main tables used:

- `public.investors`
- `public.investor_actual_preferences`
- `public.investor_actual_stage_preferences`
- `public.funding_rounds`
- `public.deal_investors`
- `public.investee_company_profiles`

The repository builds one matching profile per investor. It includes:

- investor identity and type
- HQ / geography
- observed stage focus
- observed sector focus
- observed theme focus
- stage-specific actual preferences
- cheque ranges derived from stage-specific evidence
- lead behavior
- AI appetite
- recent deals
- data quality / review status

The most important table for matching is:

```text
investor_actual_stage_preferences
```

This gives stage-specific behavior, for example:

- what stages the investor actually joined
- how many deals were observed at that stage
- whether they led at that stage
- actual sectors and themes observed at that stage
- weighted distributions for geography, sector, theme, customer type, business model, AI relevance
- recent activity score
- evidence references

## 5. Hard Filters / Eligibility

Before final ranking, each investor gets an eligibility check.

### Geography Filter

If the founder is ANZ-related, the investor must have either:

- observed AU / ANZ fit, or
- a global mandate

Otherwise the investor is blocked.

If the founder is not ANZ-related, geography is scored more softly.

### Stage Filter

The system first chooses the best stage-specific investor preference:

1. exact stage match
2. no match

If the founder has a known stage and the investor has no exact same-stage evidence in `investor_actual_stage_preferences`, the investor is blocked before ranking.

## 6. Scoring Overview

Total score is capped at 100.

Current scoring factors:

| Factor                   | Max points | Purpose                                                                             |
| ------------------------ | ---------: | ----------------------------------------------------------------------------------- |
| `stage_evidence_depth`   |         10 | How much same-stage evidence exists, and did the investor lead deals at that stage? |
| `geography_fit`          |          5 | Does the investor have AU / ANZ or global geography evidence?                       |
| `sector_fit`             |         15 | Does the investor match the founder's first-level sector?                           |
| `theme_fit`              |         25 | Does the investor match the founder's second-level specific theme?                  |
| `recent_deal_similarity` |         20 | Are there comparable recent deals at the selected stage?                            |
| `customer_icp_fit`       |         10 | Do customer type and business model match observed behavior?                        |
| `cheque_size_fit`        |          5 | Does the founder's raise fit observed cheque ranges?                                |
| `lead_behavior_fit`      |          5 | Does lead/follow behavior fit the founder's lead need?                              |
| `data_quality_recency`   |          5 | Is the evidence high-quality and recent?                                            |

## 7. Stage Evidence Depth

```text
deals_count:
  min(6, deals_count * 2)

lead_count / leads_at_this_stage:
  up to +2

data_quality:
  high   -> +2
  medium -> +1
  low    -> +0

total capped at 10
```

Important note: this is a ranking score only after the strict stage filter has already passed.

## 8. Geography Fit

```text
ANZ founder + ANZ investor    -> 5
ANZ founder + global investor -> 3
ANZ founder + no geo fit      -> 0 and blocked

Founder not ANZ-related + global investor -> 5
Founder not ANZ-related + ANZ investor    -> 3
Other / unclear geography                 -> 2
```

Because most investors in the current database have ANZ relevance, geography is mainly an eligibility filter and a small score component, not the main differentiator.

## 9. Sector and Theme Fit

The system compares the founder's taxonomy against the selected stage-specific investor preference.

It checks:

- first-level `actual_sector`
- second-level `actual_themes`

Theme match is stronger than broad sector match.

```text
sector match:
  9 + round(sector_weight * 6) + small multi-match boost
  capped at 15

theme match:
  15 + round(theme_weight * 8) + small multi-match boost
  capped at 25

broad enterprise / property adjacency:
  5 in sector_fit

no overlap:
  0
```

The `theme_weight` and `sector_weight` come from the stage-specific weighted distribution in `investor_actual_stage_preferences`.

This is the main differentiation layer.

## 10. Recent Deal Similarity

The system now scores recent deals separately from general evidence confidence.

For each evidence ref in the selected stage preference, it checks:

- same second-level theme
- same first-level sector
- lead / participant role
- deal recency

```text
base comparable deal:
  +2

second-level theme overlap:
  +9 plus small multi-theme boost

first-level sector overlap:
  +4

lead role:
  +2

recent deal year:
  current year -> +3
  last year    -> +2
  two years    -> +1

total capped at 20
```

When the evidence refs are thin, the system falls back to stage-level deal count, recent activity, and sector/theme overlap.

## 11. Customer / ICP Fit

The system compares:

- founder `customer_type`
- founder `business_model`

Against the selected stage-specific investor preference distributions.

```text
customer_type match:
  5 + round(customer_weight * 2)

business_model match:
  3 + round(model_weight)

total capped at 10
```

This helps distinguish between investors that both invest in the same broad sector but prefer different customer profiles, such as enterprise, SMB, consumer, government, marketplace, or infrastructure.

## 12. Cheque Size, Lead Behavior, and Data Recency

Cheque size is a soft reference, not a hard filter.

```text
within observed cheque range       -> 5
near observed cheque range         -> 3
range missing / raise missing      -> 2
outside observed cheque range      -> 1
```

Lead behavior is now standalone:

```text
founder needs lead + investor leads at stage     -> 5
founder needs lead + participant-only evidence   -> 1
founder does not need lead + participant evidence -> 5
founder does not need lead + lead evidence        -> 4
unknown                                          -> 2
```

Data quality and recency:

data quality:
high -> +2
medium -> +1
low -> +0

recency:

- round(recent_activity_score * 3), capped at +3

total capped at 5

````

## 13. AI Handling

AI is not used as a primary sector.

The system infers founder AI relevance as:

- `ai_infrastructure`
- `ai_native`
- `ai_enabled`
- `none`

If the investor's observed stage preference has the same AI relevance in its weighted distribution, the match gets an explanation strength:

```text
AI relevance aligns as ...
````

If not, the system adds a risk:

```text
AI is treated as a modifier; observed AI evidence is not strong.
```

At the moment, AI does not directly add a separate score bucket.

## 14. Strengths, Risks, and Evidence

Each scored investor returns:

- `score`
- `match_tier`
- `breakdown`
- `strengths`
- `risks`
- `eligibility`
- `evidence`
- `investor_profile`

Strength examples:

- observed same-stage activity
- observed AU / ANZ geography fit
- first-level sector overlap
- second-level theme overlap
- comparable recent deal evidence
- customer type or business model match
- observed cheque range fit
- lead behavior fit
- observed deal count supporting the stage
- AI relevance alignment

Risk examples:

- no observed same-stage investment activity
- no clear AU / ANZ geography evidence
- no first-level sector or second-level theme overlap
- recent comparable deal evidence is thin
- customer / ICP fit is thin
- raise size appears outside observed cheque range
- lead evidence is weak for this stage
- AI evidence is not strong

Evidence rows are generated from the selected stage preference's `evidence_refs`, sorted by date descending, limited to 5.

Each evidence item includes:

- company
- stage
- amount
- role
- date
- observed sectors
- observed themes
- source URL, if available

## 15. Ranking and Result Count

The current result limit is:

```text
20 investors
```

The backend now ranks all eligible investors globally:

```text
sort by score descending
tie-break by investor name ascending
return top 20
```

The old routing pool grouping / quota logic is no longer used for result selection.

Routing pool labels are still returned as metadata, but the UI no longer groups results by pool.

## 16. Match Tiers

```text
score >= 80 -> strong
score >= 65 -> good
score >= 45 -> possible
else        -> manual_review
```

The current UI simplifies this visually into strong / possible / weak-style labels.

## 17. Current UI Flow

Current matching UI flow:

```text
Step 1: Founder describes company and fundraise
Step 2: Clarify missing fields if needed
Step 3: Results list, ranked globally
Step 4a: Match detail / match report
Step 4b: Full VC profile
```

Result card behavior:

- shows score ring
- shows investor name
- no longer shows `#1`, `#2`, etc.
- shows key signal pills
- shows short evidence line
- click opens the match detail page

Match detail page shows:

- score breakdown bars
- watch-outs
- warm intro status
- recommended action
- key facts
- evidence snapshot
- button to open full VC profile

Full VC profile shows:

- investor profile header
- about / notes
- investment focus
- recent deals table
- team / contact placeholder
- data quality
- score summary

## 18. What This Is Not Doing Yet

Current limitations:

- It does not yet run semantic vector retrieval over raw documents at match time.
- It uses structured observed preferences and evidence refs rather than embedding-based RAG retrieval.
- Cheque size is shown in the UI but is not currently its own score factor.
- Lead behavior is partly reflected in evidence confidence, but not a full standalone score factor.
- Warm intro path is mostly UI / metadata placeholder until real intro-route data exists.
- AI fit is explanatory rather than a direct score bucket.
- The ranking is global score order only; it does not yet enforce diversity across investor types.

## 19. Practical Interpretation

The current matcher should be understood as:

```text
hard filter first:
  geography eligibility
  stage eligibility

then ranking:
  stage fit
  sector / theme fit
  customer / business model fit
  evidence quality and recency
  lead behavior as a smaller evidence signal
```

The most important ranking differentiator is now the combination of:

```text
stage-specific actual_themes
+ actual_sector
+ customer_type / business_model distributions
+ recent observed deal evidence
```

This is much stronger than the old broad-field matching, where many ANZ early-stage investors looked almost identical.

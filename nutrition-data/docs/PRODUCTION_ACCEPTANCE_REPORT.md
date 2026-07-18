# Production Acceptance Report

Generated for Phase 3B operational acceptance.

## Production-ready manufacturers

These manufacturers passed live collection, parser coverage, immutable formulation versioning, event/idempotency checks, API/CLI verification, and live PostgreSQL acceptance:

| Manufacturer | Countries | Products | Nutrient coverage | Ingredient coverage | Feeding coverage | Formulation versions | PostgreSQL | Parser confidence |
|---|---|---:|---:|---:|---:|---:|---|---|
| Mitavite | AU | 19 | 100% | 100% | 100% | 19 | passed | high |
| Hygain | AU | 33 | 88% | 91% | 97% | 33 | passed | high |
| Pryde's EasiFeed | AU | 20 | 90% | 85% | 90% | 20 | passed | medium |
| Barastoc | AU | 5 | 100% | 100% | 100% | 5 | passed | high |

## Acceptance-testing manufacturers

| Manufacturer | Products | Status | Blockers |
|---|---:|---|---|
| CopRice | 3 | acceptance_testing | Product count below threshold; ingredient coverage below threshold; complete catalogue/deeper datasheets still pending |

## Blocked manufacturers

No Australian source is blocked by authentication or CAPTCHA. CopRice remains incomplete because only summary public product pages were located in this run.

## Database verification

`npm run test:postgres:live-au` provisioned a clean embedded PostgreSQL database, applied all migrations, ran live Australian imports, restarted PostgreSQL, and verified persisted manufacturers/products/formulation versions survived restart.

Additional PostgreSQL operational acceptance covers:

- idempotent recollection;
- unchanged products creating no duplicate formulation versions;
- changed products creating exactly one new immutable version;
- price observation deduplication;
- availability evidence deduplication;
- product documents;
- product variants;
- relationships;
- operational runs;
- operational issues;
- checkpoints;
- locks;
- event deduplication and replay safety.

## Event validation

Validated event families include:

- `nutrition.product.discovered`
- `nutrition.product.updated`
- `nutrition.product.replaced`
- `nutrition.product.discontinued`
- `nutrition.formulation.changed`
- `nutrition.availability.changed`
- `nutrition.price.observed`
- `nutrition.price.changed` model support

## Price observations

Price history tests validate multiple observations, regional/currency separation, promotion handling, expired observations, inflation/deflation, monthly feed cost, seasonal trends, and deduplication.

## Forage lab support

Forage lab tests validate CSV, TSV, plain text, PDF-text, and manual-style imports for Equi-Analytical, Dairy One, CVAS, Eurofins, and local labs. Duplicate imports are deterministic by report hash; corrected reports create a distinct analysis ID. Laboratory values override generic forage assumptions.

## API and CLI verification

API verification covers manufacturer status/workboard, product nutrients/ingredients/feeding directions/prices/availability/versions, forage labs, price trends, and mobile-friendly product pagination/incremental sync.

CLI verification covers manufacturer status/workboard, forage-lab validation/import, Australian acceptance report, and live manufacturer smoke/collection commands.

## Health summary

Manufacturer health reports expose:

- last collection;
- last persistence;
- last success/failure;
- products collected;
- warnings;
- parser confidence;
- acceptance progress;
- next operator action.

## Dataset totals for accepted Australian batch

- Production-ready manufacturers: 4
- Acceptance-testing manufacturers: 1
- Canonical products accepted in verified report: 80
- Formulation versions in verified report: 80
- Discontinued products: none discovered in this batch
- Availability records: official manufacturer-market evidence for AU products
- Distributor records: model and persistence validated; public distributor harvesting remains source-specific future work
- Price observations: model, persistence and trend analytics validated; manufacturer-specific public price collection remains source-specific
- Forage analyses: import/override/version behavior validated separately from manufacturer products

## Recommendation before UK/Ireland batch

The UK/Ireland manufacturer batch can begin only after accepting the current limitation that CopRice remains in acceptance testing. The user requirement was at least three Australian manufacturers production-ready; this run produced four production-ready Australian manufacturers.

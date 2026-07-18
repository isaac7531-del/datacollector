# UK & Ireland Manufacturer Acceptance Report

Generated during Phase 4 implementation.

## Current live evidence

| Manufacturer | Products discovered | Products accepted in live report | Nutrient coverage | Ingredient coverage | Feeding coverage | Parser confidence | Formulation versions | PostgreSQL verification | Mobile API | Remaining blockers |
|---|---:|---:|---:|---:|---:|---|---:|---|---|---|
| Dengie | 36 | 36 | 81% | 53% | 47% | medium | 36 | passed | ready | Ingredient and feeding-direction coverage below threshold |
| Dodson & Horrell | 85 | 81 | 100% | 32% | 96% | medium | 81 | passed | ready | Ingredient coverage below threshold; four stale/404 product URLs skipped as fetch warnings |
| Baileys | 109 | 109 | 94% | 80% | 24% | medium | 109 | passed | ready | Feeding-direction coverage below threshold; product sitemap may include non-core product pages |
| Saracen | 59 before test-page exclusion | 59 | 88% | 100% | 3% | medium | 59 | passed | ready | Feeding-direction coverage below threshold; test/commodity page filtering improved after report |
| Allen & Page | 4 | 4 | 100% | 100% | 100% | high | 4 | passed | ready | Product count below manufacturer threshold; broader catalogue discovery needed |
| Keyflow | 5 | 0 | 0% | 0% | 0% | unverified | 0 | passed | not ready | Product discovery works but product fetches fail in this environment |

## Production-ready status

No UK/Ireland manufacturer is marked `production_ready` yet. The PostgreSQL live acceptance test passed, but every source still has coverage, product-count, source-stability, or fetch blockers.

## PostgreSQL verification

`npm run test:postgres:live-uk` provisioned a clean embedded PostgreSQL database, applied all migrations, ran live UK/Ireland imports, restarted PostgreSQL, and verified persisted products and formulation versions survived restart.

## Mobile API readiness

The shared API supports:

- pagination via `limit` and `offset`;
- incremental sync via `updatedAfter`;
- country/manufacturer filters;
- compact product subresources for nutrients, ingredients, prices, availability and versions.

No mobile-only endpoints or models were added.

## Commands run

- `npm run manufacturer:smoke -- --manufacturer dengie-gb`
- `npm run manufacturer:smoke -- --manufacturer dodson-horrell-gb`
- `npm run manufacturer:smoke -- --manufacturer baileys-gb`
- `npm run manufacturer:smoke -- --manufacturer saracen-gb`
- `npm run manufacturer:smoke -- --manufacturer allen-page-gb`
- `npm run manufacturer:smoke -- --manufacturer keyflow-gb`
- `npm run test:postgres:live-uk`
- `npm run uk-ireland:acceptance-report -- --collect-live --postgres-verified`

## Recommendations before continuing

1. Improve Dengie ingredient and feeding-direction extraction.
2. Improve Dodson & Horrell PDF composition extraction and stale URL filtering.
3. Improve Baileys feeding-rate extraction and filter non-core products if needed.
4. Improve Saracen feeding-direction extraction and re-run after test-page exclusions.
5. Expand Allen & Page catalogue discovery beyond the four fallback products while respecting crawl-delay.
6. Treat Keyflow as blocked/degraded until product fetches work reliably or a document-assisted source is found.

Do not begin the next UK/Ireland manufacturer batch until at least three of these manufacturers reach production-ready status.

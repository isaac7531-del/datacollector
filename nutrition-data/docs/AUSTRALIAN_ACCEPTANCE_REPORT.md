# Australian Manufacturer Acceptance Report

Generated during Phase 3A implementation.

## Current live evidence

| Manufacturer | Products discovered | Products accepted in live in-memory run | Nutrient coverage | Ingredient coverage | Parser confidence | Formulation versions | PostgreSQL verification | Remaining blockers |
|---|---:|---:|---|---|---|---:|---|---|
| Mitavite | 19 | 19 | 100% in live in-memory report | 100% | High | 19 in-memory versions | Migration test only | PostgreSQL adapter acceptance not run |
| Hygain | 33 | 33 | 88% in live in-memory report | 91% | High | 33 in-memory versions | Migration test only | PostgreSQL adapter acceptance not run; sparse nutrient pages remain for several supplement/oil/binder products |
| Pryde's EasiFeed | 20 after filtering | 20 | 90% in live in-memory report | 85% | Medium | 20 in-memory versions | Migration test only | PostgreSQL adapter acceptance not run |
| Barastoc | 5 PDF sheets | 5 | 100% in live in-memory report | 100% | High document-assisted | 5 in-memory versions | Migration test only | PostgreSQL/document persistence acceptance not run |
| CopRice | 3 | 3 | 100% summary nutrient coverage | 0% | Medium | 3 in-memory versions | Migration test only | Complete catalogue and deeper ingredient/datasheet coverage not yet located |

## Production-ready status

No Australian manufacturer is marked `production_ready` yet because Phase 3A requires PostgreSQL-backed persistence. The live in-memory acceptance report currently returns `productionReadyCount: 0` even when parser coverage passes because `postgreSqlVerification` remains `migration_only`.

## Commands run

- `npm run manufacturer:smoke -- --manufacturer hygain-au`
- `npm run manufacturer:smoke -- --manufacturer prydes-au`
- `npm run manufacturer:smoke -- --manufacturer coprice-au`
- `npm run manufacturer:smoke -- --manufacturer barastoc-au`
- `npm run manufacturer:collect -- --manufacturer hygain-au`
- `npm run manufacturer:collect -- --manufacturer coprice-au`
- `npm run manufacturer:collect -- --manufacturer barastoc-au`
- `npm run australia:acceptance-report -- --collect-live`

## Next tasks

1. Re-run `manufacturer:collect` for Pryde's after product URL filtering.
2. Improve Hygain sparse product handling and classify supplement/oil/binder pages explicitly.
3. Locate richer CopRice datasheets or document unavailable sections.
4. Run PostgreSQL-backed adapter acceptance once a persistent repository adapter is supplied.
5. Only mark production-ready when all blockers are resolved.

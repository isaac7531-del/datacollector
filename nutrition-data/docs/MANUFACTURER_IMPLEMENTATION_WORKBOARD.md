# Manufacturer Implementation Workboard

Statuses:

- registered
- reconnaissance
- scaffolded
- discovery_working
- collection_partial
- live_smoke_passed
- acceptance_testing
- production_ready
- degraded
- blocked
- disabled

This workboard is generated operationally by `npm run manufacturer:workboard`. Static rows below reflect the current source-control state; live statuses depend on the active repository and latest connector runs.

## Australia batch 1

| Manufacturer | Capability | Status | Evidence | Blocker | Next task |
|---|---|---|---|---|---|
| Mitavite | Registry | registered | Live connector config |  | Maintain monthly refresh |
| Mitavite | Catalogue discovery | live_smoke_passed | 19 live products discovered/collected in smoke |  | Run PostgreSQL acceptance |
| Mitavite | Acceptance | acceptance_testing | In-memory live collection passed | PostgreSQL adapter acceptance not run | Persist against PostgreSQL |
| Hygain | Registry | registered | Live connector config |  | Run live collection acceptance |
| Hygain | Reconnaissance | reconnaissance | Shopify robots allow product/collection pages |  | Improve nutrient parser coverage |
| Hygain | Catalogue discovery | discovery_working | Live smoke discovered 33 candidate URLs |  | Filter non-feed/support products where appropriate |
| Hygain | Product collection | collection_partial | In-memory live collection created 33 records | Low nutrient coverage warnings on multiple pages | Improve Shopify product detail parsing |
| Pryde's EasiFeed | Registry | registered | Live connector config |  | Run live collection acceptance |
| Pryde's EasiFeed | Reconnaissance | reconnaissance | Product page with nutrient, ingredient, feeding, pack-size data validated |  | Re-run collection after URL exclusions |
| Pryde's EasiFeed | Catalogue discovery | discovery_working | Live smoke discovered product URLs; non-product tag URLs excluded in connector config | Sitemap includes non-product pages | Validate post-filter collection |
| Barastoc | Registry | registered | Document-assisted connector config |  | Run PDF document parser acceptance |
| Barastoc | Reconnaissance | reconnaissance | Public specification PDFs found | Catalogue page URL unresolved | Validate PDF collection |
| Barastoc | Product collection | collection_partial | In-memory live collection created 5 records from public PDFs with no issues | PostgreSQL/document parser acceptance not run | Persist PDF extracts and version checks |
| CopRice | Registry | registered | Partial public-page connector config |  | Improve product catalogue discovery |
| CopRice | Reconnaissance | reconnaissance | Product pages expose summary nutrition | Catalogue URL unresolved; abbreviated nutrient data | Locate complete product catalogue |
| CopRice | Product collection | collection_partial | In-memory live collection created 3 records with no issues | Limited nutrient depth on public pages | Find datasheets or richer public source |

## Remaining regions

All remaining roadmap manufacturers are registered or reconnaissance-stage until their source-specific connector acceptance evidence is collected. Registry presence must not be counted as production readiness.

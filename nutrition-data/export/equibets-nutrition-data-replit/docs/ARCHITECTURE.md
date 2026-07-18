# Architecture

The Nutrition Data Engine mirrors the Competition Data Engine pattern:

1. **Connectors** discover public source items, fetch raw payloads, and normalise them into the shared domain model.
2. **Ingestion** upserts manufacturers and products, detects formulation and availability changes, tracks discontinued products, and emits events.
3. **Repository** is an interface. The package ships an in-memory implementation and SQL migrations for persistent integration.
4. **Domain engines** calculate requirements, feeding-program intake, geography-aware availability, cost, comparison, and recommendations.
5. **Runtime adapters** expose the same engine through package imports, CLI, HTTP, and worker entrypoints.
6. **Export package** is generated under `export/equibets-nutrition-data-replit` and zipped for Replit handoff.

## Design principles

- Automation first.
- Expert explainability second.
- Manual editing always available through repository and manual connector APIs.
- Every recommendation carries reason, evidence, confidence, cost impact, nutrition impact, and availability.
- Every product and nutrient can retain provenance.
- Recommendations are geography-aware and never treat global existence as local availability.

## Geography ranking

Recommendation priority is:

1. Products already fed by the horse.
2. Local products.
3. Same manufacturer alternatives.
4. National alternatives.
5. Imported alternatives.
6. Global alternatives only when explicitly enabled.

The current implementation provides local/import/global gates in `AvailabilityEngine`. Same-manufacturer and already-fed ranking can be layered by passing those products first or by extending `RecommendationEngine` priority rules.

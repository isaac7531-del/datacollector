# Replit Integration Prompt

Integrate the standalone `@equibets/nutrition-data` package into the main EquiBets Replit application without coupling it to UI code.

Requirements:

1. Install or copy the package from `export/equibets-nutrition-data-replit` only after Phase 2 export validation has passed.
2. Apply migrations in order:
   - `migrations/001_nutrition_data_engine.sql`
   - `migrations/002_operational_live_data.sql`
3. Configure environment variables:
   - `DATABASE_URL`
   - `NUTRITION_DATA_PORT`
   - `NUTRITION_WORKER_INTERVAL_MS`
   - integration-owned object storage and notification secrets where adapters require them.
4. Create a repository adapter implementing `NutritionDataRepository`, including operational methods for product versions, availability evidence, documents, price observations, operational runs, checkpoints and locks.
5. Register manufacturer connectors in a server-only module. Start with:
   - Mitavite AU
   - Dengie GB/IE
   - Dodson & Horrell GB/IE
   - St. Hippolyt DE/AT
   - Dunstan NZ
   - Triple Crown US
6. Add scheduled jobs:
   - `npm run worker:discovery`
   - `npm run worker:products`
   - `npm run worker:availability`
   - `npm run worker:prices`
   - `npm run worker:recalculate`
   - `npm run worker:outbox`
7. Subscribe to events:
   - product updated
   - product discontinued
   - formulation changed
   - country availability changed
   - recommendations changed
8. Add API routes that call:
   - `searchProducts`
   - `calculateRequirements`
   - `analyseFeedingProgram`
   - `recommendForProgram`
   - `compareProducts`
   - `productVersions`
   - `availabilityEvidence`
   - `priceHistory`
   - `operationalIssues`
9. Ensure every request includes horse location and import/global search preferences.
10. Store private rations in the main application. Pass only required ration/horse context to the engine.
11. Never recommend products unavailable to the horse location unless imported or global search is explicitly enabled.
12. Surface recommendation `reason`, `evidence`, `confidence`, `costImpact`, `nutritionalImpact`, `availability`, and confidence explanations in the UI.
13. Build an administrator data-operations UI for:
   - unresolved nutrient labels;
   - unresolved ingredients;
   - ambiguous products;
   - duplicate candidates;
   - regional variants;
   - missing units;
   - stale availability;
   - changed formulations;
   - discontinued products;
   - document parse failures.
14. Notify affected users when an integration-owned ration uses a product with formulation or availability changes.

Do not embed scraping or connector secrets in client code. All collection runs must happen server-side or in workers.

The main application owns auth, tenant boundary, user accounts, horse ownership, stable membership, UI, subscriptions, final notification delivery and private ration records.

The Nutrition Data Engine owns public manufacturer data, canonical products, nutrient definitions, availability evidence, formulation versions, public price observations, requirement calculations, ration analysis and recommendation computation.

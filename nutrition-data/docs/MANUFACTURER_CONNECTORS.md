# Manufacturer Connectors

Operational connectors extend the base ingestion connector with:

- `discoverRegions`
- `discoverCategories`
- `discoverProducts`
- `fetchProduct`
- `fetchNutritionDocuments`
- `fetchAvailability`
- `fetchDistributors`
- `parseProduct`
- `parseNutrients`
- `parseIngredients`
- `parseFeedingDirections`
- `parseWarnings`
- `parsePackaging`
- `determineProductState`
- `determineNextCheckTime`

Every connector reports telemetry:

- acquisition mode;
- supported countries;
- supported categories;
- last successful discovery;
- last successful product fetch;
- parse coverage;
- nutrient coverage;
- availability coverage;
- current limitations.

Launch connectors:

- Mitavite AU: fully automated public pages.
- Dengie GB/IE: fully automated public pages.
- Dodson & Horrell GB/IE: document-assisted public product sheets.
- St. Hippolyt DE/AT: fully automated German public pages.
- Dunstan NZ: fully automated public pages with document extension.
- Triple Crown US: fully automated product pages; old PDF paths disallowed by robots are not fetched.

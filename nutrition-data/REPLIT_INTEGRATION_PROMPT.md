# Replit Integration Prompt

Integrate the standalone `@equibets/nutrition-data` package into the main EquiBets Replit application without coupling it to UI code.

Requirements:

1. Install or copy the package from `export/equibets-nutrition-data-replit`.
2. Apply `migrations/001_nutrition_data_engine.sql` to the application database.
3. Create a repository adapter implementing `NutritionDataRepository`.
4. Register manufacturer connectors in a server-only module.
5. Add scheduled ingestion via `NutritionDataEngine.runIngestion()`.
6. Add API routes that call:
   - `searchProducts`
   - `calculateRequirements`
   - `analyseFeedingProgram`
   - `recommendForProgram`
   - `compareProducts`
7. Ensure every request includes horse location and import/global search preferences.
8. Never recommend products unavailable to the horse location unless imported or global search is explicitly enabled.
9. Surface recommendation `reason`, `evidence`, `confidence`, `costImpact`, `nutritionalImpact`, and `availability` in the UI.

Do not embed scraping or connector secrets in client code. All collection runs must happen server-side or in workers.

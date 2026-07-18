# Integration Guide

## Stable Manager / EBI

1. Install `@equibets/nutrition-data`.
2. Provide a repository implementation backed by the EquiBets database or start with `InMemoryNutritionDataRepository`.
3. Register manufacturer connectors.
4. Run `engine.runIngestion()` from a scheduled worker.
5. Use `engine.calculateRequirements()` when creating a horse nutrition profile.
6. Use `engine.analyseFeedingProgram()` when a user edits a ration.
7. Use `engine.recommendForProgram()` after analysis to generate explainable changes.

## User location

Always pass `HorseProfile.location`. If `allowImportedFeeds` is false, imported products are filtered out. If `allowGlobalSearch` is false, global products are filtered out.

## Manual editing

Manual product edits should be persisted through the repository and include a `VersionRecord`. Manual imports can be handled with `createManualConnector` or `importNutritionPayload`.

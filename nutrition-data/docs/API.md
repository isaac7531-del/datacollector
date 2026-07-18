# API

## Import surface

```ts
import {
  createNutritionDataEngine,
  createManualConnector,
  createPublicFeedConnector,
  InMemoryNutritionDataRepository,
  NutritionDataEngine
} from "@equibets/nutrition-data";
```

## Engine methods

- `listConnectors({ enabledOnly })`
- `connectorHealth(connectorId)`
- `discover(context, connectorIds?)`
- `runIngestion(options?)`
- `runConnector(connectorId, options?)`
- `listManufacturers()`
- `listProducts(query?)`
- `searchProducts(query)`
- `getProduct(productId)`
- `localProducts(location, products?)`
- `calculateRequirements(horse)`
- `analyseFeedingProgram(program)`
- `recommendForProgram(program, { candidateProducts?, maxRecommendations? })`
- `compareProducts(products, options?)`
- `productVersions(productId)`
- `availabilityEvidence(query?)`
- `distributorStockists(query?)`
- `priceHistory(query?)`
- `operationalIssues(query?)`
- `operationalRuns(query?)`

## HTTP endpoints

- `GET /health`
- `GET /manufacturers`
- `GET /manufacturers/:id/health`
- `POST /manufacturers/:id/refresh`
- `GET /products?q=&country=&includeImported=`
- `GET /products/:id/versions`
- `GET /products/:id/availability`
- `GET /products/:id/price-history`
- `GET /availability?country=&staleBefore=`
- `GET /availability/distributors?country=&manufacturerId=`
- `GET /operations/runs`
- `GET /operations/issues?unresolvedOnly=`
- `POST /requirements`
- `POST /programs/analyse`
- `POST /recommendations`
- `POST /ingestion/run`

## CLI

```bash
npm run cli -- connector:list
npm run cli -- connector:health default-seed
npm run cli -- ingest
npm run cli -- products --country AU --imported
npm run cli -- requirements '{"species":"horse","ageYears":8,"weightKg":500,"workload":"moderate","goals":["performance"],"location":{"country":"AU"}}'
npm run manufacturer:list
npm run manufacturer:health
npm run manufacturer:discover -- --manufacturer mitavite-au
npm run manufacturer:collect -- --manufacturer dengie-gb --dry-run
npm run availability:stale -- --country GB
npm run worker:products -- --manufacturer triple-crown-us
```

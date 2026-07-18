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
- `manufacturerStatus(manufacturerId)`
- `manufacturerAcceptance(manufacturerId)`
- `manufacturerWorkboard()`

## HTTP endpoints

- `GET /health`
- `GET /manufacturers`
- `GET /manufacturers/:id/health`
- `GET /manufacturers/:id/status`
- `GET /manufacturers/:id/products`
- `GET /manufacturers/:id/acceptance`
- `POST /manufacturers/:id/refresh`
- `GET /products?q=&country=&includeImported=`
- `GET /products/:id`
- `GET /products/:id/versions`
- `GET /products/:id/nutrients`
- `GET /products/:id/ingredients`
- `GET /products/:id/feeding-directions`
- `GET /products/:id/availability`
- `GET /products/:id/prices`
- `GET /products/:id/price-history`
- `GET /products/:id/alternatives`
- `GET /availability?country=&staleBefore=`
- `GET /availability/distributors?country=&manufacturerId=`
- `GET /operations/runs`
- `GET /operations/issues?unresolvedOnly=`
- `GET /forage-labs`
- `POST /forage-labs/import`
- `GET /forage-analyses/:id`
- `GET /forage-analyses/:id/versions`
- `GET /price-observations`
- `GET /price-trends`
- `GET /manufacturer-workboard`
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
npm run manufacturer:status -- --manufacturer hygain-au
npm run manufacturer:assess -- --manufacturer prydes-au
npm run manufacturer:discover -- --manufacturer mitavite-au
npm run manufacturer:collect -- --manufacturer dengie-gb --dry-run
npm run manufacturer:persist-smoke -- --manufacturer barastoc-au
npm run manufacturer:acceptance -- --manufacturer coprice-au
npm run manufacturer:refresh -- --manufacturer hygain-au
npm run manufacturer:workboard
npm run availability:stale -- --country GB
npm run worker:products -- --manufacturer triple-crown-us
npm run formulation:changes
npm run forage-lab:validate -- --lab equi-analytical --file ./hay-analysis.csv
```

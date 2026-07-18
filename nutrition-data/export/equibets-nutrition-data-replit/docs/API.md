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

## HTTP endpoints

- `GET /health`
- `GET /manufacturers`
- `GET /products?q=&country=&includeImported=`
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
```

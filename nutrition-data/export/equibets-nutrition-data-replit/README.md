# EquiBets Nutrition Data Engine

`@equibets/nutrition-data` is a standalone TypeScript package for collecting, normalising, comparing, and recommending equine nutrition products and feeding programs.

It is intentionally independent of the EquiBets UI and the main Replit application. Stable Manager, EBI, or any other EquiBets service can import it as a reusable package.

## Install

```bash
npm install @equibets/nutrition-data
```

## Quick start

```ts
import { createNutritionDataEngine, InMemoryNutritionDataRepository } from "@equibets/nutrition-data";

const engine = createNutritionDataEngine({
  repository: new InMemoryNutritionDataRepository()
});

const requirements = engine.calculateRequirements({
  species: "horse",
  ageYears: 9,
  weightKg: 520,
  workload: "moderate",
  goals: ["performance", "low_starch"],
  location: { country: "AU", stateOrProvince: "AU-NSW", currency: "AUD" }
});
```

## What it does

- Collects public manufacturer nutrition data through pluggable connectors.
- Normalises feeds, supplements, forage, oils, minerals, balancers, and custom mixes into one nutrient model.
- Preserves provenance and confidence for every product and nutrient.
- Calculates horse requirements from weight, workload, age, goals, climate, breeding, recovery, and location.
- Analyses full feeding programs including forage, pasture, feeds, supplements, treats, and custom ingredients.
- Detects deficiencies, excesses, ratios, warnings, interactions, and daily/monthly cost.
- Produces explainable recommendations with evidence, confidence, cost impact, nutritional impact, and availability.
- Filters and ranks recommendations by country, region, postal code, import availability, and distributor coverage.
- Emits events for product, formulation, availability, discontinuation, and recommendation changes.

## Commands

```bash
npm run build
npm test
npm run cli -- connector:list
npm run cli -- products --country AU
npm run start
npm run worker
npm run export:zip
```

## Package layout

- `src/domain` - source-neutral nutrition, horse, program, provenance, and event types.
- `src/connectors` - manufacturer connector contracts and reusable manual/public feed connectors.
- `src/ingestion` - discovery, fetch, normalise, upsert, version, and event pipeline.
- `src/requirements` - horse nutrient requirement calculations.
- `src/programs` - ration analysis, intake, cost, ratios, warnings, and interactions.
- `src/recommendations` - explainable recommendation engine.
- `src/availability` - geography-aware product filtering and ranking.
- `src/costs` - cost per kg/day/month/nutrient.
- `src/comparison` - product comparison tables.
- `src/http`, `src/cli`, `src/workers` - runtime adapters.
- `migrations` - Postgres schema.
- `export` - generated Replit handoff package and ZIP.

## Compliance boundaries

Connectors are designed for public manufacturer, catalogue, label, nutrition sheet, retail, distributor, CSV, Excel, XML, JSON, and API data. They must not bypass login, CAPTCHA, authentication, or source terms. Robots policy and licence notes are carried in source provenance.

# Replit Runtime

Runtime processes:

- HTTP API: `npm run start`
- General worker: `npm run worker`
- Discovery worker: `npm run worker:discovery`
- Product worker: `npm run worker:products`
- Availability worker: `npm run worker:availability`
- Price worker: `npm run worker:prices`
- Recalculation worker: `npm run worker:recalculate`
- Outbox worker: `npm run worker:outbox`

Environment variables:

- `NUTRITION_DATA_PORT`
- `NUTRITION_WORKER_INTERVAL_MS`
- `NUTRITION_WORKER_ONCE`
- `DATABASE_URL`

The integration host owns auth, tenancy, user accounts, horse ownership, UI, subscriptions, notification delivery and private ration storage.

The Nutrition Data Engine owns public manufacturer data, canonical products, nutrient definitions, availability evidence, formulation versions, public price observations, requirement calculations, ration analysis and recommendation computation.

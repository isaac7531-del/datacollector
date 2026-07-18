# Replit runtime guide

## Processes

The package can run as:

1. API process: `npm run start`
2. Import worker: `npm run worker`
3. Outbox worker: `npm run worker:outbox`
4. Scheduled connector task: `npm run backfill -- --connector <id> --from YYYY-MM-DD --to YYYY-MM-DD`

If the Replit deployment supports only one always-on process, run the API process and configure scheduled deployments or jobs to invoke worker/connector commands.

## Required secrets

- `DATABASE_URL`
- `COMPETITION_DATA_ENGINE_API_KEY`
- `PORT`
- `HOST`

## Setup commands

```bash
npm ci
npm run migrate
npm run seed
npm run build
```

## Start commands

```bash
npm run start
npm run worker
npm run worker:outbox
```

## Health checks

- `GET /health`
- `GET /ready`
- `GET /metrics` if enabled/configured.

## File import example

```bash
npm run import:file -- --path ./tests/fixtures/eventing-results.csv --connector generic-csv
```

## Mapping profile example

```bash
npm run mapping:inspect -- --path ./tests/fixtures/eventing-results.csv
npm run mapping:preview -- --path ./tests/fixtures/eventing-results.csv --profile ./profile.json
npm run mapping:test -- --path ./tests/fixtures/eventing-results.csv --profile ./profile.json
```

## Service-to-service auth

Use `COMPETITION_DATA_ENGINE_API_KEY` for the standalone API. Replit should replace this with its own `AuthAdapter` when mounting inside the main application.

## Scheduled connector task

See `examples/replit-scheduled-job.ts`. Use scheduler locks to prevent duplicate connector runs for the same scope.

## Runtime constraints

Do not assume multiple always-on processes are available. If worker processes cannot run continuously, schedule:

- connector runs;
- provisional-result rechecks;
- outbox retries;
- unresolved-record reprocessing.

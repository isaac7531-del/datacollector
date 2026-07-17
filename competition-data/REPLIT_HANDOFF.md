# Replit handoff: Competition Data Engine

## What this is

`@equibets/competition-data` is a standalone service package for EquiBets public competition data. It is not a replacement for the main Replit application and does not contain UI pages.

It provides:

- Connector registration and per-connector enable/disable controls.
- Discovery for public source items.
- Raw collection through connector adapters.
- Normalization into portable competition/event/horse/rider/result graphs.
- Validation and data-quality issue collection.
- Provenance tracking for source URL, checksum, connector, and batch id.
- Deterministic entity resolution and reconciliation plans.
- Manual-entry ingestion for unsupported/historical/private/correction workflows.
- Scheduler interfaces and a dependency-free standalone HTTP server adapter.

## Integration checklist

1. Install or copy the package into the main EquiBets Replit app.
2. Implement `CompetitionDataRepository` against the app database and ORM.
3. Register source connectors for FEI, national federation feeds, state/regional feeds, organiser exports, rankings, and entry lists.
4. Register normalizers for each raw source shape.
5. Configure connector env vars using `.env.example`.
6. Add a queue or scheduled job that calls `engine.runIngestion()`.
7. Surface `review` reconciliation plans in the Data Operations Centre.
8. Keep manual entry wired to `engine.submitManualEntry()`.
9. Add source-specific compliance notes before enabling production connectors.

## Recommended service setup

```ts
import {
  CompetitionDataEngine,
  createCompetitionDataHttpServer
} from "@equibets/competition-data";
import { equibetsCompetitionRepository } from "./repositories/equibetsCompetitionRepository";
import { connectors } from "./competition-data/connectors";
import { normalizers } from "./competition-data/normalizers";

const engine = new CompetitionDataEngine({
  repository: equibetsCompetitionRepository,
  connectors,
  normalizers,
  importBatchPrefix: "equibets-public-data"
});

const server = createCompetitionDataHttpServer({
  engine,
  apiKey: process.env.COMPETITION_DATA_ENGINE_API_KEY
});

server.listen(Number(process.env.PORT ?? 3000));
```

## API endpoints

### `GET /health`

Returns service health.

### `GET /connectors?enabledOnly=true`

Returns connector descriptors and compliance notes.

### `POST /discovery`

Body:

```json
{
  "connectorIds": ["fei-public-feed"],
  "context": {
    "fromDate": "2026-01-01",
    "toDate": "2026-12-31",
    "countryCodes": ["AU"]
  }
}
```

### `POST /ingestion-runs`

Body:

```json
{
  "connectorIds": ["fei-public-feed"],
  "dryRun": true,
  "discovery": {
    "fromDate": "2026-01-01",
    "toDate": "2026-12-31"
  }
}
```

### `POST /manual-submissions`

Body:

```json
{
  "dryRun": false,
  "submission": {
    "submittedAt": "2026-07-17T00:00:00.000Z",
    "reason": "historical_record",
    "competition": {
      "externalIds": [{ "sourceSystem": "user", "sourceId": "historical-1" }],
      "name": "Historical Club Day",
      "status": "completed"
    }
  }
}
```

## Data Operations Centre

The package does not implement UI. The app should store and display reconciliation plans where:

- `action` is `review`;
- validation issues include `severity: "error"` or important warnings;
- provenance is missing or source terms require human confirmation.

## Database notes

`migrations/001_competition_data_engine.sql` provides a generic SQL reference schema for ingestion runs, source records, reconciliation plans, and provenance. Adapt it to the existing Replit ORM instead of applying blindly.

# @equibets/competition-data

Standalone Competition Data Engine for EquiBets public equestrian data ingestion.

The engine collects, normalizes, validates, reconciles, and applies public competition data while keeping manual entry available for unsupported or private cases. It is designed as a service package with clean ports for storage, HTTP, scheduling, source connectors, and operations review.

## Principles

- Automation first, manual when needed.
- Prefer official APIs, feeds, exports, and public files before structured pages or human-assisted imports.
- Every connector is individually disableable.
- No dependency on EquiBets UI or application code.
- Provenance and data-quality issues travel with every imported graph.

## Install

```bash
npm install @equibets/competition-data
```

For this repository:

```bash
cd competition-data
npm install
npm test
npm run build
```

## Public API

```ts
import {
  CompetitionDataEngine,
  InMemoryCompetitionDataRepository,
  createHttpJsonFeedConnector,
  createPassThroughGraphNormalizer,
  FetchHttpClient
} from "@equibets/competition-data";

const repository = new InMemoryCompetitionDataRepository();

const engine = new CompetitionDataEngine({
  repository,
  normalizers: [createPassThroughGraphNormalizer()],
  connectors: [
    createHttpJsonFeedConnector({
      id: "national-results-feed",
      name: "National results feed",
      enabled: true,
      httpClient: new FetchHttpClient(),
      source: {
        id: "national-results",
        name: "National results",
        kind: "national_federation",
        mode: "official_feed",
        official: true
      },
      endpoints: [{ id: "latest", url: "https://example.org/results.json" }]
    })
  ]
});

const summary = await engine.runIngestion({ dryRun: true });
```

## Standalone HTTP service

Use `createCompetitionDataHttpServer` to expose:

- `GET /health`
- `GET /connectors?enabledOnly=true`
- `POST /discovery`
- `POST /ingestion-runs`
- `POST /manual-submissions`

The HTTP adapter is intentionally small and dependency-free. Replit can mount the engine behind its existing API framework instead if preferred.

## Package layout

```text
competition-data/
  src/
    adapters/
    config/
    connectors/
    discovery/
    domain/
    ingestion/
    manual-entry/
    normalisation/
    provenance/
    reconciliation/
    resolution/
    scheduling/
    service/
    validation/
  tests/
  migrations/
  examples/
  docs/
```

## Compliance boundary

Connector configuration should follow this order:

1. Full automation
2. Official public APIs
3. Official public feeds
4. Official exports
5. Public CSV, XML, JSON, or spreadsheet downloads
6. Public structured pages where collection is technically appropriate
7. Human-assisted imports
8. Manual entry

Each connector descriptor includes a compliance note. Keep source-specific terms and disablement controls in the application configuration.

## Integration points

Replit should provide implementations for:

- `CompetitionDataRepository` using the application database/ORM.
- Source-specific `CompetitionDataConnector` implementations.
- Source-specific `CompetitionDataNormalizer` implementations.
- Optional scheduler or queue adapter.
- Optional Data Operations Centre UI for reconciliation plans requiring review.

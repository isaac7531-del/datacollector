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

This package does not require public npm publication. Preferred installation options:

1. Copy `competition-data/` as a workspace package into Replit.
2. Install from a local archive produced from this package.
3. Install from this private Git repository.
4. Move to a private package registry later if needed.

For this repository:

```bash
cd competition-data
npm install
npm test
npm run build
npm run demo
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

Use `createCompetitionDataApiServer` to expose the production API boundary. A legacy minimal `createCompetitionDataHttpServer` remains exported for backwards compatibility.

See `docs/API.md`.

## CLI

```bash
npm run connector:list
npm run connector:health
npm run import:file -- --path ./tests/fixtures/eventing-results.csv --connector generic-csv
npm run import:url -- --url https://example.org/results.csv --connector public-file
npm run backfill -- --connector generic-csv --from 2026-01-01 --to 2026-12-31
npm run reprocess:failed
npm run reprocess:unresolved
npm run provisional:recheck
npm run worker
npm run demo
```

## Package layout

```text
competition-data/
  src/
    adapters/
    api/
    auth/
    cli/
    config/
    connectors/
    discovery/
    domain/
    events/
    http/
    ingestion/
    manual-entry/
    normalisation/
    provenance/
    reconciliation/
    repositories/
    resolution/
    scheduling/
    security/
    service/
    storage/
    validation/
    workers/
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

## Working now

- CSV results import.
- `.xlsx` results import.
- Source-neutral JSON import.
- Source-neutral XML import.
- Public URL import for safe public HTTP/HTTPS files.
- Manual import through the same pipeline.
- FEI assisted import for supplied exports/downloads.
- Staging, validation, normalization, entity resolution, reconciliation and provenance.
- In-memory and PostgreSQL repository adapters.
- Runnable HTTP API, CLI, worker and demo.

## Assisted/manual

- FEI exports and downloads supplied by users or administrators.
- User-uploaded official result files.
- Historical, unofficial, club, Pony Club, correction and private-note workflows.

## Not supported

- Direct FEI automation where technical protections block server access.
- CAPTCHA/DataDome bypassing, proxy rotation, browser fingerprint spoofing or stealth scraping.
- Legacy `.xls` import without a safe parser.

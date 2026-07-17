# Current implementation audit

Audit date: 2026-07-17

This document reports the current state of `@equibets/competition-data` after the second implementation pass. It intentionally avoids describing generic import capability as a certified live public-source integration.

## Fully functional connectors

- `createCsvResultsConnector` is functional and tested with synthetic eventing CSV data.
- `createExcelResultsConnector` is functional for `.xlsx` files and tested with generated workbook data.
- `createJsonResultsConnector` is functional and tested with source-neutral JSON schema version `1.0`.
- `createXmlResultsConnector` is functional and tested with source-neutral XML.
- `createPublicFileUrlConnector` implements safe public HTTP/HTTPS file fetching for CSV, JSON, XML and `.xlsx`; SSRF protections are unit-tested. It is not tested against a real public equestrian source.
- `createManualImportConnector` is functional and routes manual submissions through the same ingestion pipeline.
- `createFeiAssistedImportConnector` wraps assisted FEI CSV/JSON imports. It is not direct FEI page automation.
- `createNationalResultsConnector` is functional as a configuration-driven framework using synthetic example mappings. No real national federation source is certified live.

## Interfaces or placeholders

- `CompetitionDataConnector` is a real interface with `discover`, `collect`, capability metadata, optional source-specific methods and health checks.
- `CompetitionDataNormalizer` is a real interface.
- `createPassThroughGraphNormalizer` only works when the source already emits the package's `NormalizedCompetitionGraph`.
- Scheduling is represented by `CompetitionDataScheduler`, `InProcessCompetitionDataScheduler` and `SchedulerLockService`.
- `migrations/002_postgres_engine_storage.sql` is wired to `PostgresCompetitionDataRepository`.

## Import formats currently working

- Already-normalized graph objects work through the pass-through normalizer.
- CSV works with configurable delimiter, aliases, mapping, decimal format, event metadata and row-level validation.
- `.xlsx` works with sheet/header options through `exceljs`.
- JSON works through documented source-neutral schema version `1.0`.
- XML works through source-neutral XML mapped to schema version `1.0`.
- Public URL imports work for safe public HTTP/HTTPS file URLs with SSRF protection, redirect limits, content limits, retries and caching.
- Legacy `.xls` is not implemented.

## Repository methods implemented

- `InMemoryCompetitionDataRepository` implements:
  - competition candidate lookup;
  - event candidate lookup;
  - horse candidate lookup;
  - rider candidate lookup;
  - result candidate lookup;
  - entry candidate lookup;
  - ranking candidate lookup;
  - reconciliation plan application into in-memory arrays.
- Optional repository methods now cover import runs, staged records, conflicts, resolution candidates, result versions, connector health, scheduler locks and event outbox records.

## In-memory-only areas

- `InMemoryCompetitionDataRepository` is still used for most tests and the demo.
- It supports staging, conflicts, resolution candidates, result versions, connector health, locks and outbox events for tests/demos.

## Persistent storage

- `PostgresCompetitionDataRepository` is implemented using `pg`.
- Migration `002_postgres_engine_storage.sql` creates additive PostgreSQL tables and indexes.
- PostgreSQL tests require `DATABASE_URL`; without it, the test suite documents that setup requirement.

## HTTP server

- `src/http/server.ts` exposes a runnable API with health/readiness, connector, import, staging, resolution, conflict, manual-result and data-access route boundaries.
- Request validation is implemented for key mutation endpoints with `zod`.
- Correlation IDs, JSON body limits, basic rate limiting and auth/role adapter boundaries are implemented.
- Multipart upload handling is not built in; Replit should connect existing upload middleware to `/imports/file`.

## CLI, worker and scheduled jobs

- CLI commands exist through npm scripts.
- Worker entrypoint exists.
- Scheduler locks exist through repository methods.
- Retry/reprocess commands exist as boundaries; repository-specific retry queue semantics still need Replit integration for production.

## Real public source testing

- No real FEI, national federation, event organiser, ranking provider, or public event file has been certified live end to end.
- Direct FEI page automation remains disabled and unsupported where automated access is blocked.

## Existing tests

- Entity resolver tests.
- Ingestion engine synthetic graph test.
- Import connector tests for CSV, `.xlsx`, JSON and XML.
- SSRF/security and reconciliation utility tests.
- HTTP API tests.
- End-to-end synthetic workflow test.
- PostgreSQL health-check test gated by `DATABASE_URL`.
- Package export test.

## What remains before Replit use

Before the package can be used as a Replit production service, it needs:

- Replit-specific ORM adaptation or direct use of the PostgreSQL adapter.
- Replit auth/role adapter.
- Data Operations Centre and Resolution Centre UI integration.
- Import History and Undo Imports production semantics.
- Real public-source certification per connector.
- Tenant isolation enforcement in the host application.
- Multipart upload middleware connection.

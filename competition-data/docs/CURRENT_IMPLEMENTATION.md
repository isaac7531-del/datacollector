# Current implementation audit

Audit date: 2026-07-17

This document reports the current state of `@equibets/competition-data` before the second implementation pass. It intentionally avoids describing scaffolding as a completed live integration.

## Fully functional connectors

- No real public-source connector has been tested end to end against a live public equestrian source.
- `createHttpJsonFeedConnector` can discover configured endpoints and fetch JSON/text/CSV payloads using the provided `HttpClient`, but it is a generic feed helper, not a complete competition-results importer by itself.
- A test-only connector exists inside `tests/ingestionEngine.test.ts` and returns an already-normalized graph.

## Interfaces or placeholders

- `CompetitionDataConnector` is a real interface with `discover` and `collect`, but it does not yet model all desired optional source capabilities.
- `CompetitionDataNormalizer` is a real interface.
- `createPassThroughGraphNormalizer` only works when the source already emits the package's `NormalizedCompetitionGraph`.
- Scheduling is represented by `CompetitionDataScheduler` and `InProcessCompetitionDataScheduler`, but there is no persistent lock or production queue integration yet.
- `migrations/001_competition_data_engine.sql` is a reference schema only and is not wired to a repository implementation.

## Import formats currently working

- Already-normalized JSON-shaped graph objects work through the pass-through normalizer.
- Generic endpoint fetch supports JSON, CSV text and plain text as raw payloads, but there are no CSV, Excel, JSON-schema, or XML source-neutral import normalizers yet.
- No direct FEI, national federation, Excel, XML, or public URL safety pipeline is fully implemented yet.

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
- The repository does not currently persist import runs, staged records, conflicts, versions, provenance records, connector health, scheduler locks, or event outbox records.

## In-memory-only areas

- All candidate lookup and canonical record application in tests/examples use `InMemoryCompetitionDataRepository`.
- No production database adapter is currently available.
- No transaction support exists yet.

## Persistent storage

- Persistent storage is not implemented.
- The SQL migration is a reference starting point and does not yet cover the full requested model.

## HTTP server

- A runnable Node `http` server factory exists in `src/adapters/httpServer.ts`.
- Existing endpoints:
  - `GET /health`
  - `GET /connectors`
  - `POST /discovery`
  - `POST /ingestion-runs`
  - `POST /manual-submissions`
- Missing endpoints include readiness, connector health/run/backfill/enable/disable, imports, staged records, resolution candidates, conflicts, canonical data access, result provenance, and result versions.
- Existing HTTP request validation, pagination, rate limiting, correlation IDs, structured logging, file-size limits, role authorization, and upload handling are minimal or absent.

## CLI, worker and scheduled jobs

- No runnable CLI exists yet.
- No worker entrypoint exists yet.
- Scheduling has an in-process interval scheduler only; it has no persistent lock or retry queue.

## Real public source testing

- No real FEI, national federation, event organiser, ranking provider, or public event file has been tested end to end.
- Direct FEI page automation is not implemented and must remain disabled where automated access is blocked.

## Existing tests

- `tests/entityResolver.test.ts`
  - verifies source identifier matching updates a record;
  - verifies low-confidence competition candidates create a new record.
- `tests/ingestionEngine.test.ts`
  - verifies a dry-run ingestion from a synthetic already-normalized connector.

## What remains before Replit use

Before the package can be used as a Replit production service, it needs:

- working CSV, Excel, JSON-schema, XML, public-file URL, and manual import connectors;
- source-neutral staging records and replay/reprocess support;
- persistent PostgreSQL repository implementation with transactions;
- connector capability metadata and health tracking;
- source authority, duplicate detection, conflict creation/resolution, version history, and field-level provenance;
- expanded HTTP API with request validation, correlation IDs, rate limiting, and auth/role adapter boundaries;
- CLI and worker entrypoints;
- scheduler locks and retry/reprocess flows;
- comprehensive synthetic fixtures and end-to-end demo;
- Replit export directory and validated ZIP archive;
- updated handoff/integration documentation that separates fully working, assisted, manual, and unsupported workflows.

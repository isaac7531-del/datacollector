# Live acquisition operations

The live acquisition layer adds source discovery and collection on top of the existing ingestion engine.

## Processes

- API process: receives data and exposes status.
- Discovery worker: discovers events and updates checkpoints.
- Collection worker: fetches server-accessible sources.
- Browser queue service: manages assisted FEI work.
- Processing worker: validates and normalises staged records.
- Resolution worker: handles high-confidence matches.
- Outbox worker: delivers downstream events.
- Provisional recheck worker: revisits incomplete results.
- Backfill worker: performs controlled historical ingestion.

## Commands

```bash
npm run source:list
npm run source:health
npm run source:discover -- --source rechenstelle
npm run source:discover -- --source british-eventing
npm run source:smoke -- --source rechenstelle
npm run backfill:plan -- --source rechenstelle --from 2024-01-01 --to 2025-12-31
npm run worker:discovery
npm run worker:collection
npm run worker:processing
npm run worker:provisional
npm run worker:backfill
```

## Completion warning

The acquisition network is not complete until acceptance targets in the Phase 4 brief are met against real events and persistent PostgreSQL.

## Admin UI/API contract

The main Replit UI should expose these concepts using existing API and repository adapters:

- Source dashboard: connector descriptors, acquisition mode, automation level, source health and limitations.
- Event acquisition: `SourceEventCheckpoint` records, discovered classes, current state, next check and source URL.
- Backfills: `BackfillPlan` records with create/start/pause/resume/cancel actions.
- Browser-assisted queue: queue item claim/complete/fail/challenge/retry state.
- Parser failures: source, parser version, raw record reference, error and retry action.

Current package status:

- CLI contracts exist for source list, health, discovery, smoke, collection and backfill planning.
- Repository contracts exist for checkpoints, health and backfill plans.
- Dedicated HTTP source/backfill endpoints are still to be wired into the Replit-facing API.

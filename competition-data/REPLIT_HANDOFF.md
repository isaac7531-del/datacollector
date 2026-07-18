# Replit handoff: Competition Data Engine

## What was built

`@equibets/competition-data` is a standalone production-oriented service package for EquiBets public competition data. It does not depend on EquiBets UI code.

It includes:

- clean public TypeScript API;
- runnable HTTP API;
- runnable CLI and worker;
- connector registry and capability metadata;
- CSV, `.xlsx`, JSON, XML, public URL, manual and FEI-assisted import connectors;
- configuration-driven national connector framework;
- staging, validation, normalization, identity resolution, duplicate fingerprinting, source authority, conflict records, reconciliation and provenance;
- PostgreSQL adapter and additive migrations;
- in-memory repository for tests/demos;
- scheduler lock service;
- versioned downstream events;
- synthetic eventing fixtures and demo.
- embedded PostgreSQL operational validation tests;
- transactional outbox worker;
- mapping profile CLI;
- seed command;
- rollback planning boundary.

## What is working

- Generic CSV result imports.
- Generic `.xlsx` result imports.
- Source-neutral JSON imports.
- Source-neutral XML imports.
- Safe public HTTP/HTTPS file URL imports for CSV, JSON, XML and `.xlsx`.
- Manual imports through the same pipeline.
- FEI assisted import from supplied public downloads/exports.
- PostgreSQL repository implementation, migrations and health-check test path.
- PostgreSQL migration, rollback, lock, idempotency and persistence tests using disposable embedded PostgreSQL.
- HTTP health/readiness/connectors/import/staging/resolution/conflict/manual/data boundaries.
- CLI commands and worker entrypoint.
- Outbox worker entrypoint.
- Synthetic end-to-end demo.

## Framework-only or integration-required

- Data Operations Centre UI.
- Resolution Centre UI.
- Import History and Undo Imports UI.
- Coverage Intelligence, Entity Health Scores, EBI and downstream recalculation handlers.
- Production tenant isolation and auth/role mapping.
- Real federation-specific source certification.
- Repository-specific undo import semantics.

## Live connectors

No real FEI, national federation or event-provider connector is certified live against a real public source in this repository. The working connectors are generic file/import connectors and synthetic national configurations.

## FEI workflows

Supported:

- public FEI downloads where provided;
- user-uploaded FEI exports;
- administrator-assisted imports;
- direct public file URLs where accessible and permitted;
- preservation of FEI IDs/source URLs in imported files.

Not supportable:

- DataDome bypassing;
- CAPTCHA solving;
- proxy rotation for blocked access;
- browser fingerprint spoofing;
- stealth scraping;
- direct automation of FEI pages that block server access.

## Required Node version

Use Node 22 or later.

## Installation

Preferred:

```bash
cp -R competition-data ../equibets-replit/packages/competition-data
```

Alternative:

```bash
cd competition-data
npm pack
npm install ./equibets-competition-data-0.1.0.tgz
```

## Environment variables

Copy `.env.example` and configure:

- `DATABASE_URL`
- `PORT`
- `HOST`
- `COMPETITION_DATA_ENGINE_API_KEY`
- connector enablement variables
- public URL/file limits
- retry and cache settings
- raw payload retention

## PostgreSQL setup

```bash
psql "$DATABASE_URL" -f migrations/001_competition_data_engine.sql
psql "$DATABASE_URL" -f migrations/002_postgres_engine_storage.sql
```

Rollback for migration 002:

```bash
psql "$DATABASE_URL" -f migrations/002_postgres_engine_storage.rollback.sql
```

## Commands

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run start
npm run worker
npm run worker:outbox
npm run demo
npm run connector:list
npm run connector:health
npm run seed
npm run migrate
npm run migrate:rollback
npm run test:postgres
npm run test:consumer
npm run mapping:inspect -- --path ./tests/fixtures/eventing-results.csv
npm run mapping:test -- --path ./tests/fixtures/eventing-results.csv --profile ./examples/mapping-profile.eventing-csv.json
npm run import:file -- --path ./tests/fixtures/eventing-results.csv --connector generic-csv
npm run import:url -- --url https://example.org/results.csv --connector public-file
```

## API

See `docs/API.md`.

## Connectors

See `docs/CONNECTORS.md`.

## Database adapter integration

Use `createPostgresRepositories` or implement `CompetitionDataRepository` with the existing Replit ORM. Keep SQL/ORM logic outside domain services.

## Authentication integration

Implement `AuthAdapter` to connect existing EquiBets auth and role checks. Do not hard-code main app auth into this package.

## Resolution Centre integration

Connect:

- `listResolutionCandidates`
- `getResolutionCandidate`
- confirm/reject endpoints
- conflicts endpoints

## Coverage Intelligence, EBI and Stable Manager

Use emitted events to trigger targeted idempotent recalculation for:

- EBI horse profiles;
- rider profiles;
- combination profiles;
- competition pages;
- predictions;
- rankings;
- horse timelines;
- Coverage Intelligence;
- Entity Health Scores;
- Stable Manager notifications.

Public imports must never overwrite private Stable Manager data: notes, health records, treatments, attachments, private training records, nutrition records or owner communication.

## Known limitations

- No real public source has been certified live end to end from this checkout.
- Legacy `.xls` is supportable only after Replit selects and approves a safe parser.
- Multipart uploads should be connected through Replit's existing upload middleware.
- PostgreSQL tests require `DATABASE_URL`.
- Direct blocked-source automation is intentionally unsupported.

## Supportable after Replit integration

- Replit-specific auth, tenant and UI integration through the documented adapter contracts.
- Certified live national federation and event-provider connectors after source approval, mapping and end-to-end validation.

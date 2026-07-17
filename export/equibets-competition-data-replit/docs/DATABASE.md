# Database and storage

## Production adapter

`createPostgresRepositories` creates a PostgreSQL-backed implementation of `CompetitionDataRepository`.

It persists:

- canonical records;
- import runs;
- staged records;
- conflicts;
- resolution candidates;
- result versions;
- connector health;
- scheduler locks;
- event outbox records.

The adapter uses JSONB payload columns plus indexes for common lookup fields. This keeps the service independent from the main EquiBets ORM.

## Migrations

Run:

```bash
psql "$DATABASE_URL" -f migrations/001_competition_data_engine.sql
psql "$DATABASE_URL" -f migrations/002_postgres_engine_storage.sql
```

Rollback for migration 002:

```bash
psql "$DATABASE_URL" -f migrations/002_postgres_engine_storage.rollback.sql
```

Review production data before rollback.

## Replit ORM integration

If the main EquiBets app uses Prisma, Drizzle, Kysely or another ORM:

1. Keep `CompetitionDataRepository` as the service boundary.
2. Implement the repository methods using the existing ORM.
3. Preserve transaction behavior for `applyReconciliationPlan`.
4. Store staged records, import runs, conflicts, result versions and provenance even if canonical competition models already exist.
5. Do not allow public imports to overwrite private Stable Manager fields.

## PostgreSQL tests

`npm run test:postgres` runs a health-check test when `DATABASE_URL` is set. Without `DATABASE_URL`, the test documents that database setup is required and passes as a skipped-environment check.

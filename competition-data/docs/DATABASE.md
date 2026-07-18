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
npm run migrate
```

Rollback additive storage/operational migrations:

```bash
npm run migrate:rollback
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

`npm run test:postgres` starts a disposable embedded PostgreSQL server when `DATABASE_URL` is not set. When `DATABASE_URL` is set, use it to test the target database.

The test suite covers:

- forward migrations;
- table/index verification;
- repository health;
- full import/stage/reconcile/persist/API query flow;
- transaction rollback;
- scheduler locks;
- idempotent reruns;
- rollback migration and reapply in a separate disposable database.

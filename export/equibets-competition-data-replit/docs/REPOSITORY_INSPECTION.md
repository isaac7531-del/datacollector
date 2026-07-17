# Repository inspection

This package was created after inspecting the checked-out repository root.

## Findings

1. **Current language and framework**
   - No application source files were present in this checkout.
   - The only non-Git file was `README.md`, containing `# datacollector`.
   - No framework could be identified from the repository contents.

2. **Package manager and workspace structure**
   - No `package.json`, lockfile, `pnpm-workspace.yaml`, `yarn.lock`, `package-lock.json`, `pyproject.toml`, or equivalent project manifest was present.
   - A new self-contained TypeScript package was added under `competition-data/`.

3. **Existing database and ORM**
   - No database schema, migration files, or ORM configuration were present.
   - The engine therefore exposes a `CompetitionDataRepository` port instead of depending on Prisma, Drizzle, Sequelize, TypeORM, Mongoose, SQL, or any other persistence layer.

4. **Existing import framework**
   - No existing import framework was present.
   - The engine provides connector, normalizer, validation, reconciliation, and provenance interfaces that Replit can adapt to any existing importer.

5. **Existing Data Operations Centre**
   - No Data Operations Centre code was present.
   - Review outcomes are represented as reconciliation plans with `review` actions so an external operations centre can display and resolve them.

6. **Existing entity-resolution logic**
   - No existing resolution logic was present.
   - The engine includes deterministic resolution that matches external identifiers first, then conservative name/date/country signals.

7. **Existing competition, event, horse, rider and result models**
   - No model files were present.
   - Portable domain interfaces were added in `src/domain/types.ts` for competitions, events, horses, riders, results, entries, rankings, provenance, and manual submissions.

8. **Existing queues, scheduled jobs and background workers**
   - No queue, worker, cron, or scheduler code was present.
   - The engine includes scheduler interfaces and an in-process scheduler. Production deployments can replace this with Replit jobs, BullMQ, Cloud Tasks, cron, or another queue.

9. **Existing test structure**
   - No tests were present.
   - The package uses Vitest under `competition-data/tests/`.

10. **Existing environment-variable patterns**
    - No `.env` files or env-loading code were present.
    - The package uses explicit `EQUIBETS_COMPETITION_DATA_*` variables and includes `.env.example`.

## Consequence

Because no existing EquiBets application code was present, this implementation does not attempt to reuse app-specific UI, database models, workers, or import utilities. Instead, it provides production-oriented service boundaries that the main EquiBets Replit application can connect to its existing systems.

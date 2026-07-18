import { once } from "events";
import { readFileSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import { Pool } from "pg";
import { describe, expect, it } from "vitest";
import {
  CompetitionDataEngine,
  SchedulerLockService,
  createCompetitionDataApiServer,
  createCsvResultsConnector,
  createPostgresRepositories,
  syntheticNationalCsvConfiguration
} from "../../src";
import { applyMigrations, startEmbeddedPostgres } from "./postgresHarness";

describe("PostgreSQL operational validation", () => {
  it("applies migrations, verifies tables/indexes, persists pipeline data, survives restart, and exposes API reads", async () => {
    const harness = await startEmbeddedPostgres("pg-operational", 55434);
    await applyMigrations(harness.databaseUrl);
    const repository = createPostgresRepositories({ connectionString: harness.databaseUrl });
    try {
      const tables = await repository.listTableNames();
      expect(tables).toEqual(expect.arrayContaining([
        "competition_data_canonical_records",
        "competition_data_import_runs",
        "competition_data_staged_records",
        "competition_data_event_outbox",
        "competition_data_scheduler_locks",
        "competition_data_configuration",
        "competition_data_mapping_profiles",
        "competition_data_source_event_checkpoints",
        "competition_data_backfill_plans",
        "competition_data_source_health"
      ]));
      expect(await repository.listIndexNames()).toEqual(expect.arrayContaining([
        "idx_competition_data_canonical_external_ids",
        "idx_competition_data_event_outbox_status_next"
      ]));

      const engine = new CompetitionDataEngine({
        repository,
        connectors: [createOperationalCsvConnector()]
      });
      const summary = await engine.runConnector("pg-synthetic-csv", { importBatchId: "pg-import-1" });
      expect(summary.created).toBeGreaterThan(0);
      expect((await repository.listImportRuns()).length).toBe(1);
      expect((await repository.listStagedRecords()).length).toBe(1);
      expect((await repository.listCanonicalRecords("horse")).length).toBeGreaterThan(0);
      expect((await repository.listCanonicalRecords("rider")).length).toBeGreaterThan(0);
      expect((await repository.listCanonicalRecords("event")).length).toBeGreaterThan(0);
      expect((await repository.listCanonicalRecords("entry")).length).toBeGreaterThan(0);
      expect((await repository.listCanonicalRecords("result")).length).toBeGreaterThan(0);
      expect((await repository.listEvents()).length).toBeGreaterThan(0);

      await repository.saveResultVersion({
        id: "version-pg-1",
        canonicalResultId: "result-pg-1",
        sourceReference: {
          source: source(),
          importedAt: new Date().toISOString()
        },
        resultFingerprint: "fingerprint",
        publicationStatus: "provisional",
        verificationState: "unverified",
        result: { id: "result-pg-1" },
        fieldProvenance: [],
        createdAt: new Date().toISOString()
      });
      await repository.saveConflict({
        id: "conflict-pg-1",
        entityType: "result",
        fieldPath: "score",
        incomingValue: 1,
        existingValue: 2,
        sourceReferences: [],
        material: true,
        status: "open",
        createdAt: new Date().toISOString()
      });
      await repository.saveResolutionCandidate({
        id: "resolution-pg-1",
        entityType: "horse",
        incoming: {},
        candidates: [],
        recommendedAction: "review",
        confidenceScore: 0.6,
        status: "pending",
        createdAt: new Date().toISOString()
      });
      await repository.saveConnectorHealth({ connectorId: "pg-synthetic-csv", status: "healthy", checkedAt: new Date().toISOString(), consecutiveFailures: 0 });
      expect(await repository.getConnectorHealth("pg-synthetic-csv")).toBeTruthy();
      expect(await repository.listResultVersions("result-pg-1")).toHaveLength(1);
      expect(await repository.listConflicts()).toHaveLength(1);
      expect(await repository.listResolutionCandidates()).toHaveLength(1);

      const restartedRepository = createPostgresRepositories({ connectionString: harness.databaseUrl });
      try {
        expect((await restartedRepository.listCanonicalRecords("result")).length).toBeGreaterThan(0);
        const restartedEngine = new CompetitionDataEngine({ repository: restartedRepository });
        const server = createCompetitionDataApiServer({
          engine: restartedEngine,
          repository: restartedRepository,
          auth: { authenticate: async () => ({ id: "test", roles: ["competition-data-admin"] }), authorize: async () => true },
          exposeMetricsWithoutAuth: true
        });
        server.listen(0, "127.0.0.1");
        await once(server, "listening");
        const address = server.address();
        if (!address || typeof address === "string") throw new Error("No server address");
        const results = await fetch(`http://127.0.0.1:${address.port}/results`).then((response) => response.json());
        const metrics = await fetch(`http://127.0.0.1:${address.port}/metrics`).then((response) => response.text());
        server.close();
        expect(results.items.length).toBeGreaterThan(0);
        expect(metrics).toContain("competition_data_import_runs_total");
      } finally {
        await restartedRepository.pool.end();
      }
    } finally {
      await repository.pool.end();
      await harness.stop();
    }
  }, 30_000);

  it("rolls back failed transactions, enforces scheduler locks, and supports idempotent reruns", async () => {
    const harness = await startEmbeddedPostgres("pg-transactions", 55435);
    await applyMigrations(harness.databaseUrl);
    const repository = createPostgresRepositories({ connectionString: harness.databaseUrl });
    try {
      await expect(repository.transaction(async (client) => {
        await client.query("INSERT INTO competition_data_configuration (id, payload) VALUES ('rollback-test', '{}')");
        throw new Error("force rollback");
      })).rejects.toThrow("force rollback");
      expect(await repository.getConfiguration("rollback-test")).toBeUndefined();

      const locks = new SchedulerLockService(repository);
      const results = await Promise.all([
        locks.withLock("same-scope", 30_000, async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return "first";
        }),
        locks.withLock("same-scope", 30_000, async () => "second")
      ]);
      expect(results.filter(Boolean)).toHaveLength(1);

      const engine = new CompetitionDataEngine({ repository, connectors: [createOperationalCsvConnector()] });
      await engine.runConnector("pg-synthetic-csv", { importBatchId: "idempotent-run" });
      await engine.runConnector("pg-synthetic-csv", { importBatchId: "idempotent-run" });
      expect((await repository.listImportRuns()).filter((run) => run.id === "idempotent-run")).toHaveLength(1);
      expect((await repository.listStagedRecords({ importRunId: "idempotent-run" }))).toHaveLength(1);
    } finally {
      await repository.pool.end();
      await harness.stop();
    }
  }, 30_000);

  it("runs rollback migrations in a separate disposable database and reapplies forward migrations", async () => {
    const harness = await startEmbeddedPostgres("pg-migration-rollback", 55436);
    const pool = new Pool({ connectionString: harness.databaseUrl });
    try {
      await applyMigrations(harness.databaseUrl);
      for (const migration of ["004_live_acquisition.rollback.sql", "003_operational_readiness.rollback.sql", "002_postgres_engine_storage.rollback.sql"]) {
        await pool.query(await readFile(join(process.cwd(), "migrations", migration), "utf8"));
      }
      await applyMigrations(harness.databaseUrl, ["002_postgres_engine_storage.sql", "003_operational_readiness.sql", "004_live_acquisition.sql"]);
      const repository = createPostgresRepositories({ connectionString: harness.databaseUrl });
      expect(await repository.listTableNames()).toEqual(expect.arrayContaining(["competition_data_canonical_records", "competition_data_configuration"]));
      await repository.pool.end();
    } finally {
      await pool.end();
      await harness.stop();
    }
  }, 30_000);
});

function createOperationalCsvConnector() {
  return createCsvResultsConnector({
    id: "pg-synthetic-csv",
    enabled: true,
    source: source(),
    csvText: readFileSync(join(process.cwd(), "tests/fixtures/eventing-results.csv"), "utf8"),
    mapping: syntheticNationalCsvConfiguration.resultMappings ?? {}
  });
}

function source() {
  return {
    id: "pg-synthetic",
    name: "PostgreSQL Synthetic Source",
    kind: "national_federation" as const,
    mode: "official_export" as const,
    countryCode: "AU",
    official: true
  };
}

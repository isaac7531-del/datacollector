import { describe, expect, it } from "vitest";
import { createPostgresRepositories } from "../../src";
import { applyMigrations, startEmbeddedPostgres } from "./postgresHarness";

const databaseUrl = process.env.DATABASE_URL;

describe("PostgresCompetitionDataRepository", () => {
  it("connects and runs a health check", async () => {
    const harness = databaseUrl ? undefined : await startEmbeddedPostgres("pg-health", 55433);
    const url = databaseUrl ?? harness?.databaseUrl;
    if (!url) throw new Error("DATABASE_URL or embedded PostgreSQL is required.");
    await applyMigrations(url);
    const repository = createPostgresRepositories({ connectionString: url });
    try {
      await expect(repository.healthCheck()).resolves.toBeUndefined();
    } finally {
      await repository.pool.end();
      await harness?.stop();
    }
  });
});

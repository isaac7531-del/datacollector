import { describe, expect, it } from "vitest";
import { createPostgresRepositories } from "../../src";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("PostgresCompetitionDataRepository", () => {
  it("connects and runs a health check", async () => {
    const repository = createPostgresRepositories({ connectionString: databaseUrl });
    await expect(repository.healthCheck()).resolves.toBeUndefined();
    await repository.pool.end();
  });
});

describe.skipIf(!!databaseUrl)("PostgresCompetitionDataRepository setup", () => {
  it("documents that DATABASE_URL is required", () => {
    expect(databaseUrl).toBeUndefined();
  });
});

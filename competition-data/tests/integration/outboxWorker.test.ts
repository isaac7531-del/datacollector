import { describe, expect, it } from "vitest";
import { createCompetitionDataEvent, createPostgresRepositories, runOutboxWorker } from "../../src";
import { applyMigrations, startEmbeddedPostgres } from "./postgresHarness";

describe("transactional outbox worker", () => {
  it("delivers pending events and marks failures for retry/dead-letter", async () => {
    const harness = await startEmbeddedPostgres("pg-outbox", 55437);
    await applyMigrations(harness.databaseUrl);
    const repository = createPostgresRepositories({ connectionString: harness.databaseUrl });
    const previous = process.env.DATABASE_URL;
    process.env.DATABASE_URL = harness.databaseUrl;
    try {
      await repository.appendEvent(createCompetitionDataEvent("competitionData.import.completed", { ok: true }, "outbox-test"));
      const delivered: string[] = [];
      await runOutboxWorker({
        once: true,
        publisher: {
          publish: async (event) => {
            delivered.push(event.id);
          }
        }
      });
      expect(delivered).toHaveLength(1);
      expect(await repository.listOutboxEvents("delivered")).toHaveLength(1);

      await repository.appendEvent(createCompetitionDataEvent("competitionData.import.failed", { ok: false }, "outbox-test"));
      await runOutboxWorker({
        once: true,
        maxAttempts: 1,
        publisher: {
          publish: async () => {
            throw new Error("temporary failure");
          }
        }
      });
      expect(await repository.listOutboxEvents("dead_letter")).toHaveLength(1);
    } finally {
      process.env.DATABASE_URL = previous;
      await repository.pool.end();
      await harness.stop();
    }
  }, 30_000);
});

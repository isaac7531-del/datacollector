import { once } from "events";
import { readFileSync } from "fs";
import { join } from "path";
import {
  CompetitionDataEngine,
  createCompetitionDataApiServer,
  createCsvResultsConnector,
  createPostgresRepositories,
  syntheticNationalCsvConfiguration
} from "../../src";
import { seed } from "../../src/cli/seed";
import { applyMigrations, startEmbeddedPostgres } from "../integration/postgresHarness";

async function run(): Promise<void> {
  const harness = await startEmbeddedPostgres("consumer-integration", 55438);
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = harness.databaseUrl;
  await applyMigrations(harness.databaseUrl);
  await seed();
  const repository = createPostgresRepositories({ connectionString: harness.databaseUrl });
  try {
    const source = {
      id: "consumer-source",
      name: "Consumer Source",
      kind: "national_federation" as const,
      mode: "official_export" as const,
      countryCode: "AU",
      official: true
    };
    const engine = new CompetitionDataEngine({
      repository,
      connectors: [
        createCsvResultsConnector({
          id: "consumer-csv",
          enabled: true,
          source,
          csvText: readFileSync(join(process.cwd(), "tests/fixtures/eventing-results.csv"), "utf8"),
          mapping: syntheticNationalCsvConfiguration.resultMappings ?? {}
        })
      ]
    });
    await engine.runConnector("consumer-csv", { importBatchId: "consumer-import" });
    const server = createCompetitionDataApiServer({
      engine,
      repository,
      auth: { authenticate: async () => ({ id: "consumer", roles: ["competition-data-admin"] }), authorize: async () => true },
      exposeMetricsWithoutAuth: true
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No server address");
    const results = await fetch(`http://127.0.0.1:${address.port}/results`).then((response) => response.json());
    server.close();
    if (!results.items?.length) {
      throw new Error("Consumer integration did not return persisted results.");
    }
    if (!(await repository.listEvents()).length) {
      throw new Error("Consumer integration did not record events.");
    }
    console.log(JSON.stringify({ consumerIntegration: "passed", results: results.items.length }));
  } finally {
    await repository.pool.end();
    process.env.DATABASE_URL = previous;
    await harness.stop();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

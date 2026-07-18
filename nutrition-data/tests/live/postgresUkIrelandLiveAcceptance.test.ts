import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import EmbeddedPostgres from "embedded-postgres";
import {
  createLiveManufacturerConnectors,
  createNutritionDataEngine,
  launchManufacturerSourceConfigs,
  PostgresNutritionDataRepository,
  PostgresNutritionEventPublisher,
  UK_IRELAND_ACCEPTANCE_MANUFACTURERS
} from "../../src";

const runLivePostgres = process.env.NUTRITION_LIVE_POSTGRES === "1";
const port = 55632 + Number(process.env.VITEST_POOL_ID ?? 0);
const databaseDir = mkdtempSync(join(tmpdir(), "nutrition-live-uk-pg-"));
const pg = new EmbeddedPostgres({
  databaseDir,
  port,
  user: "postgres",
  password: "password",
  persistent: true,
  onLog: () => undefined,
  onError: () => undefined
});

let pool: Pool;

describe.skipIf(!runLivePostgres)("PostgreSQL live UK/Ireland acceptance", () => {
  beforeAll(async () => {
    await pg.initialise();
    await pg.start();
    pool = createPool();
    await applyMigrations(pool);
  }, 60_000);

  afterAll(async () => {
    await pool?.end();
    await pg.stop();
    rmSync(databaseDir, { recursive: true, force: true });
  }, 30_000);

  it("persists live UK/Ireland connector imports and survives restart", async () => {
    const repository = new PostgresNutritionDataRepository(pool);
    const connectors = createLiveManufacturerConnectors(launchManufacturerSourceConfigs.filter((config) => (UK_IRELAND_ACCEPTANCE_MANUFACTURERS as readonly string[]).includes(config.id)));
    const engine = createNutritionDataEngine({ repository, connectors, eventPublisher: new PostgresNutritionEventPublisher(pool) });

    const summaries = [];
    for (const connector of connectors) {
      summaries.push(await engine.runConnector(connector.descriptor.id));
    }

    const created = summaries.reduce((sum, summary) => sum + summary.productsCreated, 0);
    expect(created).toBeGreaterThanOrEqual(25);

    await pool.end();
    await pg.stop();
    await pg.start();
    pool = createPool();
    const restarted = new PostgresNutritionDataRepository(pool);
    const persistedProducts = await restarted.listProducts({ includeDiscontinued: true });
    expect(persistedProducts.length).toBeGreaterThanOrEqual(25);

    const readyCandidates = [];
    for (const id of UK_IRELAND_ACCEPTANCE_MANUFACTURERS) {
      const products = await restarted.listProducts({ manufacturerId: id, includeDiscontinued: true });
      if (products.length > 0) readyCandidates.push(id);
      for (const product of products) expect((await restarted.listProductVersions(product.id)).length).toBeGreaterThanOrEqual(1);
    }
    expect(readyCandidates.length).toBeGreaterThanOrEqual(3);
  }, 300_000);
});

function createPool(): Pool {
  return new Pool({ host: "127.0.0.1", port, user: "postgres", password: "password", database: "postgres" });
}

async function applyMigrations(pool: Pool): Promise<void> {
  for (const file of ["001_nutrition_data_engine.sql", "002_operational_live_data.sql", "003_operational_acceptance_constraints.sql"]) {
    await pool.query(readFileSync(join(process.cwd(), "migrations", file), "utf8"));
  }
}

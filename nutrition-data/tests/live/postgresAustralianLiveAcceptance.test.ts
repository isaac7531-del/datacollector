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
  PostgresNutritionEventPublisher
} from "../../src";

const runLivePostgres = process.env.NUTRITION_LIVE_POSTGRES === "1";
const australianIds = ["mitavite-au", "hygain-au", "prydes-au", "barastoc-au", "coprice-au"];
const port = 55532 + Number(process.env.VITEST_POOL_ID ?? 0);
const databaseDir = mkdtempSync(join(tmpdir(), "nutrition-live-pg-"));
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

describe.skipIf(!runLivePostgres)("PostgreSQL live Australian acceptance", () => {
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

  it("persists live Australian connector imports and survives restart", async () => {
    const repository = new PostgresNutritionDataRepository(pool);
    const connectors = createLiveManufacturerConnectors(launchManufacturerSourceConfigs.filter((config) => australianIds.includes(config.id)));
    const engine = createNutritionDataEngine({ repository, connectors, eventPublisher: new PostgresNutritionEventPublisher(pool) });

    const summaries = [];
    for (const connector of connectors) {
      summaries.push(await engine.runConnector(connector.descriptor.id));
    }

    expect(summaries.reduce((sum, summary) => sum + summary.productsCreated, 0)).toBeGreaterThanOrEqual(60);
    expect(await repository.listProducts({ country: "AU", includeDiscontinued: true })).toHaveLength(summaries.reduce((sum, summary) => sum + summary.productsCreated, 0));

    await pool.end();
    await pg.stop();
    await pg.start();
    pool = createPool();
    const restarted = new PostgresNutritionDataRepository(pool);

    const persistedProducts = await restarted.listProducts({ country: "AU", includeDiscontinued: true });
    expect(persistedProducts.length).toBeGreaterThanOrEqual(60);
    for (const id of australianIds) {
      expect((await restarted.listProducts({ manufacturerId: id, includeDiscontinued: true })).length, id).toBeGreaterThan(0);
    }
    const versionCounts = await Promise.all(persistedProducts.map((product) => restarted.listProductVersions(product.id)));
    expect(versionCounts.every((versions) => versions.length >= 1)).toBe(true);
  }, 240_000);
});

function createPool(): Pool {
  return new Pool({ host: "127.0.0.1", port, user: "postgres", password: "password", database: "postgres" });
}

async function applyMigrations(pool: Pool): Promise<void> {
  for (const file of ["001_nutrition_data_engine.sql", "002_operational_live_data.sql", "003_operational_acceptance_constraints.sql"]) {
    await pool.query(readFileSync(join(process.cwd(), "migrations", file), "utf8"));
  }
}

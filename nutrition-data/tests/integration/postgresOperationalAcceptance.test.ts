import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import EmbeddedPostgres from "embedded-postgres";
import {
  createManualConnector,
  createNutritionDataEngine,
  PostgresNutritionDataRepository,
  PostgresNutritionEventPublisher
} from "../../src";
import { defaultManufacturers, defaultNutritionPayload } from "../../src/config/defaultSeed";
import type { FeedProduct, Manufacturer, NormalizedNutritionPayload } from "../../src/domain/types";

const port = 55432 + Number(process.env.VITEST_POOL_ID ?? 0);
const databaseDir = mkdtempSync(join(tmpdir(), "nutrition-pg-"));
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

describe("PostgreSQL operational acceptance", () => {
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

  it("persists Australian imports, operational records, events, and survives restart without duplicates", async () => {
    const repository = new PostgresNutritionDataRepository(pool);
    const eventPublisher = new PostgresNutritionEventPublisher(pool);
    const { manufacturer, payload } = fixturePayload("mitavite-au");
    const connector = createManualConnector({ manufacturer, payload, id: "mitavite-au" });
    const engine = createNutritionDataEngine({ repository, connectors: [connector], eventPublisher });

    const first = await engine.runConnector("mitavite-au");
    const second = await engine.runConnector("mitavite-au");

    expect(first.productsCreated).toBe(payload.products.length);
    expect(second.productsCreated).toBe(0);
    expect(second.productsUpdated).toBe(payload.products.length);

    const product = payload.products[0];
    await repository.savePriceObservation?.({
      productId: product.id,
      amount: 42.95,
      currency: "AUD",
      packageSize: "20kg",
      retailer: "Example Rural",
      country: "AU",
      promotional: false,
      capturedAt: "2026-01-01T00:00:00.000Z",
      taxIncluded: true,
      deliveryExcluded: true,
      confidence: "medium",
      sourceUrl: "https://example.test/price"
    });
    await repository.savePriceObservation?.({
      productId: product.id,
      amount: 42.95,
      currency: "AUD",
      packageSize: "20kg",
      retailer: "Example Rural",
      country: "AU",
      promotional: false,
      capturedAt: "2026-01-01T00:00:00.000Z",
      taxIncluded: true,
      deliveryExcluded: true,
      confidence: "medium",
      sourceUrl: "https://example.test/price"
    });
    await repository.saveDistributorStockist?.({
      id: "example-rural-au",
      name: "Example Rural",
      type: "retailer",
      country: "AU",
      region: "NSW",
      deliveryAreas: ["NSW"],
      online: true,
      physical: false,
      manufacturerIds: ["mitavite-au"],
      sourceUrl: "https://example.test/retailer",
      lastVerifiedAt: "2026-01-01T00:00:00.000Z",
      confidence: "medium"
    });
    await repository.saveProductDocument?.({
      id: "doc-1",
      productIds: [product.id],
      url: "https://example.test/doc.pdf",
      checksum: "abc",
      capturedAt: "2026-01-01T00:00:00.000Z",
      parserVersion: "test",
      extractionMethod: "embedded_text",
      confidence: "medium",
      textExcerpt: "analysis"
    });
    await repository.saveProductVariant?.({
      productId: product.id,
      canonicalProductId: product.id,
      country: "AU",
      formulationRegion: "NSW",
      differsFromCanonical: false
    });
    await repository.saveProductRelationship?.({
      sourceProductId: product.id,
      targetProductId: payload.products[1].id,
      type: "comparable_to",
      confidence: "medium"
    });
    await repository.saveOperationalIssue?.({
      id: "issue-1",
      type: "stale_availability",
      severity: "warning",
      targetId: product.id,
      message: "example",
      createdAt: "2026-01-01T00:00:00.000Z"
    });
    await repository.saveOperationalRun?.({
      id: "run-1",
      worker: "products",
      status: "succeeded",
      startedAt: "2026-01-01T00:00:00.000Z",
      finishedAt: "2026-01-01T00:01:00.000Z",
      summary: { products: payload.products.length }
    });
    await repository.enqueueOperationalJob?.({
      id: "job-1",
      type: "product_refresh",
      targetId: product.id,
      runAfter: "2026-01-02T00:00:00.000Z",
      attempts: 0
    });
    expect(await repository.acquireLock?.("acceptance", 10_000)).toBe(true);
    expect(await repository.acquireLock?.("acceptance", 10_000)).toBe(false);
    await repository.releaseLock?.("acceptance");
    await repository.setCheckpoint?.("acceptance", "complete");

    await pool.end();
    await pg.stop();
    await pg.start();
    pool = createPool();
    const restarted = new PostgresNutritionDataRepository(pool);

    expect(await restarted.listProducts({ manufacturerId: "mitavite-au", includeDiscontinued: true })).toHaveLength(payload.products.length);
    expect(await restarted.listProductVersions(product.id)).toHaveLength(1);
    expect(await restarted.listPriceObservations?.({ productId: product.id })).toHaveLength(1);
    expect(await restarted.listAvailabilityEvidence?.({ productId: product.id, country: "AU" })).toHaveLength(1);
    expect(await restarted.listDistributorStockists?.({ country: "AU", manufacturerId: "mitavite-au" })).toHaveLength(1);
    expect(await restarted.listProductDocuments?.(product.id)).toHaveLength(1);
    expect(await restarted.listProductVariants?.(product.id)).toHaveLength(1);
    expect(await restarted.listProductRelationships?.(product.id)).toHaveLength(1);
    expect(await restarted.listOperationalIssues?.({ unresolvedOnly: true })).toHaveLength(1);
    expect(await restarted.listOperationalRuns?.({ worker: "products" })).toHaveLength(1);
    expect(await restarted.listOperationalJobs?.({ type: "product_refresh" })).toHaveLength(1);
    expect(await restarted.getCheckpoint?.("acceptance")).toBe("complete");

    const events = await pool.query(`SELECT type FROM nutrition_data.events ORDER BY occurred_at, type`);
    expect(events.rows.map((row) => row.type)).toContain("nutrition.product.discovered");
    expect(events.rows.map((row) => row.type)).toContain("nutrition.product.updated");
    const replayPublisher = new PostgresNutritionEventPublisher(pool);
    await replayPublisher.publish({ type: "nutrition.price.observed", occurredAt: "2026-01-01T00:00:00.000Z", price: (await restarted.listPriceObservations?.({ productId: product.id }))![0] });
    await replayPublisher.publish({ type: "nutrition.price.observed", occurredAt: "2026-01-01T00:00:00.000Z", price: (await restarted.listPriceObservations?.({ productId: product.id }))![0] });
    await replayPublisher.publish({ type: "nutrition.product.replaced", occurredAt: "2026-01-02T00:00:00.000Z", product, replacedByProductId: payload.products[1].id });
    await replayPublisher.publish({ type: "nutrition.product.discontinued", occurredAt: "2026-01-03T00:00:00.000Z", product });
    const priceEvents = await pool.query(`SELECT type FROM nutrition_data.events WHERE type = 'nutrition.price.observed'`);
    expect(priceEvents.rows).toHaveLength(1);

    const changedPayload = mutateFirstNutrient(payload);
    const changedConnector = createManualConnector({ manufacturer, payload: changedPayload, id: "mitavite-au" });
    const changedEngine = createNutritionDataEngine({ repository: restarted, connectors: [changedConnector], eventPublisher: new PostgresNutritionEventPublisher(pool) });
    const changedSummary = await changedEngine.runConnector("mitavite-au");
    expect(changedSummary.formulationsChanged).toBe(1);
    expect(await restarted.listProductVersions(product.id)).toHaveLength(2);
    const changedEvents = await pool.query(`SELECT type FROM nutrition_data.events`);
    expect(changedEvents.rows.map((row) => row.type)).toEqual(expect.arrayContaining(["nutrition.formulation.changed", "nutrition.product.replaced", "nutrition.product.discontinued", "nutrition.price.observed"]));
  }, 90_000);
});

function createPool(): Pool {
  return new Pool({ host: "127.0.0.1", port, user: "postgres", password: "password", database: "postgres" });
}

async function applyMigrations(pool: Pool): Promise<void> {
  for (const file of ["001_nutrition_data_engine.sql", "002_operational_live_data.sql", "003_operational_acceptance_constraints.sql"]) {
    await pool.query(readFileSync(join(process.cwd(), "migrations", file), "utf8"));
  }
}

function fixturePayload(manufacturerId: string): { manufacturer: Manufacturer; payload: NormalizedNutritionPayload } {
  const manufacturer = { ...defaultManufacturers[0], id: manufacturerId, name: "Mitavite" };
  return {
    manufacturer,
    payload: {
      ...defaultNutritionPayload,
      manufacturers: [manufacturer],
      products: defaultNutritionPayload.products.map((product) => ({
        ...product,
        manufacturerId,
        manufacturerName: "Mitavite",
        availability: {
          ...product.availability,
          countries: ["AU"],
          lastVerifiedAt: "2026-01-01T00:00:00.000Z"
        },
        metadata: {
          ...product.metadata,
          availabilityEvidence: [{
            productId: product.id,
            country: "AU",
            evidenceType: "officially_marketed",
            sourceUrl: product.sourceUrls[0],
            verifiedAt: "2026-01-01T00:00:00.000Z",
            confidence: "medium"
          }]
        }
      }))
    }
  };
}

function mutateFirstNutrient(payload: NormalizedNutritionPayload): NormalizedNutritionPayload {
  const products = payload.products.map((product, index): FeedProduct => {
    if (index !== 0) return product;
    return {
      ...product,
      nutrients: {
        ...product.nutrients,
        crude_protein: {
          ...product.nutrients.crude_protein,
          value: product.nutrients.crude_protein.value + 1
        }
      },
      lastUpdatedAt: "2026-02-01T00:00:00.000Z"
    };
  });
  return { ...payload, products };
}

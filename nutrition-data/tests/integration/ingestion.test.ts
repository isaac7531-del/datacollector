import { describe, expect, it } from "vitest";
import { createManualConnector, createNutritionDataEngine, InMemoryEventPublisher, InMemoryNutritionDataRepository } from "../../src";
import { defaultManufacturers, defaultNutritionPayload } from "../../src/config/defaultSeed";

describe("nutrition ingestion", () => {
  it("imports manufacturers and products and emits update events", async () => {
    const repository = new InMemoryNutritionDataRepository();
    const events = new InMemoryEventPublisher();
    const connector = createManualConnector({
      manufacturer: defaultManufacturers[0],
      payload: defaultNutritionPayload,
      id: "test-seed"
    });
    const engine = createNutritionDataEngine({ repository, connectors: [connector], eventPublisher: events });
    const summary = await engine.runConnector(connector.descriptor.id);

    expect(summary.productsCreated).toBe(defaultNutritionPayload.products.length);
    expect(await repository.listManufacturers()).toHaveLength(defaultNutritionPayload.manufacturers.length);
    expect(events.events.some((event) => event.type === "nutrition.product.updated")).toBe(true);
  });
});

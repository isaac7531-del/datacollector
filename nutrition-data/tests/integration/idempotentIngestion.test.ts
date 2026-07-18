import { describe, expect, it } from "vitest";
import { createManualConnector, createNutritionDataEngine, InMemoryEventPublisher, InMemoryNutritionDataRepository } from "../../src";
import { defaultManufacturers, defaultNutritionPayload } from "../../src/config/defaultSeed";

describe("idempotent manufacturer recollection", () => {
  it("updates existing products and does not duplicate immutable versions for unchanged products", async () => {
    const repository = new InMemoryNutritionDataRepository();
    const events = new InMemoryEventPublisher();
    const manufacturer = { ...defaultManufacturers[0], id: "mitavite-au", name: "Mitavite" };
    const payload = {
      ...defaultNutritionPayload,
      manufacturers: [manufacturer],
      products: defaultNutritionPayload.products.map((product) => ({ ...product, manufacturerId: "mitavite-au", manufacturerName: "Mitavite" }))
    };
    const connector = createManualConnector({ manufacturer, payload, id: "mitavite-au" });
    const engine = createNutritionDataEngine({ repository, connectors: [connector], eventPublisher: events });

    const first = await engine.runConnector("mitavite-au");
    const second = await engine.runConnector("mitavite-au");

    expect(first.productsCreated).toBe(payload.products.length);
    expect(second.productsCreated).toBe(0);
    expect(second.productsUpdated).toBe(payload.products.length);
    expect(await repository.listProducts({ manufacturerId: "mitavite-au", includeDiscontinued: true })).toHaveLength(payload.products.length);
    expect(await repository.listProductVersions(payload.products[0].id)).toHaveLength(1);
    expect(events.events.some((event) => event.type === "nutrition.product.discovered")).toBe(true);
    expect(events.events.some((event) => event.type === "nutrition.product.updated")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { createManualConnector, createNutritionDataEngine, InMemoryNutritionDataRepository } from "../../src";
import { defaultManufacturers, defaultNutritionPayload } from "../../src/config/defaultSeed";

describe("manufacturer assessment", () => {
  it("reports blockers until acceptance evidence is complete", async () => {
    const repository = new InMemoryNutritionDataRepository();
    const manufacturer = { ...defaultManufacturers[0], id: "mitavite-au", name: "Mitavite" };
    const payload = {
      ...defaultNutritionPayload,
      manufacturers: [manufacturer],
      products: defaultNutritionPayload.products.map((product) => ({ ...product, manufacturerId: "mitavite-au", manufacturerName: "Mitavite" }))
    };
    const connector = createManualConnector({ manufacturer, payload, id: "mitavite-au" });
    const engine = createNutritionDataEngine({ repository, connectors: [connector] });
    await engine.runConnector(connector.descriptor.id);
    const status = await engine.manufacturerStatus("mitavite-au");
    expect(status.productsCollected).toBeGreaterThan(0);
    expect(status.productionReady).toBe(false);
    expect(status.blockers.join(" ")).toMatch(/product count|Nutrient|Availability|versions|coverage/i);
  });

  it("creates workboard rows for every onboarded manufacturer capability", async () => {
    const engine = createNutritionDataEngine({ repository: new InMemoryNutritionDataRepository() });
    const rows = await engine.manufacturerWorkboard();
    expect(rows.length).toBeGreaterThan(100);
    expect(rows.some((row) => row.manufacturerId === "hygain-au" && row.capability === "Registry")).toBe(true);
    expect(rows.some((row) => row.manufacturerId === "prydes-au" && row.capability === "Reconnaissance")).toBe(true);
  });
});

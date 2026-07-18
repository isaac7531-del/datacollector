import { describe, expect, it } from "vitest";
import { buildAustralianAcceptanceReport } from "../../src/operations/australiaAcceptanceReport";
import { createNutritionDataEngine, InMemoryNutritionDataRepository } from "../../src";

describe("Australian acceptance report", () => {
  it("reports all Australian acceptance manufacturers without claiming production readiness", async () => {
    const engine = createNutritionDataEngine({ repository: new InMemoryNutritionDataRepository() });
    const report = await buildAustralianAcceptanceReport(engine);
    expect(report.manufacturers.map((row) => row.manufacturerId)).toEqual(["mitavite-au", "hygain-au", "prydes-au", "barastoc-au", "coprice-au"]);
    expect(report.productionReadyCount).toBe(0);
    expect(report.note).toMatch(/PostgreSQL/);
  });
});

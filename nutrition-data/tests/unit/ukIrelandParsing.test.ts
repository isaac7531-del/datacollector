import { describe, expect, it } from "vitest";
import { parseNutrientsFromText, parseProductPage } from "../../src/parsing/htmlProductParser";
import { buildUkIrelandAcceptanceReport } from "../../src/operations/ukIrelandAcceptanceReport";
import { createNutritionDataEngine, InMemoryNutritionDataRepository } from "../../src";

describe("UK/Ireland parsing and reporting", () => {
  it("parses Baileys compact analytical constituents", () => {
    const nutrients = parseNutrientsFromText(`
      Analytical Constituents
      - digestible energy8.5MJ/kg
      - protein8%
      - oil3%
      - fibre20%
      - copper250 mg/kg
      - vitamin a60,000 IU/kg
    `, "https://baileys.example/product");
    expect(nutrients.digestible_energy.value).toBe(8.5);
    expect(nutrients.crude_protein.value).toBe(8);
    expect(nutrients.copper.unit).toBe("mg_per_kg");
    expect(nutrients.vitamin_a.unit).toBe("iu_per_kg");
  });

  it("parses Saracen dash-separated nutrient specifications", () => {
    const nutrients = parseNutrientsFromText(`
      Nutritional Information Crude Fibre - 6.5%, Crude Protein - 26.0%, Lysine - 1.40%, Crude Oil - 4.8%, Digestible Energy - 12.2 MJ/kg
      Minerals Calcium - 2.52%, Copper - 200 mg/kg, Zinc - 450 mg/kg, Selenium - 3.00 mg/kg
    `, "https://saracen.example/product");
    expect(nutrients.fibre.value).toBe(6.5);
    expect(nutrients.crude_protein.value).toBe(26);
    expect(nutrients.digestible_energy.unit).toBe("mj_per_kg");
    expect(nutrients.zinc.value).toBe(450);
  });

  it("captures Allen & Page ingredients and soaking warnings", () => {
    const parsed = parseProductPage({
      manufacturerId: "allen-page-gb",
      manufacturerName: "Allen & Page",
      headquartersCountry: "GB",
      countriesMarketed: ["GB", "IE"],
      countriesOfficiallyDistributed: ["GB", "IE"],
      category: "feed",
      sourceUrl: "https://allen.example/product",
      acquisitionMode: "fully_automated",
      htmlOrText: `
        # Cool & Collected
        Molasses Free Beet Pulp, Wheat Feed, Linseed Expeller, Calcium Carbonate, Salt, Vitamin and Mineral Premix.
        DO NOT FEED DRY – THIS PRODUCT CONTAINS UNMOLASSED SUGAR BEET AND MUST BE SOAKED FOR 10 MINUTES BEFORE FEEDING.
        Feeding Guide 0.25 - 5.0kg depending on size, type, workload and condition.
        Energy 12.5MJ/kg
        Protein 14%
      `
    });
    expect(parsed.product.ingredients.length).toBeGreaterThan(2);
    expect(parsed.product.warnings.join(" ")).toMatch(/DO NOT FEED DRY|soaked/i);
    expect(parsed.product.feedingDirections).toMatch(/Feeding Guide/);
  });

  it("reports the UK/Ireland batch without claiming readiness on an empty repository", async () => {
    const report = await buildUkIrelandAcceptanceReport(createNutritionDataEngine({ repository: new InMemoryNutritionDataRepository() }));
    expect(report.manufacturers.map((row) => row.manufacturerId)).toEqual(["dengie-gb", "dodson-horrell-gb", "baileys-gb", "saracen-gb", "allen-page-gb", "keyflow-gb"]);
    expect(report.productionReadyCount).toBe(0);
    expect(report.manufacturers.every((row) => row.mobileApiReady === false)).toBe(true);
  });
});

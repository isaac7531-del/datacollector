import { describe, expect, it } from "vitest";
import { canonicalNutrientKey, normaliseNutrientMap, nutrientContribution } from "../../src/normalisation/nutrients";

describe("nutrient normalisation", () => {
  it("canonicalises manufacturer nutrient labels", () => {
    expect(canonicalNutrientKey("Crude Protein")).toBe("crude_protein");
    expect(canonicalNutrientKey("Vitamin E")).toBe("vitamin_e");
    expect(canonicalNutrientKey("Omega-3")).toBe("omega_3");
  });

  it("normalises numeric nutrient maps", () => {
    const map = normaliseNutrientMap({ "Crude Protein": 14, Selenium: 1.2 });
    expect(map.crude_protein.unit).toBe("percent");
    expect(map.selenium.unit).toBe("mg_per_kg");
  });

  it("calculates daily contribution from percentage nutrients", () => {
    const [protein] = Object.values(normaliseNutrientMap({ protein: 12 }));
    expect(nutrientContribution(protein, 2)).toBe(240);
  });
});

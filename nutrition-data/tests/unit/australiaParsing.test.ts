import { describe, expect, it } from "vitest";
import { parseNutrientsFromText, parseProductPage } from "../../src/parsing/htmlProductParser";

describe("Australian manufacturer parser formats", () => {
  it("parses Hygain compact and adjacent-line nutrient declarations", () => {
    const nutrients = parseNutrientsFromText(`
      Major Nutrients
      Digestible Energy
      13.5MJ
      Crude Protein
      13.1%
      Oil7.0%
      Sodium3.5g
      Vitamin B1235.8µg
      Selenium 0.7mg
      13% Fat, 27% Starch
    `, "https://hygain.example/product");
    expect(nutrients.digestible_energy.value).toBe(13.5);
    expect(nutrients.crude_protein.value).toBe(13.1);
    expect(nutrients.oil.value).toBe(7);
    expect(nutrients.sodium.unit).toBe("g_per_kg");
    expect(nutrients.selenium.unit).toBe("mg_per_kg");
    expect(nutrients.starch.value).toBe(27);
  });

  it("parses CopRice label/value summary blocks", () => {
    const parsed = parseProductPage({
      manufacturerId: "coprice-au",
      manufacturerName: "CopRice",
      headquartersCountry: "AU",
      countriesMarketed: ["AU"],
      countriesOfficiallyDistributed: ["AU"],
      category: "feed",
      sourceUrl: "https://www.coprice.com.au/products/coprice-g",
      acquisitionMode: "fully_automated",
      htmlOrText: `
        # CopRice G
        Protein (%)
        16
        Energy (MJ DE/KG)
        13.5
        Oil (%)
        8
        Daily Feeding Guide
        Feed according to workload.
      `
    });
    expect(parsed.product.nutrients.crude_protein.value).toBe(16);
    expect(parsed.product.nutrients.digestible_energy.unit).toBe("mj_per_kg");
    expect(parsed.product.feedingDirections).toMatch(/Daily Feeding Guide/);
  });
});

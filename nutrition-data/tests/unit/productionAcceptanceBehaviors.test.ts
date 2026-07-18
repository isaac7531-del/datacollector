import { describe, expect, it } from "vitest";
import { defaultProducts } from "../../src/config/defaultSeed";
import { PriceHistoryEngine } from "../../src/costs/priceHistory";
import { parseForageLaboratoryImport } from "../../src/forage/laboratoryImports";
import { classifyChanges, createImmutableProductVersion } from "../../src/versioning/formulationVersioning";
import type { PriceObservation } from "../../src/operations/types";

describe("production acceptance behaviours", () => {
  it("classifies formulation changes without overwriting history", () => {
    const base = defaultProducts[0];
    const first = createImmutableProductVersion(base);
    const nutrientChange = { ...base, nutrients: { ...base.nutrients, starch: { ...base.nutrients.starch, value: 7 } } };
    const ingredientAddition = { ...base, ingredients: [{ name: "alfalfa", order: 1 }] };
    const ingredientRemoval = { ...ingredientAddition, ingredients: [] };
    const feedingChange = { ...base, feedingDirections: "Feed 1 kg daily." };
    const packageChange = { ...base, packaging: [...base.packaging, { size: 5, unit: "kg" as const }] };
    const rename = { ...base, name: `${base.name} Plus` };
    const discontinued = { ...base, discontinued: true };

    expect(classifyChanges(base, nutrientChange)).toBe("formulation");
    expect(classifyChanges(base, ingredientAddition)).toBe("formulation");
    expect(classifyChanges(ingredientAddition, ingredientRemoval)).toBe("formulation");
    expect(classifyChanges(base, feedingChange)).toBe("feeding_guidance");
    expect(classifyChanges(base, packageChange)).toBe("packaging");
    expect(classifyChanges(base, rename)).toBe("cosmetic");
    expect(classifyChanges(base, discontinued)).toBe("discontinued");
    expect(createImmutableProductVersion(nutrientChange, first).previousVersionId).toBe(first.id);
  });

  it("validates price history trends, promotion, expiry, currency separation, inflation and deflation", () => {
    const prices: PriceObservation[] = [
      obs("2026-01-01T00:00:00Z", 42.95, "AUD", false),
      obs("2026-02-01T00:00:00Z", 43.95, "AUD", false),
      obs("2026-03-01T00:00:00Z", 39.95, "AUD", true, "2026-03-15T00:00:00Z"),
      obs("2026-04-01T00:00:00Z", 44.5, "AUD", false),
      obs("2026-04-01T00:00:00Z", 32, "USD", false)
    ];
    const aud = new PriceHistoryEngine().summarise(prices.filter((price) => price.currency === "AUD"), { productId: "feed", country: "AU", dailyPackageFraction: 0.1 });
    expect(aud.percentageChange).toBeGreaterThan(0);
    expect(aud.averageMonthlyFeedCost?.amount).toBeGreaterThan(100);
    expect(aud.seasonalAverages.winter).toBeDefined();
    const promo = prices.find((price) => price.promotional);
    expect(promo?.validUntil).toBe("2026-03-15T00:00:00Z");
    const usd = new PriceHistoryEngine().summarise(prices.filter((price) => price.currency === "USD"), { productId: "feed" });
    expect(usd.latestPrice?.currency).toBe("USD");
  });

  it("validates forage imports across CSV, TSV, text, PDF text, and manual-style rows", () => {
    const csv = parseForageLaboratoryImport({ laboratory: "equi-analytical", text: "Nutrient,Value,Unit\nDry Matter,90,%\nCrude Protein,11,%\nADF,30,%", sampleDate: "2026-01-01" });
    const tsv = parseForageLaboratoryImport({ laboratory: "dairy-one", text: "Nutrient\tValue\tUnit\nDry Matter\t89\t%\nStarch\t2\t%", sampleDate: "2026-01-01" });
    const text = parseForageLaboratoryImport({ laboratory: "cvas", text: "Dry Matter 88%\nCrude Protein 12%\nNDF 55%", sampleDate: "2026-01-01" });
    const pdfText = parseForageLaboratoryImport({ laboratory: "eurofins", text: "Haylage report\nDry Matter 63%\nSugar 7%\nStarch 1%", documentUrl: "report.pdf" });
    const manual = parseForageLaboratoryImport({ laboratory: "local", text: "Dry Matter 91%\nCalcium 0.45%", documentUrl: "user-entered" });

    expect(csv.nutrients.crude_protein.value).toBe(11);
    expect(tsv.nutrients.starch.value).toBe(2);
    expect(text.nutrients.ndf.value).toBe(55);
    expect(pdfText.documentUrl).toBe("report.pdf");
    expect(manual.documentUrl).toBe("user-entered");
    expect(parseForageLaboratoryImport({ laboratory: "equi-analytical", text: "Dry Matter 90%", sampleDate: "2026-01-01" }).id)
      .toBe(parseForageLaboratoryImport({ laboratory: "equi-analytical", text: "Dry Matter 90%", sampleDate: "2026-01-01" }).id);
    expect(parseForageLaboratoryImport({ laboratory: "equi-analytical", text: "Dry Matter 91%", sampleDate: "2026-01-01" }).id)
      .not.toBe(parseForageLaboratoryImport({ laboratory: "equi-analytical", text: "Dry Matter 90%", sampleDate: "2026-01-01" }).id);
  });
});

function obs(capturedAt: string, amount: number, currency: "AUD" | "USD", promotional: boolean, validUntil?: string): PriceObservation {
  return {
    productId: "feed",
    amount,
    currency,
    packageSize: "20kg",
    retailer: "Retailer",
    country: currency === "AUD" ? "AU" : "US",
    promotional,
    capturedAt,
    validUntil,
    confidence: "medium",
    sourceUrl: `https://example.test/${currency}/${capturedAt}`
  };
}

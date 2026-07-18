import { describe, expect, it } from "vitest";
import { ComparisonEngine } from "../../src/comparison/comparisonEngine";
import { defaultProducts } from "../../src/config/defaultSeed";
import { CostEngine } from "../../src/costs/costEngine";

describe("cost and comparison engines", () => {
  it("calculates cost per kg and per month", () => {
    const summary = new CostEngine().summariseProduct(defaultProducts[0], 1, "AUD");
    expect(summary.costPerKg?.amount).toBeGreaterThan(0);
    expect(summary.costPerMonth?.currency).toBe("AUD");
  });

  it("builds comparison rows with availability ranks", () => {
    const comparison = new ComparisonEngine().compareProducts(defaultProducts.slice(0, 2), { country: "AU", nutrientKeys: ["starch", "sugar"] });
    expect(comparison.rows).toHaveLength(2);
    expect(comparison.rows[0].nutrients.starch?.key).toBe("starch");
  });
});

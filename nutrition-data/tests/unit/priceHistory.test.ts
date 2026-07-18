import { describe, expect, it } from "vitest";
import { PriceHistoryEngine } from "../../src/costs/priceHistory";
import type { PriceObservation } from "../../src/operations/types";

const observations: PriceObservation[] = [
  price("2026-01-01T00:00:00Z", 42.95, "AU", "Mitavite Performer"),
  price("2026-02-01T00:00:00Z", 43.95, "AU", "Mitavite Performer"),
  price("2026-03-01T00:00:00Z", 44.5, "AU", "Mitavite Performer"),
  price("2026-03-01T00:00:00Z", 41.5, "AU", "Mitavite Performer", "Queensland Rural")
];

describe("price history", () => {
  it("summarises versioned price changes and cost trends", () => {
    const summary = new PriceHistoryEngine().summarise(observations, { productId: "mitavite-performer", country: "AU", dailyPackageFraction: 0.1 });
    expect(summary.versions).toHaveLength(4);
    expect(summary.firstPrice?.amount).toBe(42.95);
    expect(summary.latestPrice?.amount).toBe(41.5);
    expect(summary.percentageChange).toBe(-3.38);
    expect(summary.cheapestRegion?.amount.amount).toBe(41.5);
    expect(summary.averageMonthlyFeedCost?.amount).toBeGreaterThan(100);
  });
});

function price(capturedAt: string, amount: number, country: string, retailer: string, sourceName = retailer): PriceObservation {
  return {
    productId: "mitavite-performer",
    amount,
    currency: "AUD",
    packageSize: "20kg",
    retailer,
    country,
    promotional: false,
    capturedAt,
    taxIncluded: true,
    deliveryExcluded: true,
    confidence: "medium",
    sourceUrl: `https://example.test/${sourceName}`
  };
}

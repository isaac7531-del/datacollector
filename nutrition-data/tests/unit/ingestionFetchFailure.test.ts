import { describe, expect, it } from "vitest";
import { createNutritionDataEngine, InMemoryNutritionDataRepository } from "../../src";
import type { NutritionDataConnector } from "../../src/connectors/types";

describe("ingestion fetch failure handling", () => {
  it("records item-level fetch failures and continues connector ingestion", async () => {
    const connector: NutritionDataConnector = {
      descriptor: {
        id: "fetch-failure",
        name: "Fetch failure connector",
        regionsSupplied: ["GB"],
        supportedProducts: ["feed"],
        updateFrequency: "test",
        collectionMethod: "public_page",
        productCategories: ["feed"],
        version: "test",
        confidence: "medium",
        sourceUrls: ["https://example.test"],
        status: "enabled",
        health: "healthy"
      },
      async discover() {
        return [{
          id: "missing",
          connectorId: "fetch-failure",
          url: "https://example.test/missing",
          source: { id: "fetch-failure", name: "Fetch failure connector", kind: "public_page", official: true }
        }];
      },
      async fetch() {
        throw new Error("404");
      },
      async normalise() {
        throw new Error("should not normalise failed fetches");
      }
    };

    const summary = await createNutritionDataEngine({ repository: new InMemoryNutritionDataRepository(), connectors: [connector] }).runConnector("fetch-failure");
    expect(summary.discovered).toBe(1);
    expect(summary.payloads).toBe(0);
    expect(summary.issues[0].code).toBe("fetch_failed");
  });
});

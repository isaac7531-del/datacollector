import { describe, expect, it } from "vitest";
import { AvailabilityEngine } from "../../src/availability/availabilityEngine";
import { defaultProducts } from "../../src/config/defaultSeed";

describe("availability engine", () => {
  it("does not return US-only products for an Australian horse by default", () => {
    const engine = new AvailabilityEngine();
    const decisions = engine.filterAndRank(defaultProducts, { country: "AU", stateOrProvince: "AU-NSW" });
    expect(decisions.map((decision) => decision.product.id)).not.toContain("gpe-race-performance");
  });

  it("allows imported products only when explicitly enabled", () => {
    const engine = new AvailabilityEngine();
    const decisions = engine.filterAndRank(defaultProducts, { country: "AU", allowImportedFeeds: true });
    const imported = decisions.find((decision) => decision.product.id === "gpe-race-performance");
    expect(imported?.imported).toBe(true);
    expect(imported?.reason).toMatch(/imported/);
  });
});

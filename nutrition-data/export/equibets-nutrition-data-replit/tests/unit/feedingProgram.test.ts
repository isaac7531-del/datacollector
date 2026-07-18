import { describe, expect, it } from "vitest";
import { defaultProducts } from "../../src/config/defaultSeed";
import type { FeedingProgram } from "../../src/domain/types";
import { FeedingProgramEngine } from "../../src/programs/feedingProgramEngine";

describe("feeding program engine", () => {
  it("calculates intakes, costs, balances, and ratios", () => {
    const program: FeedingProgram = {
      horse: {
        species: "horse",
        ageYears: 8,
        weightKg: 520,
        workload: "moderate",
        goals: ["performance"],
        location: { country: "AU", currency: "AUD" }
      },
      currency: "AUD",
      items: [{ id: "balancer", productId: defaultProducts[0].id, product: defaultProducts[0], amountPerDay: 1, unit: "kg", role: "feed" }]
    };
    const analysis = new FeedingProgramEngine().analyse(program);
    expect(analysis.intakes.crude_protein.amount).toBeGreaterThan(0);
    expect(analysis.dailyCost.currency).toBe("AUD");
    expect(analysis.balances.calcium.explanation).toMatch(/Calcium/);
  });
});

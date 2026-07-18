import { describe, expect, it } from "vitest";
import { defaultProducts } from "../../src/config/defaultSeed";
import type { FeedingProgram } from "../../src/domain/types";
import { FeedingProgramEngine } from "../../src/programs/feedingProgramEngine";
import { RecommendationEngine } from "../../src/recommendations/recommendationEngine";

describe("recommendation engine", () => {
  it("recommends only locally available products unless imports are enabled", () => {
    const program: FeedingProgram = {
      horse: {
        species: "horse",
        ageYears: 11,
        weightKg: 540,
        workload: "heavy",
        goals: ["performance"],
        location: { country: "AU", currency: "AUD" }
      },
      currency: "AUD",
      items: []
    };
    const analysis = new FeedingProgramEngine().analyse(program);
    const recommendations = new RecommendationEngine().recommend(analysis, { candidateProducts: defaultProducts });
    expect(recommendations.every((recommendation) => recommendation.availability.countries.includes("AU"))).toBe(true);
  });

  it("explains imported recommendations when imports are enabled", () => {
    const program: FeedingProgram = {
      horse: {
        species: "horse",
        ageYears: 5,
        weightKg: 500,
        workload: "race_training",
        goals: ["performance"],
        location: { country: "DE", allowImportedFeeds: true, currency: "EUR" }
      },
      currency: "EUR",
      items: []
    };
    const analysis = new FeedingProgramEngine().analyse(program);
    const recommendations = new RecommendationEngine().recommend(analysis, { candidateProducts: defaultProducts });
    expect(recommendations.some((recommendation) => recommendation.imported)).toBe(true);
    expect(recommendations.flatMap((recommendation) => recommendation.evidence).join(" ")).toMatch(/imported/);
  });
});

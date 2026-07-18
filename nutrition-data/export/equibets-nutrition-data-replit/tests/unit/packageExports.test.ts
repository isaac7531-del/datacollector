import { describe, expect, it } from "vitest";
import {
  AvailabilityEngine,
  CostEngine,
  FeedingProgramEngine,
  InMemoryNutritionDataRepository,
  NutritionDataEngine,
  RecommendationEngine,
  createNutritionDataEngine
} from "../../src";

describe("package exports", () => {
  it("exports public engine and supporting modules", () => {
    expect(createNutritionDataEngine).toBeTypeOf("function");
    expect(new InMemoryNutritionDataRepository()).toBeInstanceOf(InMemoryNutritionDataRepository);
    expect(new NutritionDataEngine({ repository: new InMemoryNutritionDataRepository() })).toBeInstanceOf(NutritionDataEngine);
    expect(new AvailabilityEngine()).toBeInstanceOf(AvailabilityEngine);
    expect(new CostEngine()).toBeInstanceOf(CostEngine);
    expect(new FeedingProgramEngine()).toBeInstanceOf(FeedingProgramEngine);
    expect(new RecommendationEngine()).toBeInstanceOf(RecommendationEngine);
  });
});

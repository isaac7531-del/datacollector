import { describe, expect, it } from "vitest";
import { createGenericForageAnalysis, laboratoryAnalysisOverrides } from "../../src/forage/forageAnalysis";
import { NutritionSafetyEngine } from "../../src/safety/safetyEngine";

describe("safety and forage support", () => {
  it("flags medical-risk horses for professional review", () => {
    const warnings = new NutritionSafetyEngine().warningsForHorse({
      species: "horse",
      ageYears: 14,
      weightKg: 500,
      workload: "light",
      medicalConditions: ["PPID"],
      goals: ["low_starch"],
      location: { country: "GB" }
    });
    expect(warnings.join(" ")).toMatch(/veterinarian|nutritionist/);
  });

  it("allows laboratory forage analyses to override generic estimates", () => {
    const generic = createGenericForageAnalysis("hay", "GB");
    const lab = { ...generic, id: "lab-1", source: "laboratory_test" as const, confidence: "verified" as const, sampleDate: "2026-01-01" };
    expect(laboratoryAnalysisOverrides(generic, lab).source).toBe("laboratory_test");
  });
});

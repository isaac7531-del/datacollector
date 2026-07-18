import { describe, expect, it } from "vitest";
import { HorseRequirementsEngine } from "../../src/requirements/requirementsEngine";

describe("horse requirements", () => {
  it("increases energy for higher workloads", () => {
    const engine = new HorseRequirementsEngine();
    const base = engine.calculate({
      species: "horse",
      ageYears: 10,
      weightKg: 500,
      workload: "maintenance",
      goals: ["maintenance"],
      location: { country: "GB" }
    });
    const heavy = engine.calculate({
      species: "horse",
      ageYears: 10,
      weightKg: 500,
      workload: "heavy",
      goals: ["performance"],
      location: { country: "GB" }
    });
    expect(heavy.requirements.digestible_energy.target).toBeGreaterThan(base.requirements.digestible_energy.target ?? 0);
  });

  it("sets conservative starch and sugar limits for metabolic goals", () => {
    const profile = new HorseRequirementsEngine().calculate({
      species: "horse",
      ageYears: 12,
      weightKg: 480,
      workload: "light",
      medicalConditions: ["laminitis"],
      goals: ["low_starch"],
      location: { country: "AU" }
    });
    expect(profile.requirements.starch.maximum).toBe(10);
    expect(profile.requirements.sugar.maximum).toBe(10);
  });
});

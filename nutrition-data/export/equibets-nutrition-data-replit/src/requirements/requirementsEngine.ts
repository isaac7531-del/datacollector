import type { HorseProfile, NutrientRequirement, RequirementProfile, Workload } from "../domain/types";

const WORKLOAD_FACTORS: Record<Workload, number> = {
  maintenance: 1,
  light: 1.2,
  moderate: 1.4,
  heavy: 1.7,
  very_heavy: 2,
  race_training: 2.15
};

export class HorseRequirementsEngine {
  calculate(horse: HorseProfile): RequirementProfile {
    const weight = horse.weightKg;
    const workloadFactor = WORKLOAD_FACTORS[horse.workload];
    const digestibleEnergy = round((0.0333 * weight + 1.4) * workloadFactor, 2);
    const protein = round((1.26 * weight + 95) * proteinFactor(horse), 0);
    const calcium = round(0.04 * weight * mineralFactor(horse), 1);
    const phosphorus = round(calcium * 0.65, 1);
    const magnesium = round(0.015 * weight, 1);
    const sodium = round((horse.workload === "heavy" || horse.workload === "very_heavy" || horse.workload === "race_training" ? 0.04 : 0.02) * weight, 1);
    const vitaminE = round((horse.workload === "maintenance" ? 1 : 2) * weight * climateVitaminEFactor(horse), 0);
    const copper = round(0.1 * weight, 1);
    const zinc = round(0.4 * weight, 1);
    const selenium = round(0.002 * weight, 2);
    const dryMatter = round(weight * dryMatterPercent(horse), 2);
    const maxStarchSugar = horse.goals.includes("low_starch") || horse.medicalConditions?.some((condition) => /laminitis|ems|ppid|ulcer/i.test(condition)) ? 10 : 18;

    const requirements: Record<string, NutrientRequirement> = {
      digestible_energy: requirement("digestible_energy", "Digestible energy", digestibleEnergy, "mj_per_kg", "Estimated from body weight and workload."),
      crude_protein: requirement("crude_protein", "Crude protein", protein, "g", "Supports maintenance, muscle repair, growth, pregnancy, and lactation."),
      calcium: requirement("calcium", "Calcium", calcium, "g", "Maintains bone, muscle, and lactation demands."),
      phosphorus: requirement("phosphorus", "Phosphorus", phosphorus, "g", "Paired with calcium to maintain mineral balance."),
      magnesium: requirement("magnesium", "Magnesium", magnesium, "g", "Supports muscle and nerve function."),
      sodium: requirement("sodium", "Sodium", sodium, "g", "Increases with sweat, travel, heat, and performance workload."),
      copper: requirement("copper", "Copper", copper, "mg", "Trace mineral required for connective tissue and hoof quality."),
      zinc: requirement("zinc", "Zinc", zinc, "mg", "Trace mineral required for skin, hoof, and immune function."),
      selenium: requirement("selenium", "Selenium", selenium, "mg", "Antioxidant trace mineral; upper limit is intentionally conservative."),
      vitamin_e: requirement("vitamin_e", "Vitamin E", vitaminE, "iu", "Antioxidant need rises with performance, limited pasture, and recovery."),
      dry_matter: requirement("dry_matter", "Dry matter", dryMatter, "kg", "Daily dry matter target based on body weight."),
      starch: {
        key: "starch",
        label: "Starch",
        maximum: maxStarchSugar,
        unit: "percent",
        basis: "daily",
        rationale: "Controlled for metabolic, ulcer, and low-starch goals.",
        confidence: "medium"
      },
      sugar: {
        key: "sugar",
        label: "Sugar",
        maximum: maxStarchSugar,
        unit: "percent",
        basis: "daily",
        rationale: "Controlled alongside starch for non-structural carbohydrate load.",
        confidence: "medium"
      }
    };

    return {
      horse,
      requirements,
      assumptions: [
        "Uses conservative equine nutrition heuristics suitable for software recommendations, not veterinary diagnosis.",
        "Forage analysis should replace default forage assumptions when available.",
        "Pregnancy, lactation, growth, heat, travel, and recovery increase selected requirements."
      ],
      generatedAt: new Date().toISOString()
    };
  }
}

function requirement(key: string, label: string, target: number, unit: NutrientRequirement["unit"], rationale: string): NutrientRequirement {
  return { key, label, target, minimum: round(target * 0.9, 2), unit, basis: "daily", rationale, confidence: "medium" };
}

function proteinFactor(horse: HorseProfile): number {
  let factor = 1;
  if (horse.growthStage && horse.growthStage !== "adult") factor += 0.3;
  if (horse.pregnancy) factor += horse.pregnancy.daysPregnant > 240 ? 0.25 : 0.1;
  if (horse.lactation) factor += 0.5;
  if (horse.recovery) factor += 0.15;
  return factor;
}

function mineralFactor(horse: HorseProfile): number {
  let factor = 1;
  if (horse.growthStage && horse.growthStage !== "adult") factor += 0.35;
  if (horse.pregnancy) factor += 0.2;
  if (horse.lactation) factor += 0.45;
  return factor;
}

function climateVitaminEFactor(horse: HorseProfile): number {
  if (horse.pastureAccessHours && horse.pastureAccessHours >= 8 && horse.forageQuality === "excellent") return 0.8;
  if (horse.recovery || horse.climate === "hot" || horse.workload === "race_training") return 1.25;
  return 1;
}

function dryMatterPercent(horse: HorseProfile): number {
  if (horse.goals.includes("weight_loss") || horse.bodyConditionScore && horse.bodyConditionScore >= 7) return 0.0175;
  if (horse.goals.includes("weight_gain") || horse.workload === "very_heavy" || horse.workload === "race_training") return 0.025;
  return 0.02;
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

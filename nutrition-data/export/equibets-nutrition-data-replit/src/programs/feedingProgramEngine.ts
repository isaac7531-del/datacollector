import type { FeedingProgram, FeedingProgramAnalysis, MoneyAmount, NutrientBalance, NutrientIntake, NutrientUnit } from "../domain/types";
import { convertFeedAmountToKg, nutrientContribution } from "../normalisation/nutrients";
import { HorseRequirementsEngine } from "../requirements/requirementsEngine";

export class FeedingProgramEngine {
  constructor(private readonly requirements = new HorseRequirementsEngine()) {}

  analyse(program: FeedingProgram): FeedingProgramAnalysis {
    const requirementProfile = this.requirements.calculate(program.horse);
    const intakes: Record<string, NutrientIntake> = {};
    let dailyDryMatterKg = 0;
    let dailyCost = 0;

    for (const item of program.items) {
      const fedKg = convertFeedAmountToKg(item.amountPerDay, item.unit);
      dailyDryMatterKg += fedKg;
      dailyCost += itemCostPerDay(item);
      const nutrients = item.nutrients ?? item.product?.nutrients ?? {};
      for (const nutrient of Object.values(nutrients)) {
        const contribution = nutrientContribution(nutrient, fedKg);
        if (contribution === undefined) continue;
        const existing = intakes[nutrient.key] ?? {
          key: nutrient.key,
          label: nutrient.label,
          amount: 0,
          unit: dailyUnitFor(nutrient.unit),
          contributionByItem: []
        };
        existing.amount += contribution;
        existing.contributionByItem.push({ itemId: item.id, amount: contribution, label: item.product?.name ?? item.customName ?? item.id });
        intakes[nutrient.key] = existing;
      }
    }

    const balances: Record<string, NutrientBalance> = {};
    for (const requirement of Object.values(requirementProfile.requirements)) {
      const intake = intakes[requirement.key]?.amount ?? 0;
      balances[requirement.key] = balanceFor(requirement.key, requirement.label, intake, requirement);
    }

    const ratios = calculateRatios(intakes);
    const warnings = buildWarnings(balances, ratios);
    const interactions = buildInteractions(intakes, ratios);
    const currency = program.currency ?? program.horse.location.currency ?? "USD";

    return {
      program,
      requirementProfile,
      dailyDryMatterKg: round(dailyDryMatterKg, 3),
      dailyCost: money(dailyCost, currency),
      monthlyCost: money(dailyCost * 30.4375, currency),
      intakes,
      balances,
      ratios,
      warnings,
      interactions,
      generatedAt: new Date().toISOString()
    };
  }
}

function itemCostPerDay(item: FeedingProgram["items"][number]): number {
  const price = item.costPerPackage ?? item.product?.prices[0];
  if (!price) return 0;
  const packageKg = convertFeedAmountToKg(price.packageSize.size, price.packageSize.unit === "kg" || price.packageSize.unit === "g" || price.packageSize.unit === "lb" ? price.packageSize.unit : "kg");
  const fedKg = convertFeedAmountToKg(item.amountPerDay, item.unit);
  return packageKg > 0 ? (price.amount / packageKg) * fedKg : 0;
}

function balanceFor(key: string, label: string, intake: number, requirement: NutrientBalance["requirement"]): NutrientBalance {
  let status: NutrientBalance["status"] = "unknown";
  const target = requirement?.target ?? requirement?.minimum;
  if (requirement?.maximum !== undefined && intake > requirement.maximum) status = "excess";
  else if (target === undefined) status = "unknown";
  else if (intake < target * 0.8) status = "deficient";
  else if (intake < target) status = "low";
  else status = "adequate";

  const gap = target !== undefined ? round(intake - target, 3) : undefined;
  return {
    key,
    label,
    intake: round(intake, 3),
    requirement,
    status,
    gap,
    unit: requirement?.unit ?? "g",
    explanation: explainBalance(label, status, gap, requirement?.unit ?? "g")
  };
}

function explainBalance(label: string, status: NutrientBalance["status"], gap: number | undefined, unit: NutrientUnit): string {
  if (status === "deficient") return `${label} is materially below the calculated target by ${Math.abs(gap ?? 0)} ${unit}.`;
  if (status === "low") return `${label} is slightly below the calculated target by ${Math.abs(gap ?? 0)} ${unit}.`;
  if (status === "excess") return `${label} exceeds the configured upper threshold.`;
  if (status === "adequate") return `${label} meets the calculated target.`;
  return `${label} cannot be assessed because no comparable target was available.`;
}

function calculateRatios(intakes: Record<string, NutrientIntake>): Record<string, number> {
  const ratios: Record<string, number> = {};
  if (intakes.calcium?.amount && intakes.phosphorus?.amount) ratios.ca_p = round(intakes.calcium.amount / intakes.phosphorus.amount, 2);
  if (intakes.copper?.amount && intakes.zinc?.amount) ratios.zn_cu = round(intakes.zinc.amount / intakes.copper.amount, 2);
  if (intakes.omega_3?.amount && intakes.omega_6?.amount) ratios.omega_6_3 = round(intakes.omega_6.amount / intakes.omega_3.amount, 2);
  return ratios;
}

function buildWarnings(balances: Record<string, NutrientBalance>, ratios: Record<string, number>): string[] {
  const warnings = Object.values(balances)
    .filter((balance) => balance.status === "deficient" || balance.status === "excess")
    .map((balance) => balance.explanation);
  if (ratios.ca_p && (ratios.ca_p < 1 || ratios.ca_p > 3)) warnings.push(`Calcium to phosphorus ratio is ${ratios.ca_p}; review mineral balance.`);
  return warnings;
}

function buildInteractions(intakes: Record<string, NutrientIntake>, ratios: Record<string, number>): string[] {
  const interactions: string[] = [];
  if (ratios.zn_cu && (ratios.zn_cu < 3 || ratios.zn_cu > 6)) interactions.push(`Zinc to copper ratio is ${ratios.zn_cu}; trace mineral balance may reduce uptake.`);
  if ((intakes.starch?.amount ?? 0) + (intakes.sugar?.amount ?? 0) > 20) interactions.push("Combined starch and sugar load is high; consider lower non-structural carbohydrate options.");
  return interactions;
}

function dailyUnitFor(unit: NutrientUnit): NutrientUnit {
  if (unit === "percent" || unit === "g_per_kg") return "g";
  if (unit === "mg_per_kg") return "mg";
  if (unit === "mcg_per_kg") return "mcg";
  if (unit === "iu_per_kg") return "iu";
  return unit;
}

function money(amount: number, currency: string): MoneyAmount {
  return { amount: round(amount, 2), currency };
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

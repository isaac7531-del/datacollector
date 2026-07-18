import type { ConfidenceLevel, NutrientMap } from "../domain/types";
import { normaliseNutrientMap } from "../normalisation/nutrients";

export interface ForageAnalysis {
  id: string;
  forageType: "hay" | "haylage" | "lucerne" | "alfalfa" | "pasture" | "chaff" | "beet_pulp" | "straw" | "custom";
  source: "generic_regional_reference" | "laboratory_test" | "user_entered";
  sampleDate?: string;
  laboratory?: string;
  analysisMethod?: string;
  documentUrl?: string;
  dryMatterPercent?: number;
  nutrients: NutrientMap;
  confidence: ConfidenceLevel;
  notes?: string;
}

export function createGenericForageAnalysis(type: ForageAnalysis["forageType"], region = "generic"): ForageAnalysis {
  const nutrientsByType: Record<ForageAnalysis["forageType"], Record<string, number>> = {
    hay: { digestible_energy: 8, crude_protein: 9, fibre: 30, sugar: 10, starch: 2, calcium: 0.4, phosphorus: 0.2 },
    haylage: { digestible_energy: 9, crude_protein: 10, fibre: 28, sugar: 7, starch: 2, calcium: 0.45, phosphorus: 0.25 },
    lucerne: { digestible_energy: 9.5, crude_protein: 16, fibre: 28, sugar: 6, starch: 2, calcium: 1.2, phosphorus: 0.25 },
    alfalfa: { digestible_energy: 9.5, crude_protein: 16, fibre: 28, sugar: 6, starch: 2, calcium: 1.2, phosphorus: 0.25 },
    pasture: { digestible_energy: 10, crude_protein: 15, fibre: 24, sugar: 12, starch: 3, calcium: 0.5, phosphorus: 0.3 },
    chaff: { digestible_energy: 8, crude_protein: 8, fibre: 32, sugar: 8, starch: 2, calcium: 0.5, phosphorus: 0.2 },
    beet_pulp: { digestible_energy: 11, crude_protein: 9, fibre: 18, sugar: 5, starch: 1, calcium: 0.7, phosphorus: 0.1 },
    straw: { digestible_energy: 5, crude_protein: 4, fibre: 40, sugar: 5, starch: 1, calcium: 0.25, phosphorus: 0.1 },
    custom: {}
  };
  return {
    id: `${region}:${type}`,
    forageType: type,
    source: "generic_regional_reference",
    nutrients: normaliseNutrientMap(nutrientsByType[type]),
    confidence: "low",
    notes: "Generic forage reference only; laboratory forage tests override these estimates for ration analysis."
  };
}

export function laboratoryAnalysisOverrides(generic: ForageAnalysis, laboratory: ForageAnalysis): ForageAnalysis {
  if (laboratory.source !== "laboratory_test") return generic;
  return { ...laboratory, notes: `${laboratory.notes ?? ""} Laboratory values override generic ${generic.forageType} estimate.`.trim() };
}

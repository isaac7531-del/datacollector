import type { ConfidenceLevel, NutrientBasis, NutrientMap, NutrientUnit, NutrientValue } from "../domain/types";

export const CORE_NUTRIENTS = {
  digestible_energy: "Digestible energy",
  metabolisable_energy: "Metabolisable energy",
  crude_protein: "Crude protein",
  lysine: "Lysine",
  methionine: "Methionine",
  fat: "Fat",
  oil: "Oil",
  fibre: "Fibre",
  starch: "Starch",
  sugar: "Sugar",
  ndf: "NDF",
  adf: "ADF",
  calcium: "Calcium",
  phosphorus: "Phosphorus",
  magnesium: "Magnesium",
  potassium: "Potassium",
  sodium: "Sodium",
  chloride: "Chloride",
  copper: "Copper",
  zinc: "Zinc",
  manganese: "Manganese",
  iron: "Iron",
  selenium: "Selenium",
  iodine: "Iodine",
  cobalt: "Cobalt",
  sulphur: "Sulphur",
  vitamin_a: "Vitamin A",
  vitamin_d: "Vitamin D",
  vitamin_e: "Vitamin E",
  vitamin_k: "Vitamin K",
  biotin: "Biotin",
  choline: "Choline",
  b_vitamins: "B Vitamins",
  threonine: "Threonine",
  leucine: "Leucine",
  isoleucine: "Isoleucine",
  valine: "Valine",
  tryptophan: "Tryptophan",
  bcaa: "BCAA",
  esc: "Ethanol soluble carbohydrates",
  wsc: "Water soluble carbohydrates",
  nsc: "Non-structural carbohydrates",
  chromium: "Chromium",
  omega_3: "Omega 3",
  omega_6: "Omega 6",
  electrolytes: "Electrolytes",
  ash: "Ash",
  moisture: "Moisture",
  dry_matter: "Dry matter"
} as const;

export type CoreNutrientKey = keyof typeof CORE_NUTRIENTS;

const SYNONYMS: Record<string, CoreNutrientKey> = {
  de: "digestible_energy",
  energy: "digestible_energy",
  energymjdekg: "digestible_energy",
  energymjdekG: "digestible_energy",
  digestibleenergy: "digestible_energy",
  digestible_energy: "digestible_energy",
  me: "metabolisable_energy",
  metabolisableenergy: "metabolisable_energy",
  metabolizableenergy: "metabolisable_energy",
  metabolisable_energy: "metabolisable_energy",
  metabolizable_energy: "metabolisable_energy",
  protein: "crude_protein",
  crudeprotein: "crude_protein",
  crude_protein: "crude_protein",
  cp: "crude_protein",
  fiber: "fibre",
  crude_fiber: "fibre",
  crudefiber: "fibre",
  crude_fibre: "fibre",
  crudefibre: "fibre",
  fibre: "fibre",
  fat: "fat",
  oil: "oil",
  starch: "starch",
  esc: "esc",
  ethanolsolublecarbohydrate: "esc",
  wsc: "wsc",
  watersolublecarbohydrate: "wsc",
  nsc: "nsc",
  nonstructuralcarbohydrate: "nsc",
  sugar: "sugar",
  sugars: "sugar",
  calcium: "calcium",
  ca: "calcium",
  phosphorus: "phosphorus",
  phosphorous: "phosphorus",
  p: "phosphorus",
  magnesium: "magnesium",
  mg: "magnesium",
  potassium: "potassium",
  sodium: "sodium",
  salt: "sodium",
  chloride: "chloride",
  copper: "copper",
  zinc: "zinc",
  manganese: "manganese",
  iron: "iron",
  selenium: "selenium",
  iodine: "iodine",
  cobalt: "cobalt",
  chromium: "chromium",
  sulfur: "sulphur",
  sulphur: "sulphur",
  vitamina: "vitamin_a",
  vitamin_a: "vitamin_a",
  vitamind: "vitamin_d",
  vitamin_d: "vitamin_d",
  vitamine: "vitamin_e",
  vitamin_e: "vitamin_e",
  vitamink: "vitamin_k",
  vitamin_k: "vitamin_k",
  biotin: "biotin",
  threonine: "threonine",
  leucine: "leucine",
  isoleucine: "isoleucine",
  valine: "valine",
  tryptophan: "tryptophan",
  bcaa: "bcaa",
  omega3: "omega_3",
  omega_3: "omega_3",
  omega6: "omega_6",
  omega_6: "omega_6",
  ash: "ash",
  moisture: "moisture",
  drymatter: "dry_matter",
  dry_matter: "dry_matter",
  dm: "dry_matter"
};

export function canonicalNutrientKey(input: string): string {
  const compact = input.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return SYNONYMS[compact] ?? input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function createNutrientValue(options: {
  key: string;
  value: number;
  unit: NutrientUnit;
  basis?: NutrientBasis;
  per?: NutrientValue["per"];
  confidence?: ConfidenceLevel;
  sourceText?: string;
}): NutrientValue {
  const key = canonicalNutrientKey(options.key);
  return {
    key,
    label: CORE_NUTRIENTS[key as CoreNutrientKey] ?? humaniseNutrientKey(key),
    value: options.value,
    unit: options.unit,
    basis: options.basis ?? "as_fed",
    per: options.per ?? inferPer(options.unit),
    sourceText: options.sourceText,
    confidence: options.confidence ?? "medium"
  };
}

export function normaliseNutrientMap(input: Record<string, number | NutrientValue>): NutrientMap {
  const result: NutrientMap = {};
  for (const [rawKey, rawValue] of Object.entries(input)) {
    const value =
      typeof rawValue === "number"
        ? createNutrientValue({ key: rawKey, value: rawValue, unit: inferUnit(rawKey) })
        : createNutrientValue({ ...rawValue, key: rawValue.key || rawKey });
    result[value.key] = value;
  }
  return result;
}

export function amountPerKg(nutrient: NutrientValue): number | undefined {
  if (nutrient.unit === "percent") return nutrient.value * 10;
  if (nutrient.unit === "g_per_kg") return nutrient.value;
  if (nutrient.unit === "mg_per_kg") return nutrient.value / 1000;
  if (nutrient.unit === "mcg_per_kg") return nutrient.value / 1_000_000;
  if (nutrient.unit === "iu_per_kg") return nutrient.value;
  if (nutrient.unit === "mj_per_kg") return nutrient.value;
  if (nutrient.unit === "mcal_per_kg") return nutrient.value * 4.184;
  if (nutrient.unit === "g" || nutrient.unit === "mg" || nutrient.unit === "iu" || nutrient.unit === "mcg") return nutrient.value;
  return undefined;
}

export function nutrientContribution(nutrient: NutrientValue, fedKgPerDay: number): number | undefined {
  const perKg = amountPerKg(nutrient);
  if (perKg === undefined) return undefined;
  if (nutrient.unit === "percent" || nutrient.unit === "g_per_kg") return perKg * fedKgPerDay;
  if (nutrient.unit === "mg_per_kg") return nutrient.value * fedKgPerDay;
  if (nutrient.unit === "mcg_per_kg") return nutrient.value * fedKgPerDay;
  if (nutrient.unit === "iu_per_kg") return nutrient.value * fedKgPerDay;
  if (nutrient.unit === "mj_per_kg" || nutrient.unit === "mcal_per_kg") return perKg * fedKgPerDay;
  return nutrient.value * fedKgPerDay;
}

export function convertFeedAmountToKg(amount: number, unit: "kg" | "g" | "lb" | "scoop" | "serving"): number {
  if (unit === "kg") return amount;
  if (unit === "g") return amount / 1000;
  if (unit === "lb") return amount * 0.45359237;
  return amount;
}

function inferUnit(rawKey: string): NutrientUnit {
  const key = canonicalNutrientKey(rawKey);
  if (key.includes("energy")) return "mj_per_kg";
  if (key.startsWith("vitamin_")) return "iu_per_kg";
  if (["copper", "zinc", "manganese", "iron", "selenium", "iodine", "cobalt", "chromium", "biotin"].includes(key)) return "mg_per_kg";
  return "percent";
}

function inferPer(unit: NutrientUnit): NutrientValue["per"] {
  if (unit.endsWith("_per_kg") || unit === "percent") return "kg";
  return undefined;
}

function humaniseNutrientKey(key: string): string {
  return key
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

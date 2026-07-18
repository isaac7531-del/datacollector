import type { NutrientBasis, NutrientUnit } from "../domain/types";
import { canonicalNutrientKey, createNutrientValue } from "./nutrients";
import type { ExtractedNutrientFact } from "../operations/types";

const DECLARATION_WORDS = /\((min|max|minimum|maximum|added)\)|\b(min\.?|max\.?|minimum|maximum|added)\b/gi;

export function parseNutrientDeclaration(label: string, rawValue: string, sourceUrl: string, sourceText: string): ExtractedNutrientFact | undefined {
  const normalizedLabel = label.replace(DECLARATION_WORDS, "").trim();
  const declarationType = /max|maximum/i.test(label) ? "maximum" : /min|minimum|added/i.test(label) ? "minimum" : "declared_analysis";
  const match = rawValue.replace(/,/g, "").match(/(-?\d+(?:\.\d+)?)\s*([a-zA-Z%./µμ]+)?/);
  if (!match) return undefined;
  const numeric = Number(match[1]);
  const originalUnit = (match[2] ?? inferUnitFromLabel(label)).replace("µ", "u").replace("μ", "u");
  const normalized = normalizeUnit(numeric, originalUnit, label);
  const key = canonicalNutrientKey(normalizedLabel);
  return {
    canonicalKey: key,
    originalLabel: label.trim(),
    originalValue: rawValue.trim(),
    originalUnit,
    declaredBasis: "as_fed",
    normalizedValue: normalized.value,
    normalizedUnit: normalized.unit,
    conversionMethod: normalized.method,
    declarationType,
    sourceUrl,
    sourceText,
    confidence: "medium"
  };
}

export function nutrientFactToValue(fact: ExtractedNutrientFact) {
  return createNutrientValue({
    key: fact.canonicalKey,
    value: fact.normalizedValue,
    unit: fact.normalizedUnit,
    basis: fact.declaredBasis,
    confidence: fact.confidence,
    sourceText: fact.sourceText
  });
}

export function normalizeUnit(value: number, unit: string, label = ""): { value: number; unit: NutrientUnit; basis: NutrientBasis; method: string } {
  const clean = unit.toLowerCase().replace(/\.$/, "").replace("i.u", "iu");
  if (clean === "%" || clean === "percent") return { value, unit: "percent", basis: "as_fed", method: "declared_percent_as_fed" };
  if (clean === "ppm") return { value, unit: "mg_per_kg", basis: "as_fed", method: "ppm_to_mg_per_kg" };
  if (clean === "g/kg" || clean === "gkg") return { value, unit: "g_per_kg", basis: "as_fed", method: "declared_g_per_kg" };
  if (clean === "mg/kg" || clean === "mgkg") return { value, unit: "mg_per_kg", basis: "as_fed", method: "declared_mg_per_kg" };
  if (clean === "mcg/kg" || clean === "ug/kg" || clean === "mcgkg" || clean === "ugkg") return { value, unit: "mcg_per_kg", basis: "as_fed", method: "declared_mcg_per_kg" };
  if (clean === "iu/kg" || clean === "iukg") return { value, unit: "iu_per_kg", basis: "as_fed", method: "declared_iu_per_kg" };
  if (clean === "iu/lb" || clean === "iu/lb.") return { value: round(value * 2.2046226218, 3), unit: "iu_per_kg", basis: "as_fed", method: "iu_per_lb_to_iu_per_kg" };
  if (clean === "mg/lb" || clean === "mg/lb.") return { value: round(value * 2.2046226218, 3), unit: "mg_per_kg", basis: "as_fed", method: "mg_per_lb_to_mg_per_kg" };
  if (clean === "mj/kg" || clean === "mj/kgde" || clean === "mj") return { value, unit: "mj_per_kg", basis: "as_fed", method: "declared_mj_per_kg" };
  if (clean === "mcal/lb") return { value: round(value * 9.224141, 3), unit: "mj_per_kg", basis: "as_fed", method: "mcal_per_lb_to_mj_per_kg" };
  if (clean === "g" && /(per kilo|per kg|\/kg|kg)/i.test(label)) return { value, unit: "g_per_kg", basis: "as_fed", method: "g_per_kg_from_context" };
  if (clean === "mg" && /(per kilo|per kg|\/kg|kg)/i.test(label)) return { value, unit: "mg_per_kg", basis: "as_fed", method: "mg_per_kg_from_context" };
  if (clean === "iu" && /(per kilo|per kg|\/kg|kg)/i.test(label)) return { value, unit: "iu_per_kg", basis: "as_fed", method: "iu_per_kg_from_context" };
  return { value, unit: inferCanonicalUnit(label), basis: "as_fed", method: "unit_inferred_from_label" };
}

function inferUnitFromLabel(label: string): string {
  if (/energy|DE|ME/i.test(label)) return "MJ/kg";
  if (/vitamin/i.test(label)) return "iu/kg";
  if (/copper|zinc|manganese|iron|selenium|iodine|cobalt|biotin/i.test(label)) return "mg/kg";
  return "%";
}

function inferCanonicalUnit(label: string): NutrientUnit {
  if (/energy|DE|ME/i.test(label)) return "mj_per_kg";
  if (/vitamin/i.test(label)) return "iu_per_kg";
  if (/copper|zinc|manganese|iron|selenium|iodine|cobalt|biotin/i.test(label)) return "mg_per_kg";
  return "percent";
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

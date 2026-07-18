export type SupportedSourceLanguage = "en" | "fr" | "it" | "de";

export interface MultilingualMapping {
  sourceLanguage: SupportedSourceLanguage;
  originalLabel: string;
  canonicalValue: string;
  mappingConfidence: number;
  mappingVersion: string;
}

export const resultStatusMappings: MultilingualMapping[] = [
  map("en", "eliminated", "eliminated"),
  map("en", "withdrawn", "withdrawn"),
  map("en", "retired", "retired"),
  map("en", "non-starter", "no_show"),
  map("fr", "éliminé", "eliminated"),
  map("fr", "abandon", "retired"),
  map("fr", "non-partant", "no_show"),
  map("fr", "forfait", "withdrawn"),
  map("fr", "classement", "placed", 0.8),
  map("fr", "provisoire", "provisional"),
  map("fr", "définitif", "final"),
  map("it", "eliminato", "eliminated"),
  map("it", "ritirato", "retired"),
  map("it", "non partito", "no_show"),
  map("it", "provvisorio", "provisional"),
  map("it", "definitivo", "final"),
  map("de", "ausgeschieden", "eliminated"),
  map("de", "zurückgezogen", "withdrawn")
];

export const phaseMappings: MultilingualMapping[] = [
  map("en", "dressage", "dressage"),
  map("en", "cross-country", "cross_country"),
  map("en", "showjumping", "showjumping"),
  map("fr", "concours complet", "eventing"),
  map("fr", "dressage", "dressage"),
  map("fr", "cross", "cross_country"),
  map("fr", "saut d'obstacles", "showjumping"),
  map("it", "concorso completo", "eventing"),
  map("it", "dressage", "dressage"),
  map("it", "penalità", "penalties"),
  map("it", "tempo", "time"),
  map("it", "classifica", "placing"),
  map("de", "gelände", "cross_country")
];

export function mapSourceLabel(label: string, language?: SupportedSourceLanguage): MultilingualMapping | undefined {
  const normalized = normalize(label);
  return [...resultStatusMappings, ...phaseMappings].find((mapping) => {
    if (language && mapping.sourceLanguage !== language) return false;
    return normalize(mapping.originalLabel) === normalized;
  });
}

function map(sourceLanguage: SupportedSourceLanguage, originalLabel: string, canonicalValue: string, mappingConfidence = 1): MultilingualMapping {
  return { sourceLanguage, originalLabel, canonicalValue, mappingConfidence, mappingVersion: "2026-07-18" };
}

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

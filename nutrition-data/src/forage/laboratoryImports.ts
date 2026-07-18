import type { ConfidenceLevel, NutrientMap } from "../domain/types";
import { normaliseNutrientMap } from "../normalisation/nutrients";
import { canonicalNutrientKey } from "../normalisation/nutrients";
import { parseNutrientDeclaration, nutrientFactToValue } from "../normalisation/unitNormalisation";
import type { ForageAnalysis } from "./forageAnalysis";

export type ForageLaboratoryId = "equi-analytical" | "dairy-one" | "cvas" | "eurofins" | "local";

export interface ForageLaboratoryProfile {
  id: ForageLaboratoryId;
  name: string;
  countries: string[];
  website?: string;
  supportedImports: Array<"csv" | "tsv" | "text" | "pdf_text" | "manual">;
  notes: string;
}

export interface ForageLaboratoryImportOptions {
  laboratory: ForageLaboratoryId;
  text: string;
  forageType?: ForageAnalysis["forageType"];
  sampleDate?: string;
  documentUrl?: string;
  analysisMethod?: string;
  dryMatterPercent?: number;
  confidence?: ConfidenceLevel;
}

export const forageLaboratories: ForageLaboratoryProfile[] = [
  {
    id: "equi-analytical",
    name: "Equi-Analytical",
    countries: ["US", "CA", "international"],
    website: "https://www.equi-analytical.com",
    supportedImports: ["csv", "text", "pdf_text", "manual"],
    notes: "Dairy One equine forage analysis reports; user-uploaded reports should be parsed from exported text or CSV."
  },
  {
    id: "dairy-one",
    name: "Dairy One",
    countries: ["US", "CA", "international"],
    website: "https://dairyone.com",
    supportedImports: ["csv", "text", "pdf_text", "manual"],
    notes: "Forage laboratory reports can be imported when the user provides authorised report exports."
  },
  {
    id: "cvas",
    name: "Cumberland Valley Analytical Services",
    countries: ["US", "international"],
    website: "https://www.foragelab.com",
    supportedImports: ["csv", "text", "pdf_text", "manual"],
    notes: "Supports common hay/haylage/feed analysis terms; no private account access is attempted."
  },
  {
    id: "eurofins",
    name: "Eurofins",
    countries: ["GB", "IE", "DE", "FR", "IT", "EU"],
    website: "https://www.eurofins.com",
    supportedImports: ["csv", "text", "pdf_text", "manual"],
    notes: "Local Eurofins report formats vary by country; use mapping profiles for local aliases."
  },
  {
    id: "local",
    name: "Local forage laboratory",
    countries: ["global"],
    supportedImports: ["csv", "tsv", "text", "manual"],
    notes: "Generic import profile for local laboratories and advisor-entered analyses."
  }
];

const FORAGE_ALIASES: Record<string, string> = {
  dm: "dry_matter",
  "dry matter": "dry_matter",
  moisture: "moisture",
  cp: "crude_protein",
  "crude protein": "crude_protein",
  protein: "crude_protein",
  adf: "adf",
  ndf: "ndf",
  wsc: "water_soluble_carbohydrates",
  esc: "ethanol_soluble_carbohydrates",
  nsc: "non_structural_carbohydrates",
  starch: "starch",
  sugar: "sugar",
  calcium: "calcium",
  ca: "calcium",
  phosphorus: "phosphorus",
  p: "phosphorus",
  magnesium: "magnesium",
  potassium: "potassium",
  sodium: "sodium",
  iron: "iron",
  zinc: "zinc",
  copper: "copper",
  manganese: "manganese",
  selenium: "selenium",
  "digestible energy": "digestible_energy",
  de: "digestible_energy"
};

export function parseForageLaboratoryImport(options: ForageLaboratoryImportOptions): ForageAnalysis {
  const lab = forageLaboratories.find((candidate) => candidate.id === options.laboratory) ?? forageLaboratories[4];
  const nutrients = parseLabNutrients(options.text, options.documentUrl ?? lab.website ?? `lab:${lab.id}`);
  const dryMatter = options.dryMatterPercent ?? nutrients.dry_matter?.value;
  return {
    id: `${options.laboratory}:${options.sampleDate ?? "unsampled"}:${hashText(options.text)}`,
    forageType: options.forageType ?? inferForageType(options.text),
    source: "laboratory_test",
    sampleDate: options.sampleDate,
    laboratory: lab.name,
    analysisMethod: options.analysisMethod,
    documentUrl: options.documentUrl,
    dryMatterPercent: dryMatter,
    nutrients,
    confidence: options.confidence ?? "high",
    notes: `Imported from ${lab.name}. Laboratory values override generic forage estimates for this ration.`
  };
}

export function parseLabNutrients(text: string, sourceUrl: string): NutrientMap {
  const rows = parseDelimitedRows(text);
  const nutrients: NutrientMap = {};
  if (rows.length) {
    for (const row of rows) {
      const label = row.nutrient ?? row.name ?? row.analysis ?? row.parameter;
      const value = row.value ?? row.result ?? row.amount;
      const unit = row.unit ?? row.units ?? "%";
      if (!label || !value) continue;
      const fact = parseNutrientDeclaration(resolveForageAlias(label), `${value} ${unit}`, sourceUrl, `${label} ${value} ${unit}`);
      if (fact) nutrients[fact.canonicalKey] = nutrientFactToValue(fact);
    }
    return nutrients;
  }

  for (const line of text.split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Za-z][A-Za-z0-9 ./%()_-]{1,60})\s+(-?\d+(?:\.\d+)?)\s*(%|ppm|g\/kg|mg\/kg|MJ\/kg|Mcal\/lb)?$/i);
    if (!match) continue;
    const fact = parseNutrientDeclaration(resolveForageAlias(match[1]), `${match[2]} ${match[3] ?? "%"}`, sourceUrl, line.trim());
    if (fact) nutrients[fact.canonicalKey] = nutrientFactToValue(fact);
  }
  return Object.keys(nutrients).length ? nutrients : normaliseNutrientMap({});
}

function parseDelimitedRows(text: string): Array<Record<string, string>> {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const delimiter = lines[0].includes("\t") ? "\t" : lines[0].includes(",") ? "," : undefined;
  if (!delimiter) return [];
  const headers = splitDelimited(lines[0], delimiter).map((header) => header.trim().toLowerCase());
  return lines.slice(1).map((line) => Object.fromEntries(splitDelimited(line, delimiter).map((value, index) => [headers[index], value.trim()])));
}

function splitDelimited(line: string, delimiter: string): string[] {
  return line.split(delimiter).map((value) => value.replace(/^"|"$/g, ""));
}

function resolveForageAlias(label: string): string {
  const clean = label.toLowerCase().replace(/\bas fed\b|\bdm basis\b|\bdry matter basis\b/g, "").replace(/[^a-z0-9 ]+/g, " ").trim();
  return FORAGE_ALIASES[clean] ?? canonicalNutrientKey(clean);
}

function inferForageType(text: string): ForageAnalysis["forageType"] {
  if (/haylage/i.test(text)) return "haylage";
  if (/alfalfa|lucerne/i.test(text)) return "alfalfa";
  if (/pasture/i.test(text)) return "pasture";
  if (/beet/i.test(text)) return "beet_pulp";
  if (/straw/i.test(text)) return "straw";
  return "hay";
}

function hashText(text: string): string {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) hash = (hash * 31 + text.charCodeAt(index)) | 0;
  return Math.abs(hash).toString(36);
}

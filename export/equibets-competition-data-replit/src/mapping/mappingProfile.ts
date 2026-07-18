import { readFile } from "fs/promises";
import { extname } from "path";
import { z } from "zod";
import { parseCsvRows } from "../connectors/csvResultsConnector";
import { parseExcelRows } from "../connectors/excelResultsConnector";
import type { TableColumnMapping, TableRow } from "../normalisation/sourceNeutral";
import { normalizeTableRows, validateMappedRow } from "../normalisation/sourceNeutral";
import type { DataSource } from "../domain/types";

export const mappingProfileSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive().default(1),
  name: z.string().min(1),
  enabled: z.boolean().default(false),
  fileFormat: z.enum(["csv", "excel", "json", "xml"]),
  sheetName: z.string().optional(),
  sheetIndex: z.number().int().positive().optional(),
  headerRow: z.number().int().positive().default(1),
  delimiter: z.string().min(1).default(","),
  dateFormat: z.string().default("YYYY-MM-DD"),
  decimalFormat: z.enum(["dot", "comma"]).default("dot"),
  statusMappings: z.record(z.string(), z.string()).default({}),
  classMappings: z.record(z.string(), z.string()).default({}),
  mapping: z.record(z.string(), z.string())
});

export type MappingProfile = z.infer<typeof mappingProfileSchema>;

export interface MappingInspection {
  fileFormat: MappingProfile["fileFormat"];
  sheets: string[];
  likelyHeaderRows: number[];
  columns: string[];
  suggestedMapping: TableColumnMapping;
}

export async function inspectMappingFile(path: string): Promise<MappingInspection> {
  const fileFormat = detectFileFormat(path);
  if (fileFormat === "csv") {
    const rows = parseCsvRows(await readFile(path, "utf8"));
    const columns = Object.keys(rows[0]?.values ?? {});
    return { fileFormat, sheets: [], likelyHeaderRows: [1], columns, suggestedMapping: suggestMapping(columns) };
  }

  if (fileFormat === "excel") {
    const rows = await parseExcelRows(await readFile(path), {
      enabled: true,
      source: inspectionSource,
      mapping: {},
      headerRow: 1
    });
    const columns = Object.keys(rows[0]?.values ?? {});
    return { fileFormat, sheets: ["1"], likelyHeaderRows: [1], columns, suggestedMapping: suggestMapping(columns) };
  }

  return { fileFormat, sheets: [], likelyHeaderRows: [1], columns: [], suggestedMapping: {} };
}

export async function previewWithMapping(path: string, profile: MappingProfile, limit = 10) {
  const parsed = mappingProfileSchema.parse(profile);
  const rows = await readRowsForProfile(path, parsed);
  const source: DataSource = {
    id: parsed.id,
    name: parsed.name,
    kind: "other_public",
    mode: "human_assisted",
    official: false
  };
  const graphs = normalizeTableRows(rows.slice(0, limit), {
    source,
    connectorId: parsed.id,
    sourceSystem: parsed.id,
    mapping: parsed.mapping,
    decimalFormat: parsed.decimalFormat
  });
  return {
    rows: rows.slice(0, limit),
    issues: rows.flatMap((row) => validateMappedRow(row, parsed.mapping)),
    graphs
  };
}

export async function testMappingProfile(path: string, profile: MappingProfile) {
  const preview = await previewWithMapping(path, profile, Number.MAX_SAFE_INTEGER);
  return {
    valid: !preview.issues.some((issue) => issue.severity === "error"),
    rows: preview.rows.length,
    issues: preview.issues
  };
}

export function detectFileFormat(path: string): MappingProfile["fileFormat"] {
  const extension = extname(path).toLocaleLowerCase("en");
  if (extension === ".xlsx") return "excel";
  if (extension === ".json") return "json";
  if (extension === ".xml") return "xml";
  return "csv";
}

export function suggestMapping(columns: string[]): TableColumnMapping {
  const mapping: TableColumnMapping = {};
  for (const column of columns) {
    const normalized = column.toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (normalized.includes("event") && normalized.includes("name")) mapping.competitionName = column;
    else if (normalized.includes("class")) mapping.className = column;
    else if (normalized.includes("horse") && normalized.includes("name")) mapping.horseName = column;
    else if ((normalized.includes("rider") || normalized.includes("athlete")) && normalized.includes("name")) mapping.riderName = column;
    else if (normalized.includes("rider") && (normalized.includes("member") || normalized.includes("id"))) mapping.riderId = column;
    else if (normalized.includes("final") && normalized.includes("score")) mapping.finalScore = column;
    else if (normalized.includes("place")) mapping.finalPlacing = column;
    else if (normalized.includes("status")) mapping.resultStatus = column;
    else if (normalized.includes("start") && normalized.includes("number")) mapping.startNumber = column;
  }
  return mapping;
}

async function readRowsForProfile(path: string, profile: MappingProfile): Promise<TableRow[]> {
  if (profile.fileFormat === "csv") {
    return parseCsvRows(await readFile(path, "utf8"), { delimiter: profile.delimiter });
  }
  if (profile.fileFormat === "excel") {
    return parseExcelRows(await readFile(path), {
      enabled: true,
      source: inspectionSource,
      mapping: profile.mapping,
      sheetName: profile.sheetName,
      sheetIndex: profile.sheetIndex,
      headerRow: profile.headerRow
    });
  }
  throw new Error(`Mapping preview for ${profile.fileFormat} is not table-based.`);
}

const inspectionSource: DataSource = {
  id: "mapping-inspection",
  name: "Mapping inspection",
  kind: "other_public",
  mode: "human_assisted",
  official: false
};

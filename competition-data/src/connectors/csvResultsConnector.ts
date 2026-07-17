import { createHash } from "crypto";
import { readFile } from "fs/promises";
import type { DataSource, DiscoveryItem, RawCompetitionPayload } from "../domain/types";
import type { TableColumnMapping, TableRow } from "../normalisation/sourceNeutral";
import { normalizeTableRows, validateMappedRow } from "../normalisation/sourceNeutral";
import type { CollectionContext, CompetitionDataConnector, ConnectorDescriptor, DiscoveryContext } from "./types";
import { DisabledConnectorError } from "./types";

export interface CsvResultsConnectorOptions {
  id?: string;
  name?: string;
  enabled: boolean;
  source: DataSource;
  mapping: TableColumnMapping;
  csvText?: string;
  filePath?: string;
  delimiter?: string;
  encoding?: BufferEncoding;
  decimalFormat?: "dot" | "comma";
  headerAliases?: Record<string, string[]>;
  eventMetadata?: Parameters<typeof normalizeTableRows>[1]["eventMetadata"];
}

export interface CsvPreviewResult {
  rows: TableRow[];
  issues: ReturnType<typeof validateMappedRow>;
}

export function createCsvResultsConnector(options: CsvResultsConnectorOptions): CompetitionDataConnector {
  const connectorId = options.id ?? "generic-csv";
  const descriptor: ConnectorDescriptor = {
    id: connectorId,
    name: options.name ?? "Generic CSV results connector",
    status: options.enabled ? "enabled" : "disabled",
    source: options.source,
    sourceOrganisation: options.source.name,
    countryCode: options.source.countryCode,
    supportedRecordTypes: ["event", "class", "entry", "result", "phase_result", "horse", "rider"],
    sourceAuthority: options.source.official ? "official" : "public",
    collectionMethod: options.filePath ? "file" : "upload",
    supportsBackfill: false,
    resultsMayBeProvisional: true,
    requiresHumanReview: !options.source.official,
    capabilities: ["discover", "fetchResults", "preview", "stage"],
    complianceNote: "Imports user-uploaded or configured public CSV result files through staging and validation."
  };

  return {
    descriptor,
    async discover(_context: DiscoveryContext): Promise<DiscoveryItem[]> {
      if (descriptor.status === "disabled") throw new DisabledConnectorError(connectorId);
      return [
        {
          id: options.filePath ?? "uploaded-csv",
          connectorId,
          source: options.source,
          label: options.name ?? "CSV results import"
        }
      ];
    },
    async collect(item: DiscoveryItem, _context: CollectionContext): Promise<RawCompetitionPayload[]> {
      if (descriptor.status === "disabled") throw new DisabledConnectorError(connectorId);
      const csvText = await readCsvText(options);
      const rows = parseCsvRows(csvText, {
        delimiter: options.delimiter,
        headerAliases: options.headerAliases
      });
      const graphs = normalizeTableRows(rows, {
        source: options.source,
        connectorId,
        sourceSystem: options.source.id,
        mapping: options.mapping,
        decimalFormat: options.decimalFormat,
        eventMetadata: options.eventMetadata
      });

      return [
        {
          connectorId,
          source: options.source,
          fetchedAt: new Date().toISOString(),
          data: graphs,
          contentType: "application/vnd.equibets.normalized-graph+json",
          sourceUrl: options.source.sourceUrl,
          rawRecordId: item.id,
          checksum: createHash("sha256").update(csvText).digest("hex")
        }
      ];
    }
  };
}

export async function previewCsvResults(options: CsvResultsConnectorOptions): Promise<CsvPreviewResult> {
  const csvText = await readCsvText(options);
  const rows = parseCsvRows(csvText, {
    delimiter: options.delimiter,
    headerAliases: options.headerAliases
  });
  return {
    rows,
    issues: rows.flatMap((row) => validateMappedRow(row, options.mapping))
  };
}

export function parseCsvRows(
  text: string,
  options: { delimiter?: string; headerAliases?: Record<string, string[]> } = {}
): TableRow[] {
  const delimiter = options.delimiter ?? ",";
  const records = parseDelimited(text, delimiter).filter((row) => row.some((cell) => cell.trim()));
  const headers = records[0]?.map((header) => canonicalHeader(header, options.headerAliases)) ?? [];

  return records.slice(1).map((record, index) => {
    const values: Record<string, string> = {};
    const unmapped: Record<string, string> = {};
    headers.forEach((header, headerIndex) => {
      const cell = record[headerIndex]?.trim() ?? "";
      values[header] = cell;
      unmapped[header] = cell;
    });
    return {
      rowNumber: index + 2,
      values,
      unmapped
    };
  });
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function canonicalHeader(header: string, aliases: Record<string, string[]> | undefined): string {
  const normalized = header.trim();
  for (const [canonical, candidates] of Object.entries(aliases ?? {})) {
    if ([canonical, ...candidates].some((candidate) => candidate.toLocaleLowerCase("en") === normalized.toLocaleLowerCase("en"))) {
      return canonical;
    }
  }
  return normalized;
}

async function readCsvText(options: CsvResultsConnectorOptions): Promise<string> {
  if (options.csvText !== undefined) {
    return options.csvText;
  }

  if (!options.filePath) {
    throw new Error("CSV connector requires csvText or filePath.");
  }

  return readFile(options.filePath, { encoding: options.encoding ?? "utf8" });
}
